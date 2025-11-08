import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

interface CheckoutRequest {
  customerName: string;
  customerEmail: string;
  companyName?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  extraDisplays?: number;
  customDesign?: boolean;
  promoCodes?: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Direct Price IDs
const PRICE_IDS = {
  BASE_SUBSCRIPTION: "price_1SQl6nPcpEwK4jkCCV6TxaFw", // 39.45 EUR/month
  SETUP_FEE: "price_1SQlRTPcpEwK4jkCxh4g6rMH", // 149.00 EUR
  EXTRA_DISPLAY: "price_1SQlRcPcpEwK4jkCs3VYnto6", // 6.00 EUR
  CUSTOM_DESIGN: "price_1SQlRdPcpEwK4jkCUQXzDPtj", // 30.00 EUR
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
      extraDisplays = 0,
      customDesign = false,
      promoCodes,
    }: CheckoutRequest = await req.json();

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

    // Build line items
    const lineItems: any[] = [
      {
        price: PRICE_IDS.BASE_SUBSCRIPTION,
        quantity: 1,
      },
      {
        price: PRICE_IDS.SETUP_FEE,
        quantity: 1,
      },
    ];

    if (extraDisplays > 0) {
      lineItems.push({
        price: PRICE_IDS.EXTRA_DISPLAY,
        quantity: extraDisplays,
      });
    }

    if (customDesign) {
      lineItems.push({
        price: PRICE_IDS.CUSTOM_DESIGN,
        quantity: 1,
      });
    }

    console.log("[CREATE-CHECKOUT] Line items built:", lineItems.length);

    // Create metadata
    const metadata: any = {
      customerName,
      customerEmail,
      companyName: companyName || "",
      address: JSON.stringify(address || {}),
    };

    // Create checkout session
    const sessionParams: any = {
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      payment_method_types: ["sepa_debit", "card"],
      allow_promotion_codes: true,
      success_url: `${req.headers.get("origin")}/admin/customers?checkout=success`,
      cancel_url: `${req.headers.get("origin")}/admin/checkout`,
      metadata,
    };

    // Apply promo codes if provided
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
