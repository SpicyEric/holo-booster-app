import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Nicht authentifiziert");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Nicht authentifiziert");

    const { vereinbarung_id } = await req.json();
    if (!vereinbarung_id) throw new Error("vereinbarung_id fehlt");

    // Profile laden
    const { data: profile, error: pErr } = await supabase
      .from("sales_rep_profiles").select("*").eq("user_id", user.id).single();
    if (pErr || !profile) throw new Error("Profil nicht gefunden");

    // Vereinbarung laden
    const { data: zusatz, error: zErr } = await supabase
      .from("zusatzvereinbarungen").select("*").eq("id", vereinbarung_id).eq("ist_aktiv", true).single();
    if (zErr || !zusatz) throw new Error("Zusatzvereinbarung nicht gefunden oder inaktiv");

    // Existierende Annahme prüfen
    const { data: existing } = await supabase
      .from("vertriebler_zusatzvereinbarungen")
      .select("*")
      .eq("user_id", user.id)
      .eq("vereinbarung_id", vereinbarung_id)
      .maybeSingle();
    if (existing && existing.status === "angenommen") {
      throw new Error("Diese Vereinbarung wurde bereits angenommen");
    }

    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unbekannt";
    const userAgent = (req.headers.get("user-agent") ?? "unbekannt").substring(0, 100);
    const now = new Date();
    const datum = now.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const uhrzeit = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
    const fullName = `${profile.first_name} ${profile.last_name}`;
    const partnerId = profile.employee_number ? `PID-${profile.employee_number}` : profile.id.substring(0, 8);

    // Original-PDF aus vertraege-vorlagen laden
    const { data: origBlob, error: dlErr } = await supabase.storage.from("vertraege-vorlagen").download(zusatz.pdf_url);
    if (dlErr) throw new Error("Vorlage konnte nicht geladen werden: " + dlErr.message);
    const origBytes = new Uint8Array(await origBlob.arrayBuffer());

    // Annahme-Hinweisseite generieren
    const noticeBytes = generateAcceptanceNotice({
      titel: zusatz.titel,
      fullName, partnerId, datum, uhrzeit, ip, userAgent, userId: user.id,
    });

    // Beide kombinieren (einfacher Ansatz: zwei separate Files speichern wäre alternativ — hier hängen wir die Notice als zweites File an)
    // Da jsPDF kein Merge kann, speichern wir die Vorlage + Notice getrennt aber referenzieren beides via combined_pdf_url + notice_pdf_url
    // Praktischer: nur Notice generieren und Original via Vorlage referenzieren. Wir speichern die Notice separat.
    const safeTitel = zusatz.titel.replace(/[^\w-]+/g, "_");
    const noticePath = `${user.id}/zusatz_${vereinbarung_id}_annahme.pdf`;
    const { error: upErr } = await supabase.storage.from("vertraege")
      .upload(noticePath, noticeBytes, { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error("Upload fehlgeschlagen: " + upErr.message);

    // Eintrag speichern (upsert)
    const payload = {
      user_id: user.id,
      vereinbarung_id,
      status: "angenommen",
      angenommen_am: now.toISOString(),
      ip,
      user_agent: userAgent,
      pdf_url: noticePath,
    };
    if (existing) {
      const { error } = await supabase.from("vertriebler_zusatzvereinbarungen")
        .update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("vertriebler_zusatzvereinbarungen").insert(payload);
      if (error) throw error;
    }

    // E-Mails (best-effort)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "support@eloyo.de";
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "ELOYO <noreply@eloyo.de>",
            to: [profile.email],
            subject: `Zusatzvereinbarung „${zusatz.titel}" angenommen`,
            html: `<p>Hallo ${profile.first_name},</p><p>du hast die Zusatzvereinbarung <strong>${zusatz.titel}</strong> am ${datum} um ${uhrzeit} Uhr digital angenommen.</p><p>Den Annahmebeleg findest du in deinem Backoffice unter „Mein Vertrag".</p><p>Viele Grüße,<br>Dein ELOYO Team</p>`,
          }),
        });
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "ELOYO <noreply@eloyo.de>",
            to: [adminEmail],
            subject: `Zusatzvereinbarung angenommen: ${fullName}`,
            html: `<p><strong>${fullName}</strong> (${partnerId}) hat die Zusatzvereinbarung <strong>${zusatz.titel}</strong> angenommen.</p><ul><li>Datum: ${datum}, ${uhrzeit} Uhr</li><li>IP: ${ip}</li><li>E-Mail: ${profile.email}</li></ul>`,
          }),
        });
      } catch (e) { console.error("Email-Versand fehlgeschlagen:", e); }
    }

    return new Response(JSON.stringify({ success: true, pdf_url: noticePath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sign-zusatzvereinbarung error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface NoticeData {
  titel: string; fullName: string; partnerId: string;
  datum: string; uhrzeit: string; ip: string; userAgent: string; userId: string;
}

function generateAcceptanceNotice(d: NoticeData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210; const margin = 20;
  let y = 25;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 33, 168);
  doc.text("ZUSATZVEREINBARUNG", pw / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(13);
  doc.setTextColor(80);
  doc.text(d.titel, pw / 2, y, { align: "center" });
  y += 12;

  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 12;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 33, 168);
  doc.text("DIGITALE ANNAHME", pw / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 14;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fields = [
    ["Vereinbarung:", d.titel],
    ["Name:", d.fullName],
    ["Partner-ID:", d.partnerId],
    ["Datum:", `${d.datum}, ${d.uhrzeit} Uhr`],
    ["IP-Adresse:", d.ip],
    ["Gerät:", d.userAgent],
    ["User-ID:", d.userId],
  ];
  for (const [k, v] of fields) {
    doc.setFont("helvetica", "bold");
    doc.text(k, margin + 5, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, margin + 45, y);
    y += 7;
  }
  y += 8;

  doc.setFontSize(9);
  const legal = "Mit der digitalen Bestätigung im Eloyo-Backoffice akzeptiert der Vertriebspartner die oben genannte Zusatzvereinbarung verbindlich. Der Volltext der Vereinbarung wurde vor der Annahme bereitgestellt und vom Vertriebspartner zur Kenntnis genommen.";
  const legalLines = doc.splitTextToSize(legal, pw - 2 * margin - 10);
  for (const ln of legalLines) { doc.text(ln, margin + 5, y); y += 5; }

  y += 12;
  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw - margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Klaus Eric Pfadisch – ELOYO", margin, y);
  doc.text(`${d.fullName} – Vertriebspartner`, pw - margin, y, { align: "right" });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Eloyo – Annahmebeleg Zusatzvereinbarung", pw / 2, 290, { align: "center" });

  return new Uint8Array(doc.output("arraybuffer"));
}
