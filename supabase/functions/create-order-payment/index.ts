import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ORDER-PAYMENT] ${step}${detailsStr}`);
};

// Product definitions with Stripe IDs
const PRODUCTS = {
  aufsteller: {
    name: "QRait Extra-Aufsteller (Holz)",
    price_id: "price_1SRtm4BhiBjCX9PmQjTWHTAV",
    price_cents: 650,
  },
  design: {
    name: "QRait Individuelles Design",
    price_id: "price_1SRtnnBhiBjCX9PmBWCdJSBw",
    price_cents: 2995,
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
    const { orderType, quantity } = await req.json();
    
    if (!orderType || !PRODUCTS[orderType as keyof typeof PRODUCTS]) {
      throw new Error("Invalid order type");
    }

    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > 10) {
      throw new Error("Quantity must be between 1 and 10");
    }

    logStep("Order request", { orderType, quantity: qty });

    const product = PRODUCTS[orderType as keyof typeof PRODUCTS];

    // Get customer record
    const { data: customerUser } = await supabaseClient
      .from("customer_users")
      .select("customer_id, customers(id, stripe_customer_id, name, email)")
      .eq("user_id", user.id)
      .single();

    if (!customerUser) {
      throw new Error("No customer record found for this user");
    }

    const customer = customerUser.customers as any;
    logStep("Customer found", { customerId: customer.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create Stripe customer
    let stripeCustomerId = customer.stripe_customer_id;
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: customer.name,
        metadata: {
          customer_id: customer.id
        }
      });
      stripeCustomerId = stripeCustomer.id;
      
      // Update customer record
      await supabaseClient
        .from("customers")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", customer.id);
      
      logStep("Created new Stripe customer", { stripeCustomerId });
    }

    // Create order record first
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        customer_id: customer.id,
        order_type: orderType,
        quantity: qty,
        amount_cents: product.price_cents * qty,
        status: 'pending',
        order_details: {
          product_name: product.name,
          unit_price_cents: product.price_cents,
          quantity: qty,
          total_cents: product.price_cents * qty
        }
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    logStep("Order created", { orderId: order.id });

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: product.price_id,
          quantity: qty,
        },
      ],
      mode: "payment",
      success_url: `${origin}/customer/upgrade?order_success=${order.id}`,
      cancel_url: `${origin}/customer/upgrade?order_cancelled=${order.id}`,
      metadata: {
        order_id: order.id,
        customer_id: customer.id,
        order_type: orderType,
      }
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      orderId: order.id,
      sessionId: session.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-order-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
