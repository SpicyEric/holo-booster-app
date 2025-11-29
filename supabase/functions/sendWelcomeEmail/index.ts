import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email configuration - Eloyo branding
const FROM_EMAIL = "support@eloyo.de";
const FROM_NAME = "Eloyo Team";
const SENDER = `${FROM_NAME} <${FROM_EMAIL}>`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerEmail, customerName, resetLink } = await req.json();

    console.log("[SEND-WELCOME-EMAIL] Sending welcome email to:", customerEmail);

    const emailResponse = await resend.emails.send({
      from: SENDER,
      to: [customerEmail],
      subject: "Willkommen bei Eloyo - Ihr Dashboard-Zugang",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
              Willkommen bei Eloyo, ${customerName}! 🎉
            </h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Vielen Dank für Ihr Vertrauen! Ihr Konto wurde erfolgreich eingerichtet.
            </p>
            
            <h2 style="color: #1f2937; font-size: 18px; margin-top: 30px;">Ihr Dashboard-Zugang</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">Über Ihr persönliches Dashboard können Sie:</p>
            <ul style="color: #374151; font-size: 15px; line-height: 1.8;">
              <li>Ihre Rechnungen einsehen und herunterladen</li>
              <li>Zahlungsdaten verwalten</li>
              <li>Ihr Kundenbindungsprogramm konfigurieren</li>
              <li>Ihr Abonnement verwalten</li>
            </ul>
            
            <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #374151; font-weight: 600;">So richten Sie Ihr Passwort ein:</p>
              <a href="${resetLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                🔑 Passwort festlegen
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Hinweis:</strong> Dieser Link ist 24 Stunden gültig.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #374151; font-size: 15px;">
              Bei Fragen stehen wir Ihnen gerne zur Verfügung.
            </p>
            
            <p style="color: #374151; font-size: 15px; margin-top: 20px;">
              Herzliche Grüße,<br/>
              <strong>Ihr Eloyo Team</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="margin: 0; color: #9ca3af; font-size: 13px;">
              E-Mail: <a href="mailto:support@eloyo.de" style="color: #6366f1; text-decoration: none;">support@eloyo.de</a>
            </p>
          </div>
        </div>
      `,
    });

    console.log("[SEND-WELCOME-EMAIL] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[SEND-WELCOME-EMAIL] Error:", error);
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
