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

    // Aktive Vertragsversion ermitteln
    const { data: activeVer } = await supabase
      .from("vertrag_versionen")
      .select("version, titel")
      .eq("ist_aktiv", true)
      .maybeSingle();
    const newVersion: string = activeVer?.version || "v1";
    const previousVersion: string | null = profile.vertrag_version || null;
    const isReplacement = !!previousVersion && previousVersion !== newVersion;

    // Bei Re-Sign: alte PDF archivieren
    if (isReplacement && profile.vertrag_pdf_url) {
      const archivePath = `${user.id}/archiv/${previousVersion}_${Date.now()}.pdf`;
      const { data: oldBlob } = await supabase.storage.from("vertraege").download(profile.vertrag_pdf_url);
      if (oldBlob) {
        await supabase.storage.from("vertraege").upload(archivePath, oldBlob, {
          contentType: "application/pdf", upsert: true,
        });
      }
    }

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
      version: newVersion,
      previousVersion: isReplacement ? previousVersion : null,
    });

    // Upload to storage
    const storagePath = `${user.id}/Vertriebspartnervertrag_${partnerId}_${newVersion}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("vertraege")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) throw new Error(`Upload-Fehler: ${uploadErr.message}`);

    // Update profile - reset outdated flag, set version
    const { error: updateErr } = await supabase
      .from("sales_rep_profiles")
      .update({
        vertrag_angenommen_am: timestamp.toISOString(),
        vertrag_ip: ip,
        vertrag_user_agent: userAgent,
        vertrag_pdf_url: storagePath,
        contract_status: "angenommen",
        vertrag_outdated: false,
        vertrag_outdated_seit: null,
        vertrag_inaktiv: false,
        vertrag_version: newVersion,
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
            subject: "Dein Vertriebspartnervertrag - Eloyo",
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
  version: string;
  previousVersion: string | null;
}

function generateContractPdf(d: ContractData): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210;
  const margin = 20;
  const cw = pw - 2 * margin;
  let y = 20;

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Stand: April 2026 - Version ${d.version} - Eloyo, Fuggerstr. 2, 86836 Untermeitingen - support@eloyo.de`, pw / 2, 290, { align: "center" });
    doc.setTextColor(0);
  };

  const addPage = () => {
    doc.addPage();
    y = 20;
    addFooter();
  };

  const checkPage = (needed: number) => {
    if (y + needed > 270) addPage();
  };

  const heading = (title: string, size = 12) => {
    checkPage(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(107, 33, 168);
    doc.text(title, margin, y);
    doc.setTextColor(0);
    y += size === 12 ? 7 : 6;
  };

  const subheading = (title: string) => {
    checkPage(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(title, margin, y);
    y += 5.5;
  };

  const paragraph = (text: string, opts: { bold?: boolean; size?: number; indent?: number } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    const indent = opts.indent ?? 0;
    const lines = doc.splitTextToSize(text, cw - indent);
    for (const line of lines) {
      checkPage(5.5);
      doc.text(line, margin + indent, y);
      y += 5;
    }
    y += 2;
  };

  const bullet = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text, cw - 6);
    for (let i = 0; i < lines.length; i++) {
      checkPage(5.5);
      if (i === 0) doc.text("•", margin + 1, y);
      doc.text(lines[i], margin + 6, y);
      y += 5;
    }
  };

  const kvRow = (label: string, value: string) => {
    checkPage(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, margin + 2, y);
    doc.setFont("helvetica", "normal");
    const valLines = doc.splitTextToSize(value, cw - 50);
    doc.text(valLines[0], margin + 50, y);
    y += 6;
    for (let i = 1; i < valLines.length; i++) {
      checkPage(5);
      doc.text(valLines[i], margin + 50, y);
      y += 5;
    }
  };

  // ===== PAGE 1: TITLE + PARTIES =====
  addFooter();

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
  y += 12;

  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);
  y += 8;

  heading("Vertragsparteien", 13);
  subheading("Auftraggeber");
  kvRow("Unternehmen", "ELOYO, Inhaber Klaus Eric Pfadisch");
  kvRow("Adresse", "Fuggerstr. 2, 86836 Untermeitingen, Bayern");
  kvRow("USt-IdNr.", "DE337756435");
  kvRow("E-Mail", "support@eloyo.de");
  y += 4;

  subheading("Auftragnehmer (Vertriebspartner)");
  kvRow("Name", d.fullName);
  kvRow("Adresse", d.adresse);
  kvRow("E-Mail", d.email);
  kvRow("Telefon", d.telefon);
  kvRow("Steuernummer", d.steuernummer);
  kvRow("USt-IdNr.", d.ustId ? d.ustId : "— (nicht USt-pflichtig)");
  kvRow("IBAN / BIC", `${d.iban} / ${d.bic}`);
  kvRow("Partner-ID", d.partnerId);
  kvRow("Vertragsdatum", d.vertragsdatum);
  kvRow("Vertragsversion", d.version);

  // ===== A - Vertragsart & Grundlage =====
  addPage();
  heading("A - Vertragsart & Grundlage");
  paragraph("Dieser Vertrag begründet ein freies Kooperationsverhältnis im Sinne eines handelsvertreterähnlichen Verhältnisses zwischen ELOYO und dem Vertriebspartner. Es handelt sich ausdrücklich um keinen Arbeitsvertrag und kein Anstellungsverhältnis. Für diesen Vertrag gilt deutsches Recht. Ausschließlicher Gerichtsstand ist Augsburg.");
  paragraph("Vertragsanpassungen: ELOYO behält sich das Recht vor, diesen Vertrag bei Bedarf anzupassen. Der Vertriebspartner wird über Änderungen im Backoffice informiert und muss den aktualisierten Vertrag innerhalb von 30 Tagen erneut annehmen. Wird der aktualisierte Vertrag nicht innerhalb dieser Frist angenommen, wird der Account bis zur Annahme als inaktiv markiert. Bereits angenommene ältere Vertragsversionen werden durch die neue Version ersetzt und sind ab dem Zeitpunkt der erneuten Annahme nicht mehr gültig.");

  // ===== B - Selbstständigkeit & Wettbewerb =====
  heading("B - Selbstständigkeit & Wettbewerb");
  paragraph("Der Vertriebspartner ist gewerblich selbstständig tätig. Es besteht kein Arbeitsverhältnis im Sinne des deutschen Arbeitsrechts. Im Einzelnen gilt:");
  bullet("Der Vertriebspartner ist in der Gestaltung seiner Tätigkeit frei — es besteht keine Weisungsgebundenheit hinsichtlich Ort, Zeit, Art und Umfang der Tätigkeit.");
  bullet("Er trägt das eigene unternehmerische Risiko und ist für die Anmeldung, Versteuerung und steuerliche Meldung seiner Einnahmen selbst verantwortlich.");
  bullet("Eine gleichzeitige Tätigkeit für andere Auftraggeber ist grundsätzlich zulässig, sofern kein Verstoß gegen die nachfolgende Wettbewerbsregelung vorliegt.");
  bullet("Alle im Backoffice bereitgestellten Tools sind freiwillige Angebote ohne Nutzungspflicht.");
  y += 3;

  subheading("Wettbewerbsregelung");
  paragraph("Während der Laufzeit dieses Vertrags ist es dem Vertriebspartner untersagt, aktiv für Unternehmen tätig zu sein, die digitale Kundenbindungsprogramme, Loyalty-Systeme oder digitales Direktmarketing für lokale Einzelhändler und Gewerbebetriebe anbieten und damit in direktem Wettbewerb zu ELOYO stehen. Als „aktiv tätig\" gilt insbesondere die Tätigkeit als Vertriebspartner, Handelsvertreter oder Berater. Eine passive Beteiligung ist nicht erfasst. Ein Verstoß berechtigt ELOYO zur außerordentlichen fristlosen Kündigung.");

  // ===== C - Auftreten nach außen =====
  heading("C - Auftreten nach außen");
  paragraph("Der Vertriebspartner ist nicht berechtigt, im Namen von ELOYO rechtsverbindliche Erklärungen abzugeben oder Verträge zu schließen. Gegenüber Kunden und Dritten hat er sich ausschließlich als „Vertriebspartner von ELOYO\" vorzustellen. Die korrekte Darstellung seiner Selbstständigkeit liegt in seiner eigenen Verantwortung.");

  // ===== D - Registrierung & Account-Aktivierung =====
  heading("D - Registrierung & Account-Aktivierung");
  paragraph("Der Vertriebspartner-Account wird wie folgt aktiviert:");
  bullet("1. ELOYO legt den Account im Backoffice an.");
  bullet("2. Der Vertriebspartner erhält eine E-Mail mit Link zur Passwortvergabe.");
  bullet("3. Pflicht: Bankdaten und Steuernummer im Backoffice hinterlegen. Die Angabe einer USt-IdNr. ist nur erforderlich, sofern der Vertriebspartner der Umsatzsteuerpflicht unterliegt.");
  bullet("4. Erst nach vollständiger Dateneingabe ist die Vertragsvorlage verfügbar.");
  bullet("5. Der Vertrag muss digital angenommen werden. Kunden abschließen ist sofort möglich. Auszahlungen erfolgen erst nach Hinterlegung der Steuernummer und Bankverbindung.");

  // ===== E - Vergütung / Provisionsmodell =====
  heading("E - Vergütung / Provisionsmodell");

  subheading("1. Direktprovision");
  paragraph("Der Vertriebspartner erhält für jeden erfolgreich abgeschlossenen Neukunden eine Direktprovision in Höhe von 50,00 € netto. Als Abschluss gilt der bestätigte Zahlungseingang der Einmalzahlung des Neukunden. Die Provision erscheint sofort als „vorgemerkt\" im Backoffice und wird nach einer Freigabefrist von 7 Kalendertagen auf „zur Auszahlung bereit\" gesetzt. Bei Stornierung innerhalb der 7 Tage verfällt die Provision ersatzlos.");

  subheading("2. Rabattsystem");
  paragraph("Der Vertriebspartner hat die Möglichkeit, beim Abschluss eines Neukunden einen Rabatt auf die Einmalzahlung zu gewähren. Zulässige Rabattstufen sind 10 €, 20 €, 30 €, 40 € oder 50 €. Die Gewährung eines Rabatts ist ausschließlich über die dafür vorgesehenen Gutscheincodes (ELOYO10 bis ELOYO50) zulässig. Der gewährte Rabattbetrag wird direkt von der Direktprovision abgezogen. Nicht autorisierte Rabatte oder selbst erstellte Codes sind unzulässig und können zum sofortigen Vertragsausschluss führen.");
  paragraph("Beispiel: 30 € Rabatt gewährt -> Direktprovision = 20 € netto.", { bold: true });

  subheading("3. Monatliche Folgeprovision");
  paragraph("Für jeden aktiven Kunden in seinem Portfolio erhält der Vertriebspartner eine monatliche Folgeprovision in Höhe von 12,00 € netto. Die Berechnung erfolgt nach dem Snapshot-Prinzip: Am 1. eines jeden Monats wird ermittelt, wie viele aktive Kunden dem Vertriebspartner zu diesem Stichtag zugeordnet sind. Ein Kunde gilt ab dem Tag des Zahlungseingangs seiner ersten Zahlung als aktiv.");
  paragraph("Wichtig: Nicht ausgezahlte Folgeprovisionen aus Inaktivitätsmonaten oder Monaten ohne hinterlegte Steuernummer/Bankverbindung werden nicht angestaut und nicht nachgeholt. Sie verfallen ersatzlos.", { bold: true });
  paragraph("Beispiel: Abschluss am 20. März -> Zahlung geht ein -> Kunde sofort aktiv. 27. März: 7 Tage abgelaufen -> 50 € Direktprovision zur Auszahlung bereit. 1. April (Snapshot): Kunde ist aktiv -> 12 € Folgeprovision für April. Auszahlung am 1. April: 50 € + 12 € = 62 €.");

  subheading("4. Sponsor-Bonus");
  paragraph("Empfiehlt der Vertriebspartner eine Person als neuen Vertriebspartner und wird diese von ELOYO aufgenommen, erhält er als „Sponsor\" einen monatlichen Bonus von 5,00 € netto pro aktivem Kunden des gesponserten Vertriebspartners. Diese Regelung gilt ausschließlich für eine Ebene (kein MLM). Die Entscheidung über die Aufnahme liegt ausschließlich bei ELOYO. Der Sponsor-Bonus unterliegt denselben Inaktivitäts- und Kündigungsregeln wie die Folgeprovision.");

  subheading("5. Umsatzsteuer & Abrechnung");
  paragraph("Alle genannten Beträge sind Nettobeträge. Die steuerliche Behandlung richtet sich nach dem Status des Vertriebspartners:");
  bullet("Kleinunternehmerregelung (§ 19 UStG): Wenn keine gültige USt-IdNr. hinterlegt ist, wird keine Umsatzsteuer ausgewiesen. Die Gutschrift enthält den Hinweis gemäß § 19 UStG.");
  bullet("USt-pflichtig: Wenn eine gültige und von ELOYO per VIES-Abfrage verifizierte USt-IdNr. hinterlegt ist, wird die Provision brutto (zzgl. 19% MwSt.) ausgezahlt. Die Gutschrift weist die MwSt. separat aus.");
  bullet("Änderungen der USt-Pflicht sind unverzüglich zu melden. Fehlende Meldungen gehen zu Lasten des Vertriebspartners.");
  bullet("Auszahlungssperre: Ohne hinterlegte Steuernummer und Bankverbindung ist keine Auszahlung möglich. Anfallende Provisionen in solchen Monaten verfallen ersatzlos.");
  paragraph("Die Abrechnung erfolgt im Gutschriftverfahren. ELOYO erstellt die Abrechnungsdokumente monatlich und stellt diese im Backoffice zum Download bereit.");

  // ===== F - Auszahlung =====
  heading("F - Auszahlung");
  paragraph("Die Auszahlung erfolgt monatlich. ELOYO initiiert die Überweisung zum 1. eines jeden Monats; der Zahlungseingang beim Vertriebspartner erfolgt spätestens bis zum 5. des Monats. Bei Wochenenden oder Feiertagen kann sich die Auszahlung entsprechend verschieben. Maßgeblich für die Überweisung sind ausschließlich die im Backoffice hinterlegten Bankdaten.");

  // ===== G - Inaktivität & Konsequenzen =====
  heading("G - Inaktivität & Konsequenzen");
  paragraph("Aktivitätsdefinition: Als Aktivität gilt ausschließlich der bestätigte Zahlungseingang eines Neukunden. Kundenkontakte, Termine oder die Nutzung des Backoffice begründen keine Aktivität. Ab dem Tag des letzten Zahlungseingangs läuft ein Zähler in Kalendertagen. Bei jedem neuen bestätigten Zahlungseingang wird er automatisch auf 0 zurückgesetzt.");
  bullet("Tag 1-180: AKTIV — Folgeprovision wird am Stichtag (1. des Monats) normal berechnet und ausgezahlt.");
  bullet("Ab Tag 181: INAKTIV — Folgeprovision wird nicht ausgezahlt, nicht angestaut und nicht nachgeholt. Account bleibt weitere 180 Tage (ca. 6 Monate) eingefroren. In dieser Zeit kann der Vertriebspartner durch einen neuen bestätigten Zahlungseingang reaktiviert werden — die bestehenden Kundenzuordnungen bleiben in dieser Zeit erhalten.");
  bullet("Ab Tag 361: ACCOUNT GELÖSCHT — Vollständige Löschung des Accounts, Kundenzuordnung wird aufgehoben.");
  paragraph("Wird innerhalb der 9-monatigen Einfrierphase ein neuer Kunde abgeschlossen, wechselt der Status sofort wieder auf aktiv. Die Folgeprovision läuft ab dem nächsten Stichtag wieder normal. Das Backoffice zeigt den aktuellen Zählerstand jederzeit an. Bei Erreichen von Tag 75 wird der Vertriebspartner automatisch per E-Mail gewarnt.");

  // ===== H - Kündigung & Provisionen nach Vertragsende =====
  heading("H - Kündigung & Provisionen nach Vertragsende");
  paragraph("Dieser Vertrag kann von beiden Parteien mit einer Frist von einem Monat zum Monatsende ordentlich gekündigt werden. Das Recht zur außerordentlichen fristlosen Kündigung aus wichtigem Grund bleibt unberührt — insbesondere bei Verstoß gegen die Wettbewerbsregelung, Rufschädigung oder Verstößen gegen geltendes Recht.");
  paragraph("Nach Kündigung gelten für Provisionen dieselben Regeln wie bei Inaktivität. Die Folgeprovision läuft weiter, solange der Zähler unter 180 Tagen liegt. Sobald der Zähler 180 Tage überschreitet oder die Kündigung wirksam wird — je nachdem was früher eintritt — wird kein Geldfluss mehr ausgelöst. Account bleibt anschließend 180 Tage eingefroren (Reaktivierung in dieser Zeit möglich, Kundenzuordnung bleibt erhalten); nach insgesamt 360 Tagen wird der Account gelöscht und die Kundenzuordnung aufgehoben.");

  // ===== I - eloyo Boxen & Bestellsystem =====
  heading("I - eloyo Boxen & Bestellsystem");
  paragraph("Der Vertriebspartner kann über das Backoffice zwei Pakete bestellen, die jeweils eloyo Boxen enthalten. Jede eloyo Box hat einen Warenwert von 30,00 € brutto (inkl. MwSt.). Es kann immer nur ein Paket gleichzeitig bestellt werden.");
  bullet("Starterpaket: 4 eloyo Boxen — 120,00 € — keine Voraussetzung.");
  bullet("Vertriebspaket: 7 eloyo Boxen — 210,00 € — Voraussetzung: mind. 4 aktive Kunden.");
  paragraph("Preisfixierung: Der Warenwert von 30,00 € pro eloyo Box wird zum Zeitpunkt der Bestellung protokolliert und ist verbindlich. Spätere Preisänderungen haben keinen Einfluss auf bereits aufgegebene Bestellungen.", { bold: true });
  paragraph("90-Tage-Frist: Ab dem Versanddatum durch ELOYO läuft für jede einzelne eloyo Box eine Frist von 90 Kalendertagen. Innerhalb dieser Frist muss jede Box einem Kunden zugewiesen (abgeschlossen) oder unversehrt an ELOYO zurückgesendet werden. Der Warenwert wird pro Box einzeln berechnet — nicht pauschal für das gesamte Paket.", { bold: true });
  paragraph("Ist beides nach 90 Tagen nicht erfolgt, werden 30,00 € pro betroffener Box automatisch in Rechnung gestellt — primär verrechnet mit offenen Provisionen, andernfalls als separate Rechnung. Der Vertriebspartner wird 15 Tage vor Fristablauf automatisch gewarnt.");
  paragraph("Beispiel: Starterpaket: 4 Boxen à 30 €. Nach 90 Tagen: 3 abgeschlossen, 1 nicht -> Rechnung über 30 € (nur für die 1 nicht abgeschlossene Box). Nachträglicher Abschluss möglich -> volle 50 € Direktprovision + 12 €/Monat Folgeprovision. Boxrechnung bleibt bestehen. Effektiv: 50 € - 30 € = 20 € Einmalgewinn, plus Folgeprovision.");

  // ===== J - Empfehlung neuer Vertriebspartner =====
  heading("J - Empfehlung neuer Vertriebspartner");
  paragraph("Der Vertriebspartner kann Personen als potenzielle neue Vertriebspartner bei ELOYO vorschlagen. Die Entscheidung über die Aufnahme liegt ausschließlich bei ELOYO. Bei Aufnahme wird der empfehlende Partner als „Sponsor\" geführt und erhält den Sponsor-Bonus gemäß Abschnitt E, Ziffer 4. Es gilt ausschließlich eine Sponsor-Ebene — kein Strukturvertrieb.");

  // ===== K - Schulungsangebot =====
  heading("K - Schulungsangebot");
  paragraph("ELOYO stellt im Backoffice Schulungsvideos und Materialien kostenfrei zur Verfügung. Die Nutzung ist freiwillig. Es handelt sich um ein unentgeltliches Informationsangebot ohne Lehrplan, Prüfungen oder Abschluss. Ein Ausbildungsverhältnis im Sinne des FernUSG wird hierdurch nicht begründet.");

  // ===== L - Datenschutz & Auftragsverarbeitung =====
  heading("L - Datenschutz & Auftragsverarbeitung");
  paragraph("Im Rahmen seiner Tätigkeit erhält der Vertriebspartner über das Backoffice Zugang zu personenbezogenen Daten seiner abgeschlossenen Kunden. Er gilt in diesem Umfang als Auftragsverarbeiter im Sinne des Art. 28 DSGVO. Mit Unterzeichnung dieses Vertrags verpflichtet er sich:");
  bullet("Diese Daten ausschließlich zur Erfüllung seiner vertraglichen Pflichten zu verarbeiten.");
  bullet("Angemessene technische und organisatorische Schutzmaßnahmen zu treffen.");
  bullet("Daten nach Vertragsende unverzüglich zu löschen oder an ELOYO zurückzugeben.");
  bullet("Datenpannen unverzüglich an ELOYO zu melden.");
  paragraph("Diese Regelung ersetzt ein separates AVV-Dokument und gilt mit Unterzeichnung als vereinbart.");

  // ===== M - Haftungsbeschränkung =====
  heading("M - Haftungsbeschränkung");
  paragraph("ELOYO haftet nicht für Schäden, die durch technische Ausfälle, Fehlfunktionen des Systems oder höhere Gewalt entstehen. Im Falle nachweislich fehlerhafter Provisionsberechnungen wird der korrekte Betrag in der nächsten regulären Abrechnung berichtigt. Ein Anspruch auf Sonderauszahlungen oder Verzugszinsen besteht nicht.");

  // ===== N - Sonstige Klauseln =====
  heading("N - Sonstige Klauseln");
  paragraph("Salvatorische Klausel: Sollte eine Bestimmung dieses Vertrags ganz oder teilweise unwirksam sein, berührt dies die Gültigkeit der übrigen Bestimmungen nicht.", { bold: true });
  paragraph("Schriftformklausel: Änderungen dieses Vertrags bedürfen der Schriftform oder der Bestätigung im Backoffice-System. Mündliche Nebenabreden bestehen nicht.", { bold: true });
  paragraph("Vertragsanpassungen: ELOYO behält sich vor, diesen Vertrag bei geänderten rechtlichen, wirtschaftlichen oder technischen Rahmenbedingungen anzupassen. Der Vertriebspartner wird im Backoffice darüber informiert und hat 30 Tage Zeit, den aktualisierten Vertrag anzunehmen.", { bold: true });
  paragraph("Anwendbares Recht: Deutsches Recht. Gerichtsstand: Augsburg.", { bold: true });

  // ===== UNTERSCHRIFTEN-SEITE =====
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
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Mit der digitalen Bestätigung im Eloyo-Backoffice erkennen beide Parteien sämtliche Bedingungen dieses Vertrags an.", pw / 2, y, { align: "center", maxWidth: cw });
  y += 14;

  const sigFields: Array<[string, string]> = [
    ["Name", d.fullName],
    ["Partner-ID", d.partnerId],
    ["Vertragsversion", d.version],
    ["Datum", `${d.vertragsdatum}, ${d.uhrzeit} Uhr`],
    ["IP-Adresse", d.ip],
    ["Gerät", d.userAgent],
    ["User-ID", d.userId],
  ];
  for (const [label, val] of sigFields) {
    checkPage(7);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin + 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, margin + 50, y);
    y += 7;
  }
  y += 6;

  doc.setFontSize(9);
  const legalText = "Durch Eingabe des vollständigen Namens und digitale Bestätigung im Eloyo-Backoffice akzeptiert der Vertriebspartner diesen Vertrag verbindlich gemäß § 305 BGB.";
  const legalLines = doc.splitTextToSize(legalText, cw - 20);
  for (const line of legalLines) {
    checkPage(5);
    doc.text(line, margin + 10, y);
    y += 5;
  }
  y += 12;

  doc.setDrawColor(107, 33, 168);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pw / 2 - 5, y);
  doc.line(pw / 2 + 5, y, pw - margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Klaus Eric Pfadisch - ELOYO", margin, y);
  doc.text(`${d.fullName} - Vertriebspartner`, pw / 2 + 5, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Fuggerstr. 2, 86836 Untermeitingen", margin, y);
  doc.text(`Digital angenommen am ${d.vertragsdatum}, ${d.uhrzeit} Uhr`, pw / 2 + 5, y);

  // ===== VERSIONS-HINWEISSEITE (nur bei Replacement) =====
  if (d.previousVersion) {
    addPage();
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 33, 168);
    doc.text("VERSIONSHINWEIS", pw / 2, y, { align: "center" });
    doc.setTextColor(0);
    y += 14;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const note = `Diese Vertragsversion (${d.version}) ersetzt die zuvor angenommene Version (${d.previousVersion}). Die vorherige Fassung wurde im internen Archiv gesichert und bleibt für Nachweiszwecke verfügbar. Mit der digitalen Annahme dieser neuen Version erkennt der Vertriebspartner die aktualisierten Konditionen verbindlich an.`;
    const noteLines = doc.splitTextToSize(note, cw - 10);
    for (const ln of noteLines) { doc.text(ln, margin + 5, y); y += 6; }
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Aktuelle Version: ${d.version}`, margin + 5, y); y += 5;
    doc.text(`Vorherige Version: ${d.previousVersion}`, margin + 5, y); y += 5;
    doc.text(`Annahme der neuen Version: ${d.vertragsdatum}, ${d.uhrzeit} Uhr`, margin + 5, y);
    doc.setTextColor(0);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
