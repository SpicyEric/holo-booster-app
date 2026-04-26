import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Sendet eine Push-Benachrichtigung an den EINLADENDEN, sobald
 * der Eingeladene die Einladung angenommen hat.
 *
 * Bug-Fix Bug 1: Retry-Mechanismus mit exponential backoff,
 * damit die Push-Notification zuverlässig ankommt.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const invitationId: string | undefined = body?.invitation_id;
    let merchantCustomerId: string | undefined = body?.merchant_customer_id;

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: "Missing invitation_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: invitation, error: invErr } = await supabase
      .from("invitations")
      .select("id, inviter_user_id, merchant_customer_id")
      .eq("id", invitationId)
      .single();

    if (invErr || !invitation) {
      console.warn("[notify-invitation-accepted] invitation not found", invErr);
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    merchantCustomerId = merchantCustomerId ?? invitation.merchant_customer_id;

    const { data: merchant } = await supabase
      .from("customers")
      .select("name, company_name")
      .eq("id", merchantCustomerId)
      .single();

    const merchantName =
      merchant?.company_name || merchant?.name || "einem Geschäft";

    const title = `🎉 Deine Einladung wurde angenommen!`;
    const bodyText =
      `Jemand hat deine Einladung zu ${merchantName} angenommen. ` +
      `Sobald der erste Stempel gesammelt wird, erhältst du deinen Bonus.`;

    // Bug 1 Fix: Retry mit exponential backoff (3 Versuche: 0ms, 1s, 3s)
    const sendWithRetry = async (): Promise<{ ok: boolean; result: unknown; attempts: number }> => {
      const delays = [0, 1000, 3000];
      let lastResult: unknown = null;
      for (let attempt = 0; attempt < delays.length; attempt++) {
        if (delays[attempt] > 0) await sleep(delays[attempt]);
        try {
          const pushRes = await fetch(
            `${supabaseUrl}/functions/v1/send-push-notification`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({
                user_id: invitation.inviter_user_id,
                title,
                body: bodyText,
                data: {
                  type: "invitation_accepted",
                  invitation_id: invitation.id,
                  merchant_customer_id: merchantCustomerId,
                },
              }),
            },
          );
          const pushJson = await pushRes.json().catch(() => ({}));
          lastResult = pushJson;

          // Erfolg: send-push-notification gibt success:true ODER mindestens 1 erfolgreichen Token zurück
          const successCount = (pushJson as { success_count?: number; success?: boolean })?.success_count;
          const success = (pushJson as { success?: boolean })?.success;
          if (pushRes.ok && (success === true || (typeof successCount === "number" && successCount > 0))) {
            return { ok: true, result: pushJson, attempts: attempt + 1 };
          }
          console.warn(
            `[notify-invitation-accepted] attempt ${attempt + 1} not yet successful:`,
            pushJson,
          );
        } catch (err) {
          console.error(`[notify-invitation-accepted] attempt ${attempt + 1} error`, err);
          lastResult = { error: String(err) };
        }
      }
      return { ok: false, result: lastResult, attempts: delays.length };
    };

    const result = await sendWithRetry();
    console.log("[notify-invitation-accepted] result", result);

    return new Response(
      JSON.stringify({ success: result.ok, push: result.result, attempts: result.attempts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[notify-invitation-accepted] error", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
