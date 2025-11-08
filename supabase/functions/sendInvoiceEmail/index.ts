import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceEmailRequest {
  customerEmail: string;
  customerName: string;
  invoicePdfUrl: string;
  companyName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerEmail, customerName, invoicePdfUrl, companyName }: InvoiceEmailRequest = await req.json();

    console.log("[SEND-INVOICE-EMAIL] Sending invoice to:", customerEmail);

    // Download invoice PDF from Stripe
    let invoiceAttachment;
    try {
      const pdfResponse = await fetch(invoicePdfUrl);
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
      
      invoiceAttachment = {
        filename: "Rechnung.pdf",
        content: pdfBase64,
      };
    } catch (error) {
      console.error("[SEND-INVOICE-EMAIL] Error downloading PDF:", error);
      throw new Error("Fehler beim Herunterladen der Rechnung");
    }

    // Prepare legal documents as text attachments
    const agbContent = `Allgemeine Geschäftsbedingungen (AGB) - QRait

1. Geltungsbereich
Diese AGB gelten für alle Verträge zwischen QRait und dem Kunden.

2. Vertragsschluss
Der Vertrag kommt durch Bestätigung der Bestellung zustande.

3. Leistungen
QRait erbringt die vereinbarten Dienstleistungen gemäß Leistungsbeschreibung.

4. Zahlung
Die Zahlung erfolgt per SEPA-Lastschrift oder Kreditkarte gemäß vereinbarter Zahlungsbedingungen.

5. Laufzeit und Kündigung
Der Vertrag hat eine Mindestlaufzeit von 12 Monaten und verlängert sich automatisch um weitere 12 Monate, sofern nicht mit einer Frist von 3 Monaten zum Ende der Laufzeit gekündigt wird.

6. Haftung
Die Haftung richtet sich nach den gesetzlichen Bestimmungen.

7. Datenschutz
Wir verarbeiten personenbezogene Daten gemäß DSGVO.

Stand: ${new Date().toLocaleDateString("de-DE")}`;

    const datenschutzContent = `Datenschutzerklärung - QRait

1. Verantwortlicher
QRait ist verantwortlich für die Verarbeitung Ihrer personenbezogenen Daten.

2. Erhobene Daten
Wir erheben folgende Daten: Name, E-Mail, Firmenname, Adresse, Zahlungsinformationen.

3. Zweck der Verarbeitung
Die Datenverarbeitung erfolgt zur Vertragserfüllung und Kundenbetreuung.

4. Rechtsgrundlage
Die Verarbeitung erfolgt auf Basis von Art. 6 Abs. 1 lit. b DSGVO.

5. Speicherdauer
Daten werden für die Dauer der Geschäftsbeziehung und gesetzliche Aufbewahrungsfristen gespeichert.

6. Ihre Rechte
Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch.

7. Kontakt
Datenschutzanfragen: datenschutz@qrait.de

Stand: ${new Date().toLocaleDateString("de-DE")}`;

    const widerrufsbelehrungContent = `Widerrufsbelehrung - QRait

Widerrufsrecht

Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.

Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.

Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
QRait
E-Mail: info@qrait.de

mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren.

Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.

Folgen des Widerrufs

Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.

Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.

Stand: ${new Date().toLocaleDateString("de-DE")}`;

    const emailResponse = await resend.emails.send({
      from: "QRait <noreply@qrait.de>",
      to: [customerEmail],
      subject: "Ihre Rechnung von QRait",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Vielen Dank für Ihre Zahlung!</h1>
          
          <p>Hallo ${customerName}${companyName ? ` (${companyName})` : ""},</p>
          
          <p>vielen Dank für Ihre Zahlung. Im Anhang finden Sie Ihre Rechnung sowie unsere rechtlichen Dokumente:</p>
          
          <ul>
            <li>Rechnung (PDF)</li>
            <li>Allgemeine Geschäftsbedingungen (AGB)</li>
            <li>Datenschutzerklärung</li>
            <li>Widerrufsbelehrung</li>
          </ul>
          
          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          
          <p style="margin-top: 30px;">
            Mit freundlichen Grüßen<br>
            <strong>Ihr QRait Team</strong>
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="font-size: 12px; color: #666;">
            QRait<br>
            E-Mail: info@qrait.de<br>
            Web: www.qrait.de
          </p>
        </div>
      `,
      attachments: [
        invoiceAttachment,
        {
          filename: "AGB.txt",
          content: btoa(agbContent),
        },
        {
          filename: "Datenschutzerklaerung.txt",
          content: btoa(datenschutzContent),
        },
        {
          filename: "Widerrufsbelehrung.txt",
          content: btoa(widerrufsbelehrungContent),
        },
      ],
    });

    console.log("[SEND-INVOICE-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[SEND-INVOICE-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
