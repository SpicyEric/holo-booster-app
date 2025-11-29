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

// Default URLs (can be overridden per call)
const DEFAULT_PRIVACY_URL = "https://eloyo.de/datenschutz";
const DEFAULT_TERMS_URL = "https://eloyo.de/agb";

interface MerchantOnboardingOptions {
  to: string;
  companyName: string;
  contactName?: string;
  contractUrl?: string;
  invoiceUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  passwordSetupUrl: string;
  customerId?: string; // For idempotency tracking
}

/**
 * Generates a professional HTML email template for merchant onboarding
 */
function generateOnboardingEmailHtml(options: MerchantOnboardingOptions): string {
  const {
    companyName,
    contactName,
    contractUrl,
    invoiceUrl,
    privacyUrl = DEFAULT_PRIVACY_URL,
    termsUrl = DEFAULT_TERMS_URL,
    passwordSetupUrl,
  } = options;

  const greeting = contactName 
    ? `Hallo ${contactName}` 
    : `Hallo ${companyName}`;

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei Eloyo</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                Willkommen bei Eloyo! 🎉
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Ihr digitales Kundenbindungssystem
              </p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                ${greeting},
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                herzlichen Glückwunsch! Ihr Eloyo-Konto für <strong>${companyName}</strong> wurde erfolgreich eingerichtet. 
                Wir freuen uns, Sie als Partner begrüßen zu dürfen!
              </p>
              
              <p style="margin: 0 0 30px; color: #374151; font-size: 16px;">
                Um Ihr Merchant-Dashboard zu nutzen, richten Sie bitte zuerst Ihr Passwort ein:
              </p>
              
              <!-- Primary CTA Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 30px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${passwordSetupUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      🔑 Passwort festlegen
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                <em>Dieser Link ist 24 Stunden gültig.</em>
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <!-- Important Links Section -->
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 600;">
                📋 Wichtige Dokumente
              </h2>
              
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                ${contractUrl ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                    <a href="${contractUrl}" style="color: #6366f1; text-decoration: none; font-size: 15px;">
                      📄 Vertrag ansehen
                    </a>
                  </td>
                </tr>
                ` : ''}
                ${invoiceUrl ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                    <a href="${invoiceUrl}" style="color: #6366f1; text-decoration: none; font-size: 15px;">
                      🧾 Erste Rechnung
                    </a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                    <a href="${termsUrl}" style="color: #6366f1; text-decoration: none; font-size: 15px;">
                      📜 Allgemeine Geschäftsbedingungen (AGB)
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <a href="${privacyUrl}" style="color: #6366f1; text-decoration: none; font-size: 15px;">
                      🔒 Datenschutzerklärung
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <!-- What's Next Section -->
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 18px; font-weight: 600;">
                🚀 Nächste Schritte
              </h2>
              
              <ol style="margin: 0 0 20px; padding-left: 20px; color: #374151; font-size: 15px;">
                <li style="margin-bottom: 10px;">Passwort festlegen (Link oben)</li>
                <li style="margin-bottom: 10px;">Im Merchant-Dashboard anmelden</li>
                <li style="margin-bottom: 10px;">Ihr Geschäftsprofil vervollständigen</li>
                <li style="margin-bottom: 10px;">Ihre Starterbox auspacken & Box-ID eingeben</li>
                <li>Kunden sammeln & Loyalität aufbauen!</li>
              </ol>
              
              <p style="margin: 30px 0 0; color: #374151; font-size: 16px;">
                Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung.
              </p>
              
              <p style="margin: 20px 0 0; color: #374151; font-size: 16px;">
                Herzliche Grüße,<br>
                <strong>Ihr Eloyo Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                      <strong>Eloyo</strong> - Digitale Kundenbindung leicht gemacht
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                      E-Mail: <a href="mailto:support@eloyo.de" style="color: #6366f1; text-decoration: none;">support@eloyo.de</a>
                    </p>
                  </td>
                </tr>
              </table>
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

    console.log("[SEND-MERCHANT-ONBOARDING] Sending onboarding email to:", options.to);
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
        console.log("[SEND-MERCHANT-ONBOARDING] Email already sent at:", customer.onboarding_email_sent_at);
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
      subject: `Willkommen bei Eloyo, ${options.companyName}! 🎉`,
      html: htmlContent,
    });

    console.log("[SEND-MERCHANT-ONBOARDING] Email sent successfully:", emailResponse);

    // Update idempotency timestamp if customerId provided
    if (options.customerId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabase
        .from("customers")
        .update({ onboarding_email_sent_at: new Date().toISOString() })
        .eq("id", options.customerId);

      console.log("[SEND-MERCHANT-ONBOARDING] Idempotency timestamp updated for customer:", options.customerId);
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
