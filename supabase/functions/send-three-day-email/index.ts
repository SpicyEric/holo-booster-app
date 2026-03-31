import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = "support@eloyo.de";
const FROM_NAME = "Eloyo Team";
const SENDER = `${FROM_NAME} <${FROM_EMAIL}>`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find merchants active/abgeschlossen for 3+ days, not yet emailed
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: merchants, error: fetchError } = await supabase
      .from("customers")
      .select("id, name, contact_person, contact_person_email, email, created_at")
      .in("status", ["active", "abgeschlossen"])
      .is("three_day_email_sent_at", null)
      .lte("created_at", threeDaysAgo)
      .limit(50);

    if (fetchError) {
      console.error("[3-DAY-EMAIL] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!merchants || merchants.length === 0) {
      console.log("[3-DAY-EMAIL] No merchants to email.");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const merchant of merchants) {
      const recipientEmail = merchant.contact_person_email || merchant.email;
      if (!recipientEmail) {
        console.log(`[3-DAY-EMAIL] No email for merchant ${merchant.id}, skipping.`);
        continue;
      }

      const recipientName = merchant.contact_person || merchant.name;

      // Count total stamps given by this merchant
      const { count: stampCount } = await supabase
        .from("point_transactions")
        .select("id", { count: "exact", head: true })
        .eq("merchant_customer_id", merchant.id)
        .eq("transaction_type", "nfc_stamp");

      const stamps = stampCount ?? 0;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
              Dein Stammkundennetzwerk wächst 🌱
            </h1>
          </div>
          
          <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Hey ${recipientName},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              eloyo läuft jetzt seit drei Tagen bei dir und deine Kunden haben ihn bereits <strong>${stamps}-mal</strong> genutzt.
            </p>

            <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <p style="margin: 0; color: #374151; font-size: 18px; font-weight: 600;">
                Das ist dein Fundament.
              </p>
              <p style="margin: 10px 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Jeder dieser <strong>${stamps} Stempel</strong> ist jetzt in deinem System.
              </p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Du hast den wichtigsten Schritt gemacht. Jetzt wächst dein Stammkundennetzwerk mit dir mit. Jeden Tag ein bisschen weiter.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #374151; font-size: 15px; margin-top: 20px;">
              Herzliche Grüße,<br/>
              <strong>Dein eloyo-Team</strong>
            </p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="margin: 0; color: #9ca3af; font-size: 13px;">
              E-Mail: <a href="mailto:support@eloyo.de" style="color: #6366f1; text-decoration: none;">support@eloyo.de</a>
            </p>
          </div>
        </div>
      `;

      try {
        await resend.emails.send({
          from: SENDER,
          to: [recipientEmail],
          subject: `${recipientName}, dein Stammkundennetzwerk wächst!`,
          html,
        });

        // Mark as sent
        await supabase
          .from("customers")
          .update({ three_day_email_sent_at: new Date().toISOString() })
          .eq("id", merchant.id);

        sentCount++;
        console.log(`[3-DAY-EMAIL] Sent to ${recipientEmail} for merchant ${merchant.id}`);
      } catch (emailErr) {
        console.error(`[3-DAY-EMAIL] Failed for ${merchant.id}:`, emailErr);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[3-DAY-EMAIL] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
