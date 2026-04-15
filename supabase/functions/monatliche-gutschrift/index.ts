import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONATE = [
  "", "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Check if this is a manual trigger (from admin UI) vs cron
    let forceRecreate = false;
    try {
      const body = await req.json();
      if (body?.force) forceRecreate = true;
    } catch { /* no body = cron trigger */ }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const monat = now.getMonth() + 1;
    const jahr = now.getFullYear();
    const periodeLabel = `${MONATE[monat]} ${jahr}`;

    const { data: reps, error: repsErr } = await supabase
      .from("sales_rep_profiles")
      .select("id, user_id, first_name, last_name, email, street, house_number, postal_code, city, tax_number, vat_id, is_small_business")
      .eq("is_active", true);

    if (repsErr) throw repsErr;
    if (!reps || reps.length === 0) {
      return new Response(JSON.stringify({ message: "Keine aktiven Vertriebler" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If force recreate, delete all existing gutschriften for this month first
    if (forceRecreate) {
      await supabase
        .from("vertriebler_gutschriften")
        .delete()
        .eq("periode_monat", monat)
        .eq("periode_jahr", jahr);
    }

    let counter = 1;

    const results: string[] = [];

    for (const rep of reps) {
      const { data: existing } = await supabase
        .from("vertriebler_gutschriften")
        .select("id")
        .eq("vertriebler_id", rep.id)
        .eq("periode_monat", monat)
        .eq("periode_jahr", jahr)
        .maybeSingle();

      if (existing) {
        results.push(`${rep.first_name} ${rep.last_name}: bereits vorhanden`);
        continue;
      }

      const { count: activeKunden } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("promoter_id", rep.user_id)
        .eq("active", true);

      const aktiveKundenSnapshot = activeKunden || 0;
      const folgeprovisionNetto = aktiveKundenSnapshot * 12;

      const { data: direktCommissions } = await supabase
        .from("commissions")
        .select("id, amount_cents, customer_name, created_at")
        .eq("promoter_id", rep.user_id)
        .eq("commission_type", "initial")
        .eq("status", "available");

      const direktDetails = (direktCommissions || []).map((c) => ({
        kunden_name: c.customer_name || "Unbekannt",
        betrag: (c.amount_cents / 100).toFixed(2),
        datum: c.created_at ? new Date(c.created_at).toLocaleDateString("de-DE") : "",
        commission_id: c.id,
      }));
      const direktprovisionNetto = (direktCommissions || []).reduce(
        (sum, c) => sum + c.amount_cents / 100, 0
      );

      const sponsorBonusNetto = 0;
      const sponsorBonusDetails: unknown[] = [];

      const gesamtNetto = folgeprovisionNetto + direktprovisionNetto + sponsorBonusNetto;
      const ustPflichtig = !rep.is_small_business && !!rep.vat_id;
      const ustBetrag = ustPflichtig ? Math.round(gesamtNetto * 19) / 100 : 0;
      const gesamtBrutto = gesamtNetto + ustBetrag;

      if (gesamtNetto === 0) {
        results.push(`${rep.first_name} ${rep.last_name}: 0€ — übersprungen`);
        continue;
      }

      const gsNummer = `GS-${jahr}-${String(monat).padStart(2, "0")}-${String(counter).padStart(3, "0")}`;
      counter++;

      // Generate PDF with jsPDF
      const pdfBytes = generatePdf({
        gsNummer,
        periodeLabel,
        rep,
        aktiveKundenSnapshot,
        folgeprovisionNetto,
        direktDetails,
        direktprovisionNetto,
        sponsorBonusNetto,
        gesamtNetto,
        ustPflichtig,
        ustBetrag,
        gesamtBrutto,
        erstelldatum: now.toLocaleDateString("de-DE"),
      });

      const pdfPath = `${rep.id}/${gsNummer}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("gutschriften")
        .upload(pdfPath, pdfBytes, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadErr) {
        console.error(`Upload error for ${rep.email}:`, uploadErr);
      }

      // Store the path for later signed URL generation (not a direct URL)
      const pdfStoragePath = pdfPath;

      const { error: insertErr } = await supabase
        .from("vertriebler_gutschriften")
        .insert({
          vertriebler_id: rep.id,
          gutschrift_nummer: gsNummer,
          periode: periodeLabel,
          periode_monat: monat,
          periode_jahr: jahr,
          aktive_kunden_snapshot: aktiveKundenSnapshot,
          folgeprovision_netto: folgeprovisionNetto,
          direktprovision_netto: direktprovisionNetto,
          direktprovision_details: direktDetails,
          sponsor_bonus_netto: sponsorBonusNetto,
          sponsor_bonus_details: sponsorBonusDetails,
          gesamt_netto: gesamtNetto,
          ust_pflichtig: ustPflichtig,
          ust_id: rep.vat_id || null,
          ust_betrag: ustBetrag,
          gesamt_brutto: gesamtBrutto,
          pdf_url: pdfStoragePath,
        });

      if (insertErr) {
        console.error(`Insert error for ${rep.email}:`, insertErr);
        results.push(`${rep.first_name} ${rep.last_name}: FEHLER — ${insertErr.message}`);
        continue;
      }

      // Send email notification
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey && rep.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "ELOYO <noreply@eloyo.de>",
              to: [rep.email],
              subject: `Deine Gutschrift für ${periodeLabel} steht bereit`,
              html: `
                <p>Hallo ${rep.first_name},</p>
                <p>deine Gutschrift <strong>${gsNummer}</strong> für den Monat <strong>${periodeLabel}</strong> wurde erstellt.</p>
                <p><strong>Gesamtbetrag: ${gesamtBrutto.toFixed(2)} €</strong></p>
                <p>Du findest die Gutschrift in deinem Dashboard unter „Meine Abrechnungen".</p>
                <br>
                <p>Viele Grüße,<br>Dein ELOYO Team</p>
              `,
            }),
          });
        }
      } catch (emailErr) {
        console.error(`Email error for ${rep.email}:`, emailErr);
      }

      // In-app notification
      await supabase.from("sales_rep_notifications").insert({
        user_id: rep.user_id,
        notification_type: "gutschrift",
        title: `Gutschrift ${periodeLabel}`,
        body: `Deine Gutschrift ${gsNummer} über ${gesamtBrutto.toFixed(2)} € wurde erstellt.`,
        metadata: { gutschrift_nummer: gsNummer, betrag: gesamtBrutto },
      });

      results.push(`${rep.first_name} ${rep.last_name}: ${gsNummer} — ${gesamtBrutto.toFixed(2)} €`);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("monatliche-gutschrift error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface PdfData {
  gsNummer: string;
  periodeLabel: string;
  rep: {
    first_name: string;
    last_name: string;
    street: string;
    house_number: string;
    postal_code: string;
    city: string;
    tax_number: string;
    vat_id: string;
  };
  aktiveKundenSnapshot: number;
  folgeprovisionNetto: number;
  direktDetails: { kunden_name: string; betrag: string; datum: string }[];
  direktprovisionNetto: number;
  sponsorBonusNetto: number;
  gesamtNetto: number;
  ustPflichtig: boolean;
  ustBetrag: number;
  gesamtBrutto: number;
  erstelldatum: string;
}

function generatePdf(d: PdfData): Uint8Array {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 33, 168); // Purple
  doc.text("GUTSCHRIFT", 20, 28);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(d.gsNummer, 150, 20);
  doc.text(d.periodeLabel, 150, 26);
  doc.text(`Erstellt am: ${d.erstelldatum}`, 150, 32);

  // Separator
  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.5);
  doc.line(20, 38, 190, 38);

  // Addresses
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("VON", 20, 48);
  doc.text("AN", 120, 48);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`${d.rep.first_name} ${d.rep.last_name}`, 20, 55);
  doc.setFont("helvetica", "normal");

  let leftY = 61;
  if (d.rep.street && d.rep.house_number) {
    doc.text(`${d.rep.street} ${d.rep.house_number}`, 20, leftY);
    leftY += 5;
  }
  if (d.rep.postal_code && d.rep.city) {
    doc.text(`${d.rep.postal_code} ${d.rep.city}`, 20, leftY);
    leftY += 5;
  }
  if (d.rep.tax_number) {
    doc.text(`Steuernummer: ${d.rep.tax_number}`, 20, leftY);
    leftY += 5;
  }
  if (d.rep.vat_id) {
    doc.text(`USt-IdNr.: ${d.rep.vat_id}`, 20, leftY);
  }

  doc.setFont("helvetica", "bold");
  doc.text("ELOYO, Inhaber Eric Pfadisch", 120, 55);
  doc.setFont("helvetica", "normal");
  doc.text("Fuggerstr. 2, 86836 Untermeitingen", 120, 61);
  doc.text("USt-IdNr.: DE337756435", 120, 67);
  doc.text("support@eloyo.de", 120, 73);

  // Positions
  let y = 90;

  // Position header
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 250);
  doc.rect(20, y - 5, 170, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Beschreibung", 22, y);
  doc.text("Betrag", 185, y, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Position 1: Folgeprovision
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(107, 33, 168);
  doc.text("Position 1: Monatliche Folgeprovision", 22, y);
  doc.setTextColor(0);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${d.aktiveKundenSnapshot} aktive Kunden × 12,00 €`, 22, y);
  doc.text(`${d.folgeprovisionNetto.toFixed(2)} €`, 185, y, { align: "right" });
  y += 10;

  // Position 2: Direktprovisionen
  if (d.direktDetails.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(107, 33, 168);
    doc.text("Position 2: Einmalprovisionen", 22, y);
    doc.setTextColor(0);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    for (const dd of d.direktDetails) {
      doc.text(`– ${dd.kunden_name}`, 25, y);
      doc.text(`${dd.betrag} €`, 155, y, { align: "right" });
      doc.text(dd.datum, 185, y, { align: "right" });
      y += 6;
    }

    doc.setDrawColor(220);
    doc.line(22, y, 188, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Summe Einmalprovisionen", 22, y);
    doc.text(`${d.direktprovisionNetto.toFixed(2)} €`, 185, y, { align: "right" });
    y += 10;
  }

  // Position 3: Sponsor-Bonus
  if (d.sponsorBonusNetto > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(107, 33, 168);
    doc.text("Position 3: Sponsor-Bonus", 22, y);
    doc.setTextColor(0);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Sponsor-Bonus", 22, y);
    doc.text(`${d.sponsorBonusNetto.toFixed(2)} €`, 185, y, { align: "right" });
    y += 10;
  }

  // Totals
  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Gesamt netto:", 120, y);
  doc.text(`${d.gesamtNetto.toFixed(2)} €`, 185, y, { align: "right" });
  y += 8;

  if (d.ustPflichtig) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("zzgl. 19% Umsatzsteuer:", 120, y);
    doc.text(`${d.ustBetrag.toFixed(2)} €`, 185, y, { align: "right" });
    y += 8;

    doc.setDrawColor(50);
    doc.setLineWidth(0.3);
    doc.line(118, y - 2, 190, y - 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Gesamt brutto:", 120, y + 3);
    doc.text(`${d.gesamtBrutto.toFixed(2)} €`, 185, y + 3, { align: "right" });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.", 20, y);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("ELOYO — Gutschriftverfahren — Fuggerstr. 2, 86836 Untermeitingen", 105, 285, { align: "center" });

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
