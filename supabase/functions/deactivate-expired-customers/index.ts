import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[DEACTIVATE-EXPIRED] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    log("Function started");

    // Candidates: cancelled customers that are still active=true
    const { data: candidates, error: fetchError } = await supabase
      .from("customers")
      .select("id, name, company_name, email, stripe_subscription_id, cancelled_at, active, status")
      .eq("status", "canceled")
      .eq("active", true);

    if (fetchError) throw fetchError;
    log("Candidates fetched", { count: candidates?.length ?? 0 });

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ message: "No candidates", deactivated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deactivated: Array<{ id: string; name: string; reason: string }> = [];
    const skipped: Array<{ id: string; name: string; reason: string }> = [];
    const nowMs = Date.now();

    for (const c of candidates) {
      try {
        let periodEndMs: number | null = null;
        let reason = "";

        if (c.stripe_subscription_id) {
          // Source of truth: Stripe current_period_end
          const sub = await stripe.subscriptions.retrieve(c.stripe_subscription_id);
          const periodEnd =
            (sub as any).current_period_end ||
            sub.items?.data?.[0]?.current_period_end ||
            null;

          if (periodEnd) {
            periodEndMs = periodEnd * 1000;
            reason = `stripe_period_end=${new Date(periodEndMs).toISOString()}`;
          }

          // If Stripe already says the subscription is canceled/incomplete_expired -> deactivate
          if (
            sub.status === "canceled" ||
            sub.status === "incomplete_expired" ||
            sub.status === "unpaid"
          ) {
            periodEndMs = periodEndMs ?? nowMs - 1;
            reason = `stripe_status=${sub.status}`;
          }
        } else if (c.cancelled_at) {
          // Fallback if no Stripe subscription linked: 1 month after cancelled_at
          const cancelledMs = new Date(c.cancelled_at).getTime();
          periodEndMs = cancelledMs + 30 * 24 * 60 * 60 * 1000;
          reason = `fallback_cancelled_at+30d=${new Date(periodEndMs).toISOString()}`;
        }

        if (periodEndMs === null) {
          skipped.push({ id: c.id, name: c.name, reason: "no_period_end_available" });
          continue;
        }

        if (periodEndMs > nowMs) {
          skipped.push({
            id: c.id,
            name: c.name,
            reason: `still_in_paid_period_until_${new Date(periodEndMs).toISOString()}`,
          });
          continue;
        }

        // Deactivate
        const { error: updateError } = await supabase
          .from("customers")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("id", c.id);

        if (updateError) {
          log("Failed to deactivate", { id: c.id, error: updateError.message });
          continue;
        }

        deactivated.push({ id: c.id, name: c.name, reason });
        log("Deactivated", { id: c.id, name: c.name, reason });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("Error processing customer", { id: c.id, error: msg });
        skipped.push({ id: c.id, name: c.name, reason: `error:${msg}` });
      }
    }

    log("Done", { deactivated: deactivated.length, skipped: skipped.length });

    return new Response(
      JSON.stringify({
        message: `Deactivated ${deactivated.length} customers`,
        deactivated,
        skipped,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("FATAL", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
