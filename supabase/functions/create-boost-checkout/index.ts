import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIERS: Record<string, { price_id: string; days: number; label: string }> = {
  "3_days": { price_id: "price_1TD1UrBhiBjCX9PmuXQvhp5n", days: 3, label: "3 Tage" },
  "7_days": { price_id: "price_1TD1UsBhiBjCX9PmxRinidjl", days: 7, label: "7 Tage" },
  "14_days": { price_id: "price_1TD1UtBhiBjCX9PmSeNj6l5B", days: 14, label: "14 Tage" },
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
    if (!user?.email) throw new Error("Not authenticated");

    // Get merchant's customer_id
    const { data: assignment } = await supabaseClient
      .from("merchant_assignments")
      .select("customer_id")
      .eq("merchant_user_id", user.id)
      .single();

    if (!assignment) throw new Error("No merchant assignment found");

    const { tier } = await req.json();
    const tierConfig = TIERS[tier];
    if (!tierConfig) throw new Error("Invalid tier: " + tier);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Create boost record (pending)
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + tierConfig.days);

    const { data: boost, error: boostError } = await supabaseClient
      .from("merchant_boosts")
      .insert({
        merchant_customer_id: assignment.customer_id,
        tier,
        duration_days: tierConfig.days,
        ends_at: endsAt.toISOString(),
        status: "pending",
        created_by_user_id: user.id,
      })
      .select("id")
      .single();

    if (boostError) throw boostError;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: tierConfig.price_id, quantity: 1 }],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/kunde/nachrichten?boost=success&boost_id=${boost.id}`,
      cancel_url: `${req.headers.get("origin")}/kunde/nachrichten?boost=cancelled`,
      metadata: {
        boost_id: boost.id,
        merchant_customer_id: assignment.customer_id,
        tier,
      },
    });

    // Update boost with checkout session id
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await adminClient
      .from("merchant_boosts")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", boost.id);

    return new Response(
      JSON.stringify({ url: session.url, boost_id: boost.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating boost checkout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
