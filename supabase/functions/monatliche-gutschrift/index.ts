import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const monat = now.getMonth() + 1;
    const jahr = now.getFullYear();
    const periodeLabel = `${MONATE[monat]} ${jahr}`;

    // Get all active sales reps
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

    // Get next gutschrift number
    const { data: lastGs } = await supabase
      .from("vertriebler_gutschriften")
      .select("gutschrift_nummer")
      .eq("periode_monat", monat)
      .eq("periode_jahr", jahr)
      .order("gutschrift_nummer", { ascending: false })
      .limit(1)
      .maybeSingle();

    let counter = 1;
    if (lastGs?.gutschrift_nummer) {
      const parts = lastGs.gutschrift_nummer.split("-");
      counter = parseInt(parts[parts.length - 1]) + 1;
    }

    const results: string[] = [];

    for (const rep of reps) {
      // Check if already exists for this period
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

      // 1. Count active customers (snapshot)
      const { count: activeKunden } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("promoter_id", rep.user_id)
        .eq("active", true);

      const aktiveKundenSnapshot = activeKunden || 0;
      const folgeprovisionNetto = aktiveKundenSnapshot * 12;

      // 2. Get released direct commissions (status = 'available', type = 'initial')
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

      // 3. Sponsor bonus (placeholder — no sponsor relationship yet)
      const sponsorBonusNetto = 0;
      const sponsorBonusDetails: unknown[] = [];

      // 4. Calculate totals
      const gesamtNetto = folgeprovisionNetto + direktprovisionNetto + sponsorBonusNetto;
      const ustPflichtig = !rep.is_small_business && !!rep.vat_id;
      const ustBetrag = ustPflichtig ? Math.round(gesamtNetto * 19) / 100 : 0;
      const gesamtBrutto = gesamtNetto + ustBetrag;

      // Skip if nothing to pay
      if (gesamtNetto === 0) {
        results.push(`${rep.first_name} ${rep.last_name}: 0€ — übersprungen`);
        continue;
      }

      // 5. Generate gutschrift number
      const gsNummer = `GS-${jahr}-${String(monat).padStart(2, "0")}-${String(counter).padStart(3, "0")}`;
      counter++;

      // 6. Generate PDF content
      const pdfHtml = generatePdfHtml({
        gsNummer,
        periodeLabel,
        rep,
        aktiveKundenSnapshot,
        folgeprovisionNetto,
        direktDetails,
        direktprovisionNetto,
        sponsorBonusNetto,
        sponsorBonusDetails,
        gesamtNetto,
        ustPflichtig,
        ustBetrag,
        gesamtBrutto,
        erstelldatum: now.toLocaleDateString("de-DE"),
      });

      // Store PDF as HTML (can be converted to PDF client-side or via print)
      const pdfPath = `${rep.id}/${gsNummer}.html`;
      const { error: uploadErr } = await supabase.storage
        .from("gutschriften")
        .upload(pdfPath, new Blob([pdfHtml], { type: "text/html" }), {
          contentType: "text/html",
          upsert: true,
        });

      if (uploadErr) {
        console.error(`Upload error for ${rep.email}:`, uploadErr);
      }

      const { data: urlData } = supabase.storage
        .from("gutschriften")
        .getPublicUrl(pdfPath);

      // Since bucket is private, use signed URL
      const { data: signedUrl } = await supabase.storage
        .from("gutschriften")
        .createSignedUrl(pdfPath, 60 * 60 * 24 * 365); // 1 year

      const pdfUrl = signedUrl?.signedUrl || urlData?.publicUrl || null;

      // 7. Insert gutschrift record
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
          pdf_url: pdfUrl,
        });

      if (insertErr) {
        console.error(`Insert error for ${rep.email}:`, insertErr);
        results.push(`${rep.first_name} ${rep.last_name}: FEHLER — ${insertErr.message}`);
        continue;
      }

      // 8. Send email notification
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey && rep.email) {
          const emailRes = await fetch("https://api.resend.com/emails", {
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
          console.log(`Email sent to ${rep.email}:`, emailRes.status);
        }
      } catch (emailErr) {
        console.error(`Email error for ${rep.email}:`, emailErr);
      }

      // 9. Create in-app notification
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
  sponsorBonusDetails: unknown[];
  gesamtNetto: number;
  ustPflichtig: boolean;
  ustBetrag: number;
  gesamtBrutto: number;
  erstelldatum: string;
}

function generatePdfHtml(d: PdfData): string {
  const repAddr = [
    `${d.rep.first_name} ${d.rep.last_name}`,
    d.rep.street && d.rep.house_number ? `${d.rep.street} ${d.rep.house_number}` : "",
    d.rep.postal_code && d.rep.city ? `${d.rep.postal_code} ${d.rep.city}` : "",
  ].filter(Boolean).join("<br>");

  const steuernummerLine = d.rep.tax_number ? `Steuernummer: ${d.rep.tax_number}` : "";
  const ustIdLine = d.rep.vat_id ? `USt-IdNr.: ${d.rep.vat_id}` : "";

  const direktRows = d.direktDetails.map(
    (dd) => `<tr><td style="padding:4px 8px;">– ${dd.kunden_name}</td><td style="padding:4px 8px;text-align:right;">${dd.betrag} €</td><td style="padding:4px 8px;text-align:right;">${dd.datum}</td></tr>`
  ).join("");

  const ustBlock = d.ustPflichtig
    ? `<tr><td style="padding:6px 8px;">zzgl. 19% Umsatzsteuer</td><td style="padding:6px 8px;text-align:right;"><strong>${d.ustBetrag.toFixed(2)} €</strong></td></tr>
       <tr style="border-top:2px solid #333;"><td style="padding:8px;font-size:16px;"><strong>Gesamt brutto</strong></td><td style="padding:8px;text-align:right;font-size:16px;"><strong>${d.gesamtBrutto.toFixed(2)} €</strong></td></tr>`
    : `<tr><td colspan="2" style="padding:8px;font-size:12px;color:#666;">Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Gutschrift ${d.gsNummer}</title>
<style>
  @media print { body { margin: 0; } }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; max-width: 800px; margin: 0 auto; padding: 40px; font-size: 14px; line-height: 1.6; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .header h1 { font-size: 28px; color: #6B21A8; margin: 0; }
  .header .meta { text-align: right; color: #666; }
  .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .address { width: 45%; }
  .address .label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .section { margin: 24px 0; }
  .section h3 { font-size: 14px; color: #6B21A8; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  .totals { margin-top: 24px; border-top: 2px solid #6B21A8; padding-top: 12px; }
  .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #E5E7EB; padding-top: 16px; }
</style></head>
<body>
  <div class="header">
    <div><h1>GUTSCHRIFT</h1></div>
    <div class="meta">${d.gsNummer}<br>${d.periodeLabel}</div>
  </div>

  <div class="addresses">
    <div class="address">
      <div class="label">Von</div>
      ${repAddr}<br>
      ${steuernummerLine ? steuernummerLine + "<br>" : ""}
      ${ustIdLine ? ustIdLine + "<br>" : ""}
    </div>
    <div class="address">
      <div class="label">An</div>
      ELOYO, Inhaber Eric Pfadisch<br>
      Fuggerstr. 2, 86836 Untermeitingen<br>
      USt-IdNr.: DE337756435<br>
      support@eloyo.de
    </div>
  </div>

  <div class="section">
    <h3>Position 1: Monatliche Folgeprovision</h3>
    <table><tr><td>${d.aktiveKundenSnapshot} aktive Kunden × 12,00 €</td><td style="text-align:right;"><strong>${d.folgeprovisionNetto.toFixed(2)} €</strong></td></tr></table>
  </div>

  ${d.direktDetails.length > 0 ? `
  <div class="section">
    <h3>Position 2: Einmalprovisionen</h3>
    <table>${direktRows}
      <tr style="border-top:1px solid #E5E7EB;"><td style="padding:6px 8px;"><strong>Summe Einmalprovisionen</strong></td><td style="padding:6px 8px;text-align:right;"><strong>${d.direktprovisionNetto.toFixed(2)} €</strong></td><td></td></tr>
    </table>
  </div>` : ""}

  ${d.sponsorBonusNetto > 0 ? `
  <div class="section">
    <h3>Position 3: Sponsor-Bonus</h3>
    <table><tr><td>Sponsor-Bonus</td><td style="text-align:right;"><strong>${d.sponsorBonusNetto.toFixed(2)} €</strong></td></tr></table>
  </div>` : ""}

  <div class="totals">
    <table>
      <tr><td style="padding:6px 8px;font-size:16px;"><strong>Gesamt netto</strong></td><td style="padding:6px 8px;text-align:right;font-size:16px;"><strong>${d.gesamtNetto.toFixed(2)} €</strong></td></tr>
      ${ustBlock}
    </table>
  </div>

  <div class="footer">
    Erstellt am: ${d.erstelldatum}<br>
    ELOYO — Gutschriftverfahren
  </div>
</body></html>`;
}
