import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
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

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    logStep("Admin authenticated", { userId: user.id });

    const { customerId } = await req.json();
    if (!customerId) throw new Error("Customer ID required");

    // Get customer with subscription ID
    const { data: customer } = await supabaseClient
      .from("customers")
      .select("id, stripe_subscription_id, stripe_customer_id, name, company_name, email")
      .eq("id", customerId)
      .single();

    if (!customer) {
      throw new Error("Customer not found");
    }

    const subscriptionId = customer.stripe_subscription_id;
    if (!subscriptionId) {
      throw new Error("No active subscription found for this customer");
    }

    logStep("Subscription found", { subscriptionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Cancel the subscription at period end (merchant stays visible until paid period expires)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    const periodEnd = (subscription as any).current_period_end 
      || subscription.items?.data?.[0]?.current_period_end 
      || null;
    const cancelDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

    logStep("Subscription set to cancel at period end", { 
      subscriptionId,
      status: subscription.status,
      cancelAt: cancelDate,
    });

    // Update customer status but keep active until period end
    await supabaseClient
      .from("customers")
      .update({ 
        status: "canceled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", customerId);

    logStep("Customer status updated to canceled (remains visible until period end)");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Subscription cancelled successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});