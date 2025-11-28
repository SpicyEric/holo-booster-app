import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

interface CheckoutRequest {
  customerName: string;
  customerEmail: string;
  companyName: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingInterval: 'monthly' | 'yearly';
  promoCodes?: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Eloyo Stripe Price IDs
const PRICE_IDS = {
  // Startbox (one-time) - €149.45
  STARTBOX: "price_1SYPFvBhiBjCX9PmvCYIpxGd",
  
  // Abo (monthly) - €49.45/month
  ABO_MONTHLY: "price_1SYPBgBhiBjCX9PmImKaK2YC",
};

// Yearly price: 11 months * €49.45 = €543.95 (in cents: 54395)
const ABO_YEARLY_AMOUNT = 54395;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-CHECKOUT] Function started");

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

    // Check if user is admin
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
      billingInterval,
      promoCodes,
    }: CheckoutRequest = await req.json();

    console.log("[CREATE-CHECKOUT] Request data received", { billingInterval, promoCodes });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-10-28.acacia",
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
        metadata: {
          companyName,
        },
      });
      customerId = customer.id;
      console.log("[CREATE-CHECKOUT] Created new customer:", customerId);
    }

    // Build line items
    const lineItems: any[] = [];
    
    // 1. Startbox (one-time) - always included
    lineItems.push({
      price: PRICE_IDS.STARTBOX,
      quantity: 1,
    });

    // 2. Abo (subscription)
    if (billingInterval === 'yearly') {
      // Yearly: 11 months price, billed annually
      lineItems.push({
        price_data: {
          currency: 'eur',
          unit_amount: ABO_YEARLY_AMOUNT,
          recurring: {
            interval: 'year',
            interval_count: 1,
          },
          product_data: {
            name: 'Eloyo Abo (Jährlich)',
            description: 'Jährliche Zahlung - 11 Monate zahlen, 12 Monate nutzen',
          },
        },
        quantity: 1,
      });
    } else {
      // Monthly
      lineItems.push({
        price: PRICE_IDS.ABO_MONTHLY,
        quantity: 1,
      });
    }

    console.log("[CREATE-CHECKOUT] Line items built:", lineItems.length);

    // Create metadata
    const metadata: Record<string, string> = {
      customerName,
      customerEmail,
      companyName,
      billingInterval,
      address: JSON.stringify(address || {}),
    };

    // Build session params
    const sessionParams: any = {
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      payment_method_types: ["card"],
      success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata,
    };

    // Apply promo codes if provided
    if (promoCodes && promoCodes.length > 0) {
      const discounts: Array<{ promotion_code: string }> = [];
      
      // Max 2 promo codes
      const codesToApply = promoCodes.slice(0, 2);
      
      for (const code of codesToApply) {
        try {
          const promoCodesList = await stripe.promotionCodes.list({
            code: code,
            active: true,
            limit: 1,
          });
          if (promoCodesList.data.length > 0) {
            discounts.push({ promotion_code: promoCodesList.data[0].id });
            console.log("[CREATE-CHECKOUT] Promo code applied:", code);
          } else {
            console.log("[CREATE-CHECKOUT] Promo code not found:", code);
          }
        } catch (error) {
          console.log("[CREATE-CHECKOUT] Invalid promo code:", code, error);
        }
      }
      
      if (discounts.length > 0) {
        sessionParams.discounts = discounts;
      } else {
        // Allow manual promo code entry if none were valid
        sessionParams.allow_promotion_codes = true;
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
