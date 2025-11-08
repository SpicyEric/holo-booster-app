import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
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
      .select("customer_id, customers(stripe_subscription_id, name, company_name, email)")
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

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    logStep("Subscription cancelled", { 
      subscriptionId,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null
    });

    // Send admin notification about manual cancellation
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail && customerData) {
      try {
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
        await resend.emails.send({
          from: 'QRAIT <onboarding@resend.dev>',
          to: [adminEmail],
          subject: '⚠️ Kunde hat manuell gekündigt',
          html: `
            <h2>Manuelle Kündigung durch Kunde</h2>
            <p><strong>Kunde:</strong> ${customerData.name || customerData.company_name || 'Unbekannt'}</p>
            <p><strong>E-Mail:</strong> ${customerData.email}</p>
            <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
            <p><strong>Kündigungsdatum:</strong> ${subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toLocaleString('de-DE') : 'Sofort'}</p>
            <p><em>Der Kunde hat die Kündigung selbst über das Kundendashboard durchgeführt.</em></p>
          `,
        });
        logStep("Admin notification sent");
      } catch (emailError) {
        logStep("Failed to send admin notification", { error: emailError instanceof Error ? emailError.message : String(emailError) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cancel-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
