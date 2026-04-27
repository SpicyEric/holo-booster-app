import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Winback Automation:
 * For every active merchant with `winback_enabled = true`, find customers
 * whose LAST stamp at this merchant is exactly older than `winback_inactivity_days`
 * (and not yet notified for that stamp). Send an in-app message + push.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: merchants, error: mErr } = await supabase
      .from("customers")
      .select(
        "id, name, company_name, winback_enabled, winback_message, winback_inactivity_days, winback_gift_type, winback_bonus_points, winback_offer_title, winback_offer_description"
      )
      .eq("winback_enabled", true)
      .eq("active", true);

    if (mErr) throw mErr;

    let totalSent = 0;
    const debug: Array<Record<string, unknown>> = [];

    for (const merchant of merchants ?? []) {
      const days = Math.max(
        7,
        Math.min(365, (merchant as any).winback_inactivity_days ?? 90)
      );
      const merchantName =
        (merchant as any).company_name || (merchant as any).name || "";
      const giftType =
        ((merchant as any).winback_gift_type as
          | "none"
          | "points"
          | "offer") || "none";
      const messageBody =
        (merchant as any).winback_message ||
        "Wir vermissen dich! Schau doch bald wieder bei uns vorbei.";

      // Threshold: last stamp must be older than `days` ago.
      const threshold = new Date(Date.now() - days * 86400_000);
      // To avoid spamming forever-old customers, only consider stamps within
      // the last (days + 14) days window.
      const lowerBound = new Date(
        Date.now() - (days + 14) * 86400_000
      );

      // 1) Get all loyalty accounts for this merchant
      const { data: accounts } = await supabase
        .from("loyalty_accounts")
        .select("id, user_id")
        .eq("merchant_customer_id", merchant.id);

      if (!accounts || accounts.length === 0) continue;

      const accountIds = accounts.map((a) => a.id);
      const accountIdToUser = new Map(
        accounts.map((a) => [a.id, a.user_id])
      );

      // 2) Compute MAX(created_at) per loyalty_account from positive transactions
      // (we treat any positive points_change as a "stamp/visit").
      const { data: txs } = await supabase
        .from("point_transactions")
        .select("loyalty_account_id, created_at")
        .in("loyalty_account_id", accountIds)
        .gt("points_change", 0)
        .gte("created_at", lowerBound.toISOString())
        .lte("created_at", threshold.toISOString())
        .order("created_at", { ascending: false });

      if (!txs || txs.length === 0) continue;

      // Last stamp per account within window
      const lastByAccount = new Map<string, string>();
      for (const t of txs) {
        if (!lastByAccount.has(t.loyalty_account_id)) {
          lastByAccount.set(t.loyalty_account_id, t.created_at as string);
        }
      }

      // For each candidate account, ensure there's NO newer stamp after threshold
      const candidates: Array<{ user_id: string; last_stamp_at: string }> = [];
      for (const [accId, lastStamp] of lastByAccount.entries()) {
        const userId = accountIdToUser.get(accId);
        if (!userId) continue;

        // Check no newer stamp exists (between threshold and now)
        const { data: newer } = await supabase
          .from("point_transactions")
          .select("id")
          .eq("loyalty_account_id", accId)
          .gt("points_change", 0)
          .gt("created_at", threshold.toISOString())
          .limit(1);

        if (newer && newer.length > 0) continue;

        candidates.push({ user_id: userId, last_stamp_at: lastStamp });
      }

      if (candidates.length === 0) continue;

      for (const cand of candidates) {
        // De-dupe via winback_message_log (unique on merchant + user + last_stamp_at)
        const { data: existing } = await supabase
          .from("winback_message_log")
          .select("id")
          .eq("merchant_customer_id", merchant.id)
          .eq("user_id", cand.user_id)
          .eq("last_stamp_at", cand.last_stamp_at)
          .maybeSingle();

        if (existing) continue;

        // Optional: build offer (points or offer)
        let offerId: string | null = null;
        let bodyExtra = "";
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);

        if (giftType === "points") {
          const pts = (merchant as any).winback_bonus_points || 0;
          if (pts > 0) {
            const { data: offerData } = await supabase
              .from("offers")
              .insert({
                merchant_customer_id: merchant.id,
                title: "💜 Willkommen zurück",
                description: `${pts} Bonus-Punkte als Wiedersehensgeschenk`,
                is_active: true,
                show_in_storefront: false,
                valid_until: validUntil.toISOString(),
              })
              .select("id")
              .single();
            if (offerData) offerId = offerData.id;
            bodyExtra = `\n\n🎁 Du bekommst ${pts} Bonus-Punkte als Geschenk – tippe hier, um sie einzulösen.`;
          }
        } else if (giftType === "offer") {
          const offerTitle =
            (merchant as any).winback_offer_title || "Willkommen-zurück-Angebot";
          const offerDesc = (merchant as any).winback_offer_description || null;
          const { data: offerData } = await supabase
            .from("offers")
            .insert({
              merchant_customer_id: merchant.id,
              title: offerTitle,
              description: offerDesc,
              is_active: true,
              show_in_storefront: false,
              valid_until: validUntil.toISOString(),
            })
            .select("id")
            .single();
          if (offerData) offerId = offerData.id;
          bodyExtra = `\n\n🎁 Speziell für dich: ${offerTitle}`;
        }

        const title = "💜 Wir vermissen dich!";

        const { data: msg, error: msgErr } = await supabase
          .from("app_messages")
          .insert({
            merchant_customer_id: merchant.id,
            user_id: cand.user_id,
            title,
            body: `${messageBody}${bodyExtra}`,
            show_in_storefront: false,
            offer_id: offerId,
          } as any)
          .select("id")
          .single();

        if (msgErr) {
          console.error("winback insert message failed:", msgErr);
          continue;
        }

        // Log to prevent re-send for the same last_stamp_at
        await supabase.from("winback_message_log").insert({
          merchant_customer_id: merchant.id,
          user_id: cand.user_id,
          app_message_id: msg.id,
          last_stamp_at: cand.last_stamp_at,
        });

        // Send push notification
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: cand.user_id,
              title: merchantName || title,
              body: messageBody,
              data: {
                type: "message",
                message_id: msg.id,
                merchant_customer_id: merchant.id,
              },
              source: "winback-cron",
              trigger_function: "winback-cron",
            },
          });
        } catch (e) {
          console.error("winback push failed:", e);
        }

        totalSent++;
      }

      debug.push({
        merchant: merchant.id,
        days,
        candidates: candidates.length,
      });
    }

    return new Response(
      JSON.stringify({ message: "Winback processed", sent: totalSent, debug }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("winback-cron error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
