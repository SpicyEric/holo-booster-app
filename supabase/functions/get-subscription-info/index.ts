import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-SUBSCRIPTION-INFO] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get customer record with subscription ID
    const { data: customerUser } = await supabaseClient
      .from("customer_users")
      .select("customer_id, customers(stripe_subscription_id, stripe_customer_id)")
      .eq("user_id", user.id)
      .single();

    if (!customerUser) {
      throw new Error("No customer record found for this user");
    }

    const subscriptionId = (customerUser.customers as any)?.stripe_subscription_id;
    if (!subscriptionId) {
      return new Response(JSON.stringify({ 
        hasSubscription: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Subscription found", { subscriptionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });
    
    const item = subscription.items.data[0];
    const price = item.price;
    const product = price.product as Stripe.Product;

    const subscriptionInfo = {
      hasSubscription: true,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      plan: {
        name: product.name,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
      }
    };
    
    logStep("Subscription info retrieved", subscriptionInfo);

    return new Response(JSON.stringify(subscriptionInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in get-subscription-info", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
