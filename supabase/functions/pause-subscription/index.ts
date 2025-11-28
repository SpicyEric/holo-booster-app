import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAUSE-SUBSCRIPTION] ${step}${detailsStr}`);
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

    // Parse request body for pause duration
    const { pauseMonths = 1 } = await req.json().catch(() => ({ pauseMonths: 1 }));
    
    // Validate pause duration (max 2 months)
    const validPauseMonths = Math.min(Math.max(1, pauseMonths), 2);
    logStep("Pause duration", { pauseMonths: validPauseMonths });

    // Get customer record with subscription ID
    const { data: customerUser } = await supabaseClient
      .from("customer_users")
      .select("customer_id, customers(id, stripe_subscription_id, name, company_name, email, status)")
      .eq("user_id", user.id)
      .single();

    if (!customerUser) {
      throw new Error("No customer record found for this user");
    }

    const customerData = customerUser.customers as any;
    const subscriptionId = customerData?.stripe_subscription_id;
    if (!subscriptionId) {
      throw new Error("No active subscription found");
    }

    logStep("Subscription found", { subscriptionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Calculate resume date (1 or 2 months from now)
    const resumeDate = new Date();
    resumeDate.setMonth(resumeDate.getMonth() + validPauseMonths);
    const resumesAt = Math.floor(resumeDate.getTime() / 1000);

    // Pause the subscription using pause_collection
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'void', // Don't invoice during pause
        resumes_at: resumesAt,
      },
    });
    
    logStep("Subscription paused", { 
      subscriptionId,
      resumesAt: new Date(resumesAt * 1000).toISOString(),
      pauseMonths: validPauseMonths
    });

    // Update customer status in database
    await supabaseClient
      .from("customers")
      .update({ 
        status: 'paused',
      })
      .eq("id", customerData.id);

    logStep("Customer status updated to paused");

    return new Response(JSON.stringify({ 
      success: true,
      resumesAt: new Date(resumesAt * 1000).toISOString(),
      pauseMonths: validPauseMonths
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in pause-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
