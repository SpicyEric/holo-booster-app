import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  customerName: string;
  offerText: string;
  unsubscribeToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, customerName, offerText, unsubscribeToken }: EmailRequest = await req.json();

    const unsubscribeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/deleteContactByToken?token=${unsubscribeToken}`;

    const emailResponse = await resend.emails.send({
      from: "QR-Loyalty <onboarding@resend.dev>",
      to: [email],
      subject: `Vielen Dank für deine Unterstützung bei ${customerName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Vielen Dank! 🎉</h1>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Wir freuen uns sehr über deine Unterstützung und hoffen, dass dir dein Geschenk gefällt:
          </p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 20px; 
                      border-radius: 10px; 
                      margin: 20px 0;
                      text-align: center;">
            <strong style="font-size: 18px;">${offerText}</strong>
          </div>
          
          <p style="font-size: 16px; color: #555; line-height: 1.6;">
            Wir würden uns freuen, dich bald wieder bei uns begrüßen zu dürfen! 
            Falls wir in Zukunft coole Angebote oder Aktionen haben, halten wir dich gerne auf dem Laufenden.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <p style="font-size: 14px; color: #888; line-height: 1.6;">
            Du möchtest keine weiteren Nachrichten mehr erhalten oder deine Daten aus unserem System entfernen? 
            <a href="${unsubscribeUrl}" style="color: #667eea; text-decoration: none;">
              Klicke hier zum Abmelden
            </a>
          </p>
          
          <p style="font-size: 12px; color: #aaa; margin-top: 20px;">
            Diese E-Mail wurde automatisch generiert. Deine Daten sind bei uns sicher gespeichert und 
            werden nur für Marketingzwecke von ${customerName} verwendet.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in sendConfirmationEmail function:", error);
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
