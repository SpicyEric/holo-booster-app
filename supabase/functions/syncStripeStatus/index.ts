import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-STRIPE-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) {
      throw new Error("Unauthorized: Admin access required");
    }
    logStep("Admin access verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get all customers with Stripe IDs
    const { data: customers, error: customersError } = await supabaseClient
      .from("customers")
      .select("id, stripe_customer_id, stripe_subscription_id, status")
      .not("stripe_customer_id", "is", null);

    if (customersError) throw customersError;
    if (!customers || customers.length === 0) {
      logStep("No customers with Stripe IDs found");
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found customers to sync", { count: customers.length });

    const updates = [];

    for (const customer of customers) {
      try {
        let newStatus = "canceled";
        let subscriptionId = customer.stripe_subscription_id;

        // Check for active subscriptions
        if (customer.stripe_subscription_id) {
          const subscription = await stripe.subscriptions.retrieve(
            customer.stripe_subscription_id
          );
          
          if (subscription.status === "active") {
            newStatus = "active";
          } else if (subscription.status === "past_due") {
            newStatus = "past_due";
          } else {
            newStatus = "canceled";
          }
          
          logStep("Subscription checked", {
            customerId: customer.id,
            subscriptionStatus: subscription.status,
            newStatus
          });
        } else {
          // No subscription ID, check if there are any active subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.stripe_customer_id,
            status: "active",
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            subscriptionId = subscriptions.data[0].id;
            newStatus = "active";
            logStep("Found active subscription without ID", {
              customerId: customer.id,
              subscriptionId
            });
          }
        }

        // Only update if status changed
        if (newStatus !== customer.status || (subscriptionId && subscriptionId !== customer.stripe_subscription_id)) {
          const updateData: any = { status: newStatus };
          if (subscriptionId && subscriptionId !== customer.stripe_subscription_id) {
            updateData.stripe_subscription_id = subscriptionId;
          }

          const { error: updateError } = await supabaseClient
            .from("customers")
            .update(updateData)
            .eq("id", customer.id);

          if (updateError) {
            console.error(`[SYNC-STRIPE-STATUS] Error updating customer ${customer.id}:`, updateError);
          } else {
            updates.push({
              customerId: customer.id,
              oldStatus: customer.status,
              newStatus,
            });
            logStep("Customer status updated", {
              customerId: customer.id,
              oldStatus: customer.status,
              newStatus
            });
          }
        }
      } catch (error) {
        console.error(`[SYNC-STRIPE-STATUS] Error processing customer ${customer.id}:`, error);
      }
    }

    logStep("Sync completed", { updatedCount: updates.length });

    return new Response(JSON.stringify({
      updated: updates.length,
      updates
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in syncStripeStatus", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
