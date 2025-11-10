import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

interface CheckoutRequest {
  customerName: string;
  customerEmail: string;
  companyName: string; // Now required
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  packageType: 'basic' | 'plus' | 'pro'; // Required package selection
  extraDisplays?: number;
  promoCodes?: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Direct Price IDs (from your Stripe account)
const PRICE_IDS = {
  // Monthly subscriptions
  BASIC_SUBSCRIPTION: "price_1SRta7BhiBjCX9PmfweOTPSv", // 44.00 EUR/month
  PLUS_SUBSCRIPTION: "price_1SRtcCBhiBjCX9PmtBPMf6vC", // 49.00 EUR/month
  PRO_SUBSCRIPTION: "price_1SRteDBhiBjCX9PmycqkZF9V", // 59.00 EUR/month
  
  // Setup fees (one-time)
  SETUP_BASIC: "price_1SRtiYBhiBjCX9Pm8TneAsXw", // 179.00 EUR
  SETUP_PLUS: "price_1SRtjXBhiBjCX9PmF3UqZrq7", // 199.00 EUR
  SETUP_PRO: "price_1SRtksBhiBjCX9PmqMo2nWCz", // 249.00 EUR
  
  // Add-ons
  EXTRA_DISPLAY: "price_1SRtm4BhiBjCX9PmQjTWHTAV", // 6.50 EUR
  CUSTOM_DESIGN: "price_1SRtnnBhiBjCX9PmBWCdJSBw", // 29.95 EUR
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-CHECKOUT] Function started");

    // Use service role key to bypass RLS for admin role check
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    console.log("[CREATE-CHECKOUT] User authenticated:", userData.user.id);

    // Check if user is admin (support multiple roles)
    const { data: roles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    console.log("[CREATE-CHECKOUT] Role check:", { roles, rolesError });

    const isAdmin = Array.isArray(roles) && roles.some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Only admins can create checkout sessions");
    }

    const {
      customerName,
      customerEmail,
      companyName,
      address,
      packageType,
      extraDisplays = 0,
      promoCodes,
    }: CheckoutRequest = await req.json();

    if (!packageType || !['basic', 'plus', 'pro'].includes(packageType)) {
      throw new Error('Invalid package type');
    }

    console.log("[CREATE-CHECKOUT] Request data received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log("[CREATE-CHECKOUT] Existing customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
      });
      customerId = customer.id;
      console.log("[CREATE-CHECKOUT] Created new customer:", customerId);
    }

    // Build line items based on package selection
    const lineItems: any[] = [];
    
    // Add subscription based on package
    switch (packageType) {
      case 'basic':
        lineItems.push({ price: PRICE_IDS.BASIC_SUBSCRIPTION, quantity: 1 });
        lineItems.push({ price: PRICE_IDS.SETUP_BASIC, quantity: 1 });
        break;
      case 'plus':
        lineItems.push({ price: PRICE_IDS.PLUS_SUBSCRIPTION, quantity: 1 });
        lineItems.push({ price: PRICE_IDS.SETUP_PLUS, quantity: 1 });
        break;
      case 'pro':
        lineItems.push({ price: PRICE_IDS.PRO_SUBSCRIPTION, quantity: 1 });
        lineItems.push({ price: PRICE_IDS.SETUP_PRO, quantity: 1 });
        break;
    }

    // Add extra displays if requested
    if (extraDisplays > 0) {
      lineItems.push({
        price: PRICE_IDS.EXTRA_DISPLAY,
        quantity: extraDisplays,
      });
    }

    console.log("[CREATE-CHECKOUT] Line items built:", lineItems.length);

    // Create metadata
    const metadata: any = {
      customerName,
      customerEmail,
      companyName,
      packageType,
      address: JSON.stringify(address || {}),
    };

    // Build session params
    const sessionParams: any = {
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      payment_method_types: ["card"], // SEPA can be added after activating in Stripe Dashboard
      success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata,
    };
    console.log("[CREATE-CHECKOUT] PM types:", sessionParams.payment_method_types);
    // Apply promo codes if provided, otherwise allow manual promo code entry
    if (promoCodes && promoCodes.length > 0) {
      const discounts: Array<{ promotion_code: string }> = [];
      
      for (const code of promoCodes) {
        try {
          const promoCodesList = await stripe.promotionCodes.list({
            code: code,
            active: true,
            limit: 1,
          });
          if (promoCodesList.data.length > 0) {
            discounts.push({ promotion_code: promoCodesList.data[0].id });
            console.log("[CREATE-CHECKOUT] Promo code applied:", code);
          }
        } catch (error) {
          console.log("[CREATE-CHECKOUT] Invalid promo code:", code);
        }
      }
      
      if (discounts.length > 0) {
        sessionParams.discounts = discounts;
      }
    } else {
      // Allow users to enter promo codes manually in Stripe Checkout
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log("[CREATE-CHECKOUT] Session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
