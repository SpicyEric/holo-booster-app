import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Package definitions with Stripe IDs
const PACKAGES = {
  basic: {
    name: "QRait Basic",
    price_id: "price_1SRta7BhiBjCX9PmfweOTPSv",
    product_id: "prod_TOgyVQ3CkcG0Pa",
    amount: 4400,
  },
  plus: {
    name: "QRait Plus",
    price_id: "price_1SRtcCBhiBjCX9PmtBPMf6vC",
    product_id: "prod_TOh0lqNps6gZ7d",
    amount: 4900,
  },
  pro: {
    name: "QRait Pro",
    price_id: "price_1SRteDBhiBjCX9PmycqkZF9V",
    product_id: "prod_TOh2uSo2D3V1PY",
    amount: 5900,
  }
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

    // Get request body
    const { targetPackage } = await req.json();
    if (!targetPackage || !PACKAGES[targetPackage as keyof typeof PACKAGES]) {
      throw new Error("Invalid target package");
    }
    logStep("Target package", { targetPackage });

    const newPackage = PACKAGES[targetPackage as keyof typeof PACKAGES];

    // Get customer record with subscription ID
    const { data: customerUser } = await supabaseClient
      .from("customer_users")
      .select("customer_id, customers(id, stripe_subscription_id, stripe_customer_id, name)")
      .eq("user_id", user.id)
      .single();

    if (!customerUser) {
      throw new Error("No customer record found for this user");
    }

    const customer = customerUser.customers as any;
    const subscriptionId = customer.stripe_subscription_id;
    
    if (!subscriptionId) {
      throw new Error("No active subscription found");
    }

    logStep("Customer found", { customerId: customer.id, subscriptionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    logStep("Current subscription retrieved", { 
      id: subscription.id, 
      status: subscription.status,
      items: subscription.items.data.length 
    });

    // Get the first subscription item
    const currentItem = subscription.items.data[0];
    const currentPriceId = currentItem.price.id;

    // Check if already on target package
    if (currentPriceId === newPackage.price_id) {
      throw new Error("You are already on this package");
    }

    logStep("Upgrading subscription", { 
      from: currentPriceId, 
      to: newPackage.price_id 
    });

    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: currentItem.id,
          price: newPackage.price_id,
        },
      ],
      proration_behavior: 'always_invoice',
    });

    logStep("Subscription updated", { 
      subscriptionId: updatedSubscription.id,
      newPrice: newPackage.price_id,
      status: updatedSubscription.status
    });

    // Update customer record in database
    const { error: updateError } = await supabaseClient
      .from("customers")
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq("id", customer.id);

    if (updateError) {
      logStep("Warning: Could not update customer record", { error: updateError.message });
    }

    return new Response(JSON.stringify({ 
      success: true,
      package: targetPackage,
      packageName: newPackage.name,
      amount: newPackage.amount,
      subscriptionId: updatedSubscription.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in upgrade-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
