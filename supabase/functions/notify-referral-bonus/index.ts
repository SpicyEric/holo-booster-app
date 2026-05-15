import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Sendet Push-Benachrichtigungen an Inviter & Invitee nach erfolgreichem Referral-Bonus.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      inviter_user_id,
      invitee_user_id,
      inviter_points,
      invitee_points,
      merchant_customer_id,
      boosts_granted,
      boosts_pending,
      referral_index,
    } = body ?? {};

    if (!inviter_user_id || !invitee_user_id || !merchant_customer_id) {
      return new Response(
        JSON.stringify({ error: "Missing fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: merchant } = await supabase
      .from("customers")
      .select("name, company_name")
      .eq("id", merchant_customer_id)
      .single();

    const merchantName =
      merchant?.company_name || merchant?.name || "einem Geschäft";

    const sendPush = async (
      userId: string,
      title: string,
      bodyText: string,
    ) => {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/send-push-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              user_id: userId,
              title,
              body: bodyText,
              data: {
                type: "referral_bonus",
                merchant_customer_id,
              },
            }),
          },
        );
        return await res.json().catch(() => ({}));
      } catch (err) {
        console.error("[notify-referral-bonus] push error", err);
        return { error: String(err) };
      }
    };

    // Inviter title/body abhängig von Boost-Anzahl
    const boost = typeof boosts_granted === "number" ? boosts_granted : (inviter_points ?? 1);
    const pending = typeof boosts_pending === "number" ? boosts_pending : 0;

    let inviterTitle = `🚀 Empfehlung erfolgreich!`;
    let inviterBody = `+${boost} Check-in${boost === 1 ? "" : "s"} auf deinem ${merchantName}-Treuepass`;
    if (boost === 2) {
      inviterTitle = `🚀🚀 Empfehlung erfolgreich!`;
    } else if (boost === 3) {
      inviterTitle = `🚀🚀🚀 STREAK!`;
      inviterBody = `+3 Check-ins auf deinem ${merchantName}-Treuepass — dein größter Boost!`;
    }
    if (pending > 0) {
      inviterBody += ` (+${pending} weitere morgen)`;
    }

    const [inviterRes, inviteeRes] = await Promise.all([
      sendPush(inviter_user_id, inviterTitle, inviterBody),
      sendPush(
        invitee_user_id,
        `🎉 Willkommens-Bonus erhalten!`,
        `Du hast bei ${merchantName} +${invitee_points} Bonuspunkte bekommen!`,
      ),
    ]);

    return new Response(
      JSON.stringify({ success: true, inviter: inviterRes, invitee: inviteeRes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[notify-referral-bonus] error", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
