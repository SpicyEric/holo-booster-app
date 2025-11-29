import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email configuration
const FROM_EMAIL = "support@eloyo.de";
const FROM_NAME = "Eloyo Team";
const SENDER = `${FROM_NAME} <${FROM_EMAIL}>`;

// Default URLs
const DEFAULT_AGB_URL = "https://eloyo.de/agb";
const DEFAULT_PRIVACY_URL = "https://eloyo.de/datenschutz";
const DEFAULT_TERMS_URL = "https://eloyo.de/nutzungsbedingungen";
const DEFAULT_IMPRESSUM_URL = "https://eloyo.de/impressum";

interface MerchantOnboardingOptions {
  to: string;
  companyName: string;
  contactName?: string;
  // Contract info
  productName?: string;
  pricePerMonth?: string;
  nextBillingDate?: string;
  // URLs
  passwordSetupUrl: string;
  invoiceUrl?: string;
  agbUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  impressumUrl?: string;
  // Idempotency
  customerId?: string;
}

/**
 * Generates a lean, professional HTML email template for merchant onboarding
 * Following the exact structure: Legal + Technical + Operational
 */
function generateOnboardingEmailHtml(options: MerchantOnboardingOptions): string {
  const {
    companyName,
    contactName,
    productName = "Eloyo Abo",
    pricePerMonth = "49,45 € / Monat",
    nextBillingDate,
    passwordSetupUrl,
    invoiceUrl,
    agbUrl = DEFAULT_AGB_URL,
    privacyUrl = DEFAULT_PRIVACY_URL,
    termsUrl = DEFAULT_TERMS_URL,
    impressumUrl = DEFAULT_IMPRESSUM_URL,
  } = options;

  const greeting = contactName || companyName;
  const billingDateText = nextBillingDate 
    ? `Nächste Abbuchung am: <strong>${nextBillingDate}</strong>` 
    : "Abbuchung: monatlich";

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei Eloyo</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6; color: #374151;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">
                Willkommen bei Eloyo
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 15px;">
                Ihr Zugang ist jetzt aktiv
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Intro -->
              <p style="margin: 0 0 25px; font-size: 16px;">
                Hi ${greeting},<br>
                stark, dass Sie sich für Eloyo entschieden haben. Ihr Standort ist jetzt bereit, digital durchzustarten – von Kundenbindung bis Stammpunkte-Automation.
              </p>
              
              <!-- 🔐 Account Access -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #1f2937;">
                🔐 Ihr Zugang
              </h2>
              <p style="margin: 0 0 20px; font-size: 15px;">
                Aktivieren Sie jetzt Ihr Dashboard und vergeben Sie Ihr Passwort:
              </p>
              
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${passwordSetupUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      👉 Passwort festlegen
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 30px; font-size: 14px; color: #6b7280;">
                Damit haben Sie sofort Zugriff auf: Stammpunkt-System, Kundenstatistiken, Filial-Setup, Teamzugänge & Marketing-Tools.
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <!-- 🚀 First Steps -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #1f2937;">
                🚀 Erste Schritte
              </h2>
              <p style="margin: 0 0 15px; font-size: 15px;">
                Damit Sie sofort live gehen können:
              </p>
              <ol style="margin: 0 0 30px; padding-left: 20px; font-size: 15px;">
                <li style="margin-bottom: 8px;">Geschäftsdaten vervollständigen</li>
                <li style="margin-bottom: 8px;">Stempelkarte anpassen</li>
                <li style="margin-bottom: 8px;">NFC-Stempel testen</li>
                <li style="margin-bottom: 8px;">Kunden einladen</li>
              </ol>
              <p style="margin: 0 0 30px; font-size: 14px; color: #6b7280;">
                Ihr Dashboard führt Sie Step-by-Step durch alles durch.
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <!-- 📄 Contract Info -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #1f2937;">
                📄 Vertragsinformationen
              </h2>
              <p style="margin: 0 0 10px; font-size: 15px;">
                Hier die Eckdaten zu Ihrem Abo:
              </p>
              <table role="presentation" style="width: 100%; margin-bottom: 15px; font-size: 15px;">
                <tr>
                  <td style="padding: 6px 0; width: 140px; color: #6b7280;">Produkt:</td>
                  <td style="padding: 6px 0;"><strong>${productName}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Preis:</td>
                  <td style="padding: 6px 0;"><strong>${pricePerMonth}</strong> inkl. MwSt.</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Abrechnung:</td>
                  <td style="padding: 6px 0;">monatlich</td>
                </tr>
                ${nextBillingDate ? `
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Nächste Abbuchung:</td>
                  <td style="padding: 6px 0;">${nextBillingDate}</td>
                </tr>
                ` : ''}
              </table>
              <p style="margin: 0 0 30px; font-size: 14px; color: #6b7280;">
                Kündigung jederzeit möglich zum Ende des Abrechnungszeitraums über das Dashboard oder unsere Website.
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <!-- 📘 Legal Links -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #1f2937;">
                📘 Rechtliches & Unterlagen
              </h2>
              <p style="margin: 0 0 10px; font-size: 15px;">
                Für Ihre Unterlagen:
              </p>
              <table role="presentation" style="width: 100%; margin-bottom: 20px; font-size: 15px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <a href="${agbUrl}" style="color: #6366f1; text-decoration: none;">AGB</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <a href="${privacyUrl}" style="color: #6366f1; text-decoration: none;">Datenschutzerklärung</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <a href="${termsUrl}" style="color: #6366f1; text-decoration: none;">Nutzungsbedingungen</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <a href="${impressumUrl}" style="color: #6366f1; text-decoration: none;">Impressum</a>
                  </td>
                </tr>
                ${invoiceUrl ? `
                <tr>
                  <td style="padding: 8px 0;">
                    <a href="${invoiceUrl}" style="color: #6366f1; text-decoration: none;">Ihre Rechnung</a>
                  </td>
                </tr>
                ` : ''}
              </table>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <!-- 🤝 Support -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #1f2937;">
                🤝 Support
              </h2>
              <p style="margin: 0 0 30px; font-size: 15px;">
                Wenn Sie Unterstützung brauchen:<br>
                <a href="mailto:support@eloyo.de" style="color: #6366f1; text-decoration: none;">support@eloyo.de</a> oder direkt über das Dashboard.
              </p>
              
              <!-- Closing -->
              <p style="margin: 0; font-size: 16px;">
                Wir freuen uns auf die Zusammenarbeit.<br>
                <strong>Ihr Eloyo Team</strong>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                Eloyo – Digitale Kundenbindung leicht gemacht
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const options: MerchantOnboardingOptions = await req.json();
    
    // Validate required fields
    if (!options.to) {
      throw new Error("Missing required field: to (email address)");
    }
    if (!options.companyName) {
      throw new Error("Missing required field: companyName");
    }
    if (!options.passwordSetupUrl) {
      throw new Error("Missing required field: passwordSetupUrl");
    }

    console.log("[SEND-MERCHANT-ONBOARDING] Sending to:", options.to);
    console.log("[SEND-MERCHANT-ONBOARDING] Company:", options.companyName);

    // Check idempotency if customerId provided
    if (options.customerId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: customer } = await supabase
        .from("customers")
        .select("onboarding_email_sent_at")
        .eq("id", options.customerId)
        .single();

      if (customer?.onboarding_email_sent_at) {
        console.log("[SEND-MERCHANT-ONBOARDING] Already sent at:", customer.onboarding_email_sent_at);
        return new Response(
          JSON.stringify({ 
            success: true, 
            skipped: true, 
            reason: "Email already sent",
            sent_at: customer.onboarding_email_sent_at 
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Generate HTML content
    const htmlContent = generateOnboardingEmailHtml(options);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: SENDER,
      to: [options.to],
      subject: "Willkommen bei Eloyo – Ihr Zugang ist jetzt aktiv",
      html: htmlContent,
    });

    console.log("[SEND-MERCHANT-ONBOARDING] Email sent:", emailResponse);

    // Update idempotency timestamp
    if (options.customerId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabase
        .from("customers")
        .update({ onboarding_email_sent_at: new Date().toISOString() })
        .eq("id", options.customerId);

      console.log("[SEND-MERCHANT-ONBOARDING] Idempotency timestamp updated");
    }

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[SEND-MERCHANT-ONBOARDING] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
