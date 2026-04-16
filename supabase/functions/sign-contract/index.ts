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

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Nicht authentifiziert");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Nicht authentifiziert");

    // Check role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "partner")
      .maybeSingle();
    if (!roleData) throw new Error("Kein Vertriebspartner-Account");

    // Get profile
    const { data: profile, error: profErr } = await supabase
      .from("sales_rep_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (profErr || !profile) throw new Error("Profil nicht gefunden");

    // Allow re-signing if contract is outdated
    if (profile.vertrag_angenommen_am && !profile.vertrag_outdated) {
      throw new Error("Vertrag wurde bereits angenommen");
    }

    // Validate required fields
    const required = ["first_name", "last_name", "email", "street", "postal_code", "city", "iban", "bic"];
    for (const field of required) {
      if (!profile[field]) throw new Error(`Feld ${field} ist nicht ausgefüllt. Bitte vervollständige dein Profil.`);
    }

    // Collect metadata
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unbekannt";
    const userAgent = (req.headers.get("user-agent") ?? "unbekannt").substring(0, 100);
    const timestamp = new Date();
    const datumFormatiert = timestamp.toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
    const uhrzeitFormatiert = timestamp.toLocaleTimeString("de-DE", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
    });

    const fullName = `${profile.first_name} ${profile.last_name}`;
    const adresse = `${profile.street} ${profile.house_number || ""}, ${profile.postal_code} ${profile.city}`.trim();
    const partnerId = profile.employee_number ? `PID-${profile.employee_number}` : profile.id.substring(0, 8);

    // Generate PDF
    const pdfBytes = generateContractPdf({
      fullName,
      adresse,
      email: profile.email,
      telefon: profile.phone || "—",
      steuernummer: profile.tax_number || "—",
      ustId: profile.vat_id || "",
      iban: profile.iban,
      bic: profile.bic,
      partnerId,
      vertragsdatum: datumFormatiert,
      ip,
      userAgent,
      userId: user.id,
      uhrzeit: uhrzeitFormatiert,
    });

    // Upload to storage
    const storagePath = `${user.id}/Vertriebspartnervertrag_${partnerId}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("vertraege")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) throw new Error(`Upload-Fehler: ${uploadErr.message}`);

    // Update profile - reset outdated flag
    const { error: updateErr } = await supabase
      .from("sales_rep_profiles")
      .update({
        vertrag_angenommen_am: timestamp.toISOString(),
        vertrag_ip: ip,
        vertrag_user_agent: userAgent,
        vertrag_pdf_url: storagePath,
        contract_status: "angenommen",
        vertrag_outdated: false,
      })
      .eq("user_id", user.id);
    if (updateErr) throw new Error(`Update-Fehler: ${updateErr.message}`);

    // Send emails
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "support@eloyo.de";

    if (resendKey) {
      // Email to partner
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "ELOYO <noreply@eloyo.de>",
            to: [profile.email],
            subject: "Dein Vertriebspartnervertrag – Eloyo",
            html: `
              <p>Hallo ${profile.first_name},</p>
              <p>dein Vertriebspartnervertrag wurde am <strong>${datumFormatiert}</strong> um <strong>${uhrzeitFormatiert} Uhr</strong> erfolgreich angenommen.</p>
              <p>Du kannst den Vertrag jederzeit in deinem Backoffice unter „Mein Vertrag" herunterladen.</p>
              <br>
              <p>Viele Grüße,<br>Dein ELOYO Team</p>
            `,
          }),
        });
      } catch (e) { console.error("Email an Partner fehlgeschlagen:", e); }

      // Email to admin
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "ELOYO <noreply@eloyo.de>",
            to: [adminEmail],
            subject: `Neuer Vertrag angenommen: ${fullName}`,
            html: `
              <p>Ein neuer Vertriebspartnervertrag wurde digital angenommen.</p>
              <ul>
                <li><strong>Name:</strong> ${fullName}</li>
                <li><strong>Partner-ID:</strong> ${partnerId}</li>
                <li><strong>Datum:</strong> ${datumFormatiert}, ${uhrzeitFormatiert} Uhr</li>
                <li><strong>IP-Adresse:</strong> ${ip}</li>
                <li><strong>E-Mail:</strong> ${profile.email}</li>
              </ul>
              <p>Der Vertrag ist im Storage unter <code>vertraege/${storagePath}</code> verfügbar.</p>
            `,
          }),
        });
      } catch (e) { console.error("Email an Admin fehlgeschlagen:", e); }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sign-contract error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ContractData {
  fullName: string;
  adresse: string;
  email: string;
  telefon: string;
  steuernummer: string;
  ustId: string;
  iban: string;
  bic: string;
  partnerId: string;
  vertragsdatum: string;
  ip: string;
  userAgent: string;
  userId: string;
  uhrzeit: string;
}

function generateContractPdf(d: ContractData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210;
  const margin = 20;
  const cw = pw - 2 * margin;
  let y = 20;

  const addPage = () => {
    doc.addPage();
    y = 20;
    addFooter(doc);
  };

  const checkPage = (needed: number) => {
    if (y + needed > 270) addPage();
  };

  const addFooter = (d: jsPDF) => {
    d.setFontSize(8);
    d.setTextColor(150);
    d.text("Eloyo – Vertriebspartnervertrag", pw / 2, 290, { align: "center" });
    d.setTextColor(0);
  };

  // ===== PAGE 1: TITLE + PARTIES =====
  addFooter(doc);

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(107, 33, 168);
  doc.text("VERTRIEBSPARTNERVERTRAG", pw / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Freier Kooperationsvertrag zwischen ELOYO und dem Vertriebspartner", pw / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 15;

  // Separator
  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 10;

  // Auftraggeber
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Vertragsparteien", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Auftraggeber", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const auftraggeber = [
    ["Unternehmen", "ELOYO, Inhaber Klaus Eric Pfadisch"],
    ["Adresse", "Fuggerstr. 2, 86836 Untermeitingen, Bayern"],
    ["USt-IdNr.", "DE337756435"],
    ["E-Mail", "support@eloyo.de"],
  ];
  for (const [label, val] of auftraggeber) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, margin + 40, y);
    y += 6;
  }
  y += 8;

  // Auftragnehmer
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Auftragnehmer (Vertriebspartner)", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  const auftragnehmer = [
    ["Name", d.fullName],
    ["Adresse", d.adresse],
    ["E-Mail", d.email],
    ["Telefon", d.telefon],
    ["Steuernummer", d.steuernummer],
    ["USt-IdNr.", d.ustId || "— (nicht USt-pflichtig)"],
    ["IBAN / BIC", `${d.iban} / ${d.bic}`],
    ["Partner-ID", d.partnerId],
    ["Vertragsdatum", d.vertragsdatum],
  ];
  for (const [label, val] of auftragnehmer) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin + 2, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, margin + 40, y);
    y += 6;
  }

  // ===== PAGE 2: A, B, C =====
  addPage();

  const sections = [
    {
      title: "A – Vertragsart & Grundlage",
      text: "Dieser Vertrag begründet ein freies Kooperationsverhältnis im Sinne eines handelsvertreterähnlichen Verhältnisses zwischen ELOYO und dem Vertriebspartner. Es handelt sich ausdrücklich um keinen Arbeitsvertrag und kein Anstellungsverhältnis. Für diesen Vertrag gilt deutsches Recht. Ausschließlicher Gerichtsstand ist Augsburg.",
    },
    {
      title: "B – Selbstständigkeit & Wettbewerb",
      text: "Der Vertriebspartner ist gewerblich selbständig tätig. Es besteht kein Arbeitsverhältnis im Sinne des deutschen Arbeitsrechts. Der Vertriebspartner ist in der Gestaltung seiner Tätigkeit frei. Er trägt das eigene unternehmerische Risiko und ist für die Anmeldung und Versteuerung seiner Einnahmen selbst verantwortlich. Eine gleichzeitige Tätigkeit für andere Auftraggeber ist grundsätzlich zulässig, sofern kein Verstoß gegen die Wettbewerbsregelung vorliegt.",
    },
    {
      title: "Wettbewerbsregelung",
      text: "Während der Laufzeit dieses Vertrags ist es dem Vertriebspartner untersagt, aktiv für Unternehmen tätig zu sein, die digitale Kundenbindungsprogramme, Loyalty-Systeme oder digitales Direktmarketing für lokale Einzelhändler und Gewerbebetriebe anbieten und damit in direktem Wettbewerb zu ELOYO stehen. Ein Verstoß berechtigt ELOYO zur außerordentlichen fristlosen Kündigung.",
    },
    {
      title: "C – Auftreten nach außen",
      text: `Der Vertriebspartner ist nicht berechtigt, im Namen von ELOYO rechtsverbindliche Erklärungen abzugeben oder Verträge zu schließen. Gegenüber Kunden und Dritten hat er sich ausschließlich als \u201EVertriebspartner von ELOYO\u201C vorzustellen.`,
    },
    {
      title: "D – Registrierung & Account-Aktivierung",
      text: "1. ELOYO legt den Account im Backoffice an. 2. Der Vertriebspartner erhält eine E-Mail mit Link zur Passwortvergabe. 3. Pflicht: Bankdaten und Steuernummer im Backoffice hinterlegen. 4. Erst nach vollständiger Dateneingabe ist die Vertragsvorlage verfügbar. 5. Der Vertrag muss innerhalb von 14 Tagen nach Account-Anlage digital angenommen werden.",
    },
  ];

  for (const sec of sections) {
    checkPage(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(107, 33, 168);
    doc.text(sec.title, margin, y);
    doc.setTextColor(0);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(sec.text, cw);
    for (const line of lines) {
      checkPage(6);
      doc.text(line, margin, y);
      y += 5.5;
    }
    y += 6;
  }

  // ===== PAGE 3+: E – Provisionen =====
  addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(107, 33, 168);
  doc.text("E – Provisionsmodell", margin, y);
  doc.setTextColor(0);
  y += 8;

  const provSections = [
    { title: "1. Direktprovision", text: "Für jeden erfolgreich geworbenen Kunden erhält der Vertriebspartner eine einmalige Direktprovision in Höhe von 50,00 € netto. Die Auszahlung erfolgt 7 Tage nach bestätigtem Zahlungseingang des Neukunden." },
    { title: "2. Folgeprovision", text: "Solange ein geworbener Kunde aktiv bleibt und seinen Vertrag bei ELOYO aufrechterhält, erhält der Vertriebspartner eine monatliche Folgeprovision in Höhe von 12,00 € netto pro aktivem Kunden." },
    { title: "3. Inaktivitätsregel", text: "Ab dem 91. Tag ohne bestätigten Neukunden-Abschluss gilt der Vertriebspartner als inaktiv. Während der Inaktivität werden keine Folgeprovisionen ausgezahlt. Nicht ausgezahlte Folgeprovisionen aus Inaktivitätsmonaten verfallen ersatzlos." },
    { title: "4. Sponsor-Bonus", text: "Empfiehlt der Vertriebspartner eine Person als neuen Vertriebspartner und wird diese von ELOYO aufgenommen, erhält er als Sponsor einen monatlichen Bonus von 5,00 € netto pro aktivem Kunden des gesponserten Vertriebspartners. Diese Regelung gilt ausschließlich für eine Ebene." },
    { title: "5. Umsatzsteuer & Abrechnung", text: "Die Abrechnung erfolgt im Gutschriftverfahren. ELOYO erstellt die Abrechnungsdokumente und stellt diese im Backoffice zum Download bereit." },
  ];

  for (const sec of provSections) {
    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(sec.title, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(sec.text, cw);
    for (const line of lines) {
      checkPage(6);
      doc.text(line, margin, y);
      y += 5.5;
    }
    y += 5;
  }

  // F – Auszahlung
  checkPage(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(107, 33, 168);
  doc.text("F – Auszahlung", margin, y);
  doc.setTextColor(0);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const auszText = "Die Auszahlung erfolgt monatlich. ELOYO initiiert die Überweisung zum 1. eines jeden Monats; der Zahlungseingang beim Vertriebspartner erfolgt spätestens bis zum 5. des Monats. Maßgeblich für die Überweisung sind ausschließlich die im Backoffice hinterlegten Bankdaten.";
  const auszLines = doc.splitTextToSize(auszText, cw);
  for (const line of auszLines) { checkPage(6); doc.text(line, margin, y); y += 5.5; }
  y += 6;

  // G – Inaktivität
  checkPage(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(107, 33, 168);
  doc.text("G – Inaktivität & Konsequenzen", margin, y);
  doc.setTextColor(0);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const inaktText = "Als Aktivität gilt ausschließlich der bestätigte Zahlungseingang eines Neukunden. Ab dem Tag des letzten Zahlungseingangs läuft ein Zähler in Kalendertagen. Tag 1–90: AKTIV. Ab Tag 91: INAKTIV – keine Folgeprovisionen. Ab Monat 13 ohne Aktivität: ACCOUNT GELÖSCHT.";
  const inaktLines = doc.splitTextToSize(inaktText, cw);
  for (const line of inaktLines) { checkPage(6); doc.text(line, margin, y); y += 5.5; }
  y += 6;

  // H – Kündigung
  checkPage(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(107, 33, 168);
  doc.text("H – Kündigung", margin, y);
  doc.setTextColor(0);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const kuendText = "Der Vertrag kann von beiden Seiten mit einer Frist von 30 Tagen zum Monatsende schriftlich gekündigt werden. ELOYO ist zur außerordentlichen fristlosen Kündigung berechtigt bei Verstoß gegen die Wettbewerbsregelung, Rufschädigung, oder Verstößen gegen geltendes Recht.";
  const kuendLines = doc.splitTextToSize(kuendText, cw);
  for (const line of kuendLines) { checkPage(6); doc.text(line, margin, y); y += 5.5; }
  y += 6;

  // I – Boxen
  checkPage(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(107, 33, 168);
  doc.text("I – eloyo Boxen & Bestellsystem", margin, y);
  doc.setTextColor(0);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const boxText = "Der Vertriebspartner kann über das Backoffice Pakete bestellen: Starterpaket (4 Boxen / 120 €) oder Vertriebspaket (7 Boxen / 210 €, mind. 4 aktive Kunden). Jede Box hat einen Warenwert von 30,00 € brutto. Nicht abgeschlossene Boxen nach 91 Tagen werden in Rechnung gestellt.";
  const boxLines = doc.splitTextToSize(boxText, cw);
  for (const line of boxLines) { checkPage(6); doc.text(line, margin, y); y += 5.5; }
  y += 6;

  // J, K, L, M, N — remaining sections
  const remainingSections = [
    { t: "J – Empfehlung neuer Vertriebspartner", b: "Der Vertriebspartner kann Personen als potenzielle neue Vertriebspartner bei ELOYO vorschlagen. Die Entscheidung über die Aufnahme liegt ausschließlich bei ELOYO. Es gilt ausschließlich eine Sponsor-Ebene – kein Strukturvertrieb." },
    { t: "K – Schulungsangebot", b: "ELOYO stellt im Backoffice Schulungsvideos und Materialien kostenfrei zur Verfügung. Die Nutzung ist freiwillig. Ein Ausbildungsverhältnis wird hierdurch nicht begründet." },
    { t: "L – Datenschutz & Auftragsverarbeitung", b: "Der Vertriebspartner verpflichtet sich, alle personenbezogenen Daten, die ihm im Rahmen der Vertriebstätigkeit bekannt werden, vertraulich zu behandeln und die Vorschriften der DSGVO einzuhalten." },
    { t: "M – Haftung", b: "Der Vertriebspartner handelt in eigener Verantwortung. ELOYO haftet nicht für Schäden, die durch das Handeln des Vertriebspartners gegenüber Dritten entstehen." },
    { t: "N – Sonstige Klauseln", b: "Salvatorische Klausel: Sollte eine Bestimmung unwirksam sein, berührt dies die Gültigkeit der übrigen Bestimmungen nicht. Schriftformklausel: Änderungen bedürfen der Schriftform. Anwendbares Recht: Deutsches Recht. Gerichtsstand: Augsburg." },
  ];

  for (const s of remainingSections) {
    checkPage(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(107, 33, 168);
    doc.text(s.t, margin, y);
    doc.setTextColor(0);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(s.b, cw);
    for (const line of lines) { checkPage(6); doc.text(line, margin, y); y += 5.5; }
    y += 6;
  }

  // ===== LAST PAGE: DIGITAL SIGNATURE =====
  addPage();

  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pw - margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(107, 33, 168);
  doc.text("DIGITALE ANNAHME", pw / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const sigFields = [
    ["Name:", d.fullName],
    ["Datum:", `${d.vertragsdatum}, ${d.uhrzeit} Uhr`],
    ["IP-Adresse:", d.ip],
    ["Gerät:", d.userAgent],
    ["User-ID:", d.userId],
  ];

  for (const [label, val] of sigFields) {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, margin + 45, y);
    y += 7;
  }
  y += 5;

  doc.setFontSize(9);
  const legalText = "Durch Eingabe des vollständigen Namens und digitale Bestätigung im Eloyo-Backoffice akzeptiert der Vertriebspartner diesen Vertrag verbindlich gemäß § 305 BGB.";
  const legalLines = doc.splitTextToSize(legalText, cw - 20);
  for (const line of legalLines) {
    doc.text(line, margin + 10, y);
    y += 5;
  }
  y += 10;

  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw / 2 - 5, y);
  doc.line(pw / 2 + 5, y, pw - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Klaus Eric Pfadisch – ELOYO", margin, y);
  doc.text(`${d.fullName} – Vertriebspartner`, pw / 2 + 5, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Fuggerstr. 2, 86836 Untermeitingen", margin, y);
  doc.text(`Digital angenommen am ${d.vertragsdatum}, ${d.uhrzeit} Uhr`, pw / 2 + 5, y);

  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.8);
  const bottomLine = y + 10;
  doc.line(margin, bottomLine, pw - margin, bottomLine);

  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
