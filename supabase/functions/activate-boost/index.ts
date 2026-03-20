import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { boost_id } = await req.json();
    if (!boost_id) throw new Error("Missing boost_id");

    // Get boost record
    const { data: boost, error: boostError } = await supabaseClient
      .from("merchant_boosts")
      .select("*")
      .eq("id", boost_id)
      .single();

    if (boostError || !boost) throw new Error("Boost not found");
    if (boost.status === "active") {
      return new Response(
        JSON.stringify({ success: true, already_active: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment via Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    if (boost.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(boost.stripe_checkout_session_id);
      if (session.payment_status !== "paid") {
        throw new Error("Payment not completed");
      }
    }

    // Activate: set starts_at to now, ends_at accordingly
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + boost.duration_days);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await adminClient
      .from("merchant_boosts")
      .update({
        status: "active",
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .eq("id", boost_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error activating boost:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
