import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  customer: {
    name: string;
    email: string;
    company?: string;
    address: {
      line1: string;
      line2?: string;
      postal_code: string;
      city: string;
      country: string;
    };
  };
  promoterId?: string;
  setup: {
    mode: 'price' | 'dynamic';
    priceLookup?: string;
    amountCents?: number;
  };
  addons: {
    displayCount: number;
    design: boolean;
  };
  promoCode?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-CHECKOUT] Function started");

    // Auth Check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    console.log("[CREATE-CHECKOUT] User authenticated:", userData.user.id);

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (roleData?.role !== "admin") throw new Error("Only admins can create checkout sessions");

    const requestData: CheckoutRequest = await req.json();
    console.log("[CREATE-CHECKOUT] Request data received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({
      email: requestData.customer.email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log("[CREATE-CHECKOUT] Existing customer:", customerId);
    } else {
      const customer = await stripe.customers.create({
        email: requestData.customer.email,
        name: requestData.customer.name,
        address: requestData.customer.address,
        metadata: {
          promoterId: requestData.promoterId || "",
        },
      });
      customerId = customer.id;
      console.log("[CREATE-CHECKOUT] Created new customer:", customerId);
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // 1. Base subscription (required) - using direct price ID
    lineItems.push({
      price: "price_1SQl6nPcpEwK4jkCCV6TxaFw", // QRate Basis-Abo: 39.45 EUR/month
      quantity: 1,
    });

    // 2. Setup fee (required)
    if (requestData.setup.mode === "price") {
      // Use fixed setup price
      lineItems.push({
        price: "price_1SQlRTPcpEwK4jkCxh4g6rMH", // QRate Setup: 149.00 EUR one-time
        quantity: 1,
      });
    } else if (requestData.setup.mode === "dynamic" && requestData.setup.amountCents) {
      // Dynamic setup amount
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Setup-Gebühr",
            metadata: { item: "setup_fee" },
          },
          unit_amount: requestData.setup.amountCents,
        },
        quantity: 1,
      });
    }

    // 3. Add-ons (optional)
    if (requestData.addons.displayCount > 0) {
      lineItems.push({
        price: "price_1SQlRcPcpEwK4jkCs3VYnto6", // Extra-Aufsteller: 6.00 EUR one-time
        quantity: requestData.addons.displayCount,
      });
    }

    if (requestData.addons.design) {
      lineItems.push({
        price: "price_1SQlRdPcpEwK4jkCUQXzDPtj", // Individuelles Design: 30.00 EUR one-time
        quantity: 1,
      });
    }

    console.log("[CREATE-CHECKOUT] Line items built:", lineItems.length);

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      payment_method_types: ["sepa_debit", "card"],
      allow_promotion_codes: true,
      billing_address_collection: "required",
      success_url: `${Deno.env.get("APP_URL")}/admin/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get("APP_URL")}/admin/checkout/cancel`,
      metadata: {
        promoterId: requestData.promoterId || "",
        customerEmail: requestData.customer.email,
        customerName: requestData.customer.name,
      },
    };

    // Apply promo code if provided
    if (requestData.promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: requestData.promoCode,
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
          console.log("[CREATE-CHECKOUT] Promo code applied:", requestData.promoCode);
        }
      } catch (error) {
        console.log("[CREATE-CHECKOUT] Invalid promo code, proceeding without discount");
      }
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