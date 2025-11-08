import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerEmail, customerName, resetLink } = await req.json();

    console.log("[SEND-WELCOME-EMAIL] Sending welcome email to:", customerEmail);

    const emailResponse = await resend.emails.send({
      from: "QRait <onboarding@resend.dev>",
      to: [customerEmail],
      subject: "Willkommen bei QRait - Ihr Dashboard-Zugang",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Willkommen bei QRait, ${customerName}!</h1>
          
          <p>Vielen Dank für Ihr Vertrauen! Ihre Zahlung wurde erfolgreich abgeschlossen.</p>
          
          <h2 style="color: #555;">Ihr Dashboard-Zugang</h2>
          <p>Über Ihr persönliches Dashboard können Sie:</p>
          <ul>
            <li>Ihre Rechnungen einsehen und herunterladen</li>
            <li>Zahlungsdaten verwalten</li>
            <li>QR-Codes und Designs herunterladen</li>
            <li>Ihr Abonnement verwalten</li>
          </ul>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>So richten Sie Ihr Passwort ein:</strong></p>
            <a href="${resetLink}" 
               style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Passwort festlegen
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Hinweis:</strong> Dieser Link ist 24 Stunden gültig. Nach dem Festlegen Ihres Passworts können Sie sich jederzeit unter 
            <a href="${Deno.env.get("SUPABASE_URL")}/auth/v1/verify">Ihrem Dashboard</a> anmelden.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
          
          <p style="color: #666; font-size: 12px;">
            Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br/>
            Ihr QRait Team
          </p>
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
