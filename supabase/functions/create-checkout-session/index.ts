import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
  STARTBOX: "price_1SYPFvBhiBjCX9PmvCYIpxGd",
  ABO_MONTHLY: "price_1SYPBgBhiBjCX9PmImKaK2YC",
};

// Prices in cents
const STARTBOX_PRICE = 14945; // €149.45
const ABO_YEARLY_AMOUNT = 54395; // €543.95 (11 months)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-CHECKOUT] Function started");

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
        metadata: { companyName },
      });
      customerId = customer.id;
      console.log("[CREATE-CHECKOUT] Created new customer:", customerId);
    }

    // Process promo codes - separate by type
    // Type 1: Percentage + once = Startbox discount (applied via price adjustment)
    // Type 2: Amount + repeating = Abo discount (applied via Stripe coupon)
    let startboxPercentOff = 0;
    let aboCouponId: string | null = null;
    const appliedCodes: string[] = [];

    if (promoCodes && promoCodes.length > 0) {
      for (const code of promoCodes.slice(0, 2)) {
        const trimmedCode = code.trim();
        if (!trimmedCode) continue;

        try {
          const promoCodesList = await stripe.promotionCodes.list({
            code: trimmedCode,
            active: true,
            limit: 1,
          });

          if (promoCodesList.data.length > 0) {
            const promoCode = promoCodesList.data[0];
            const coupon = await stripe.coupons.retrieve(promoCode.coupon.id);

            console.log("[CREATE-CHECKOUT] Promo code found:", trimmedCode, {
              percent_off: coupon.percent_off,
              amount_off: coupon.amount_off,
              duration: coupon.duration,
              duration_in_months: coupon.duration_in_months,
            });

            // Percentage + once = Startbox discount
            if (coupon.percent_off && coupon.duration === 'once') {
              startboxPercentOff = coupon.percent_off;
              appliedCodes.push(trimmedCode);
              console.log("[CREATE-CHECKOUT] Startbox discount:", startboxPercentOff + "%");
            }
            // Amount/Percent + repeating = Abo discount (12 months)
            else if (coupon.duration === 'repeating') {
              aboCouponId = coupon.id;
              appliedCodes.push(trimmedCode);
              console.log("[CREATE-CHECKOUT] Abo recurring coupon:", coupon.id);
            }
            // Fallback: any other coupon goes to subscription
            else if (!aboCouponId) {
              aboCouponId = coupon.id;
              appliedCodes.push(trimmedCode);
              console.log("[CREATE-CHECKOUT] Generic coupon applied:", coupon.id);
            }
          } else {
            console.log("[CREATE-CHECKOUT] Promo code not found:", trimmedCode);
          }
        } catch (error) {
          console.log("[CREATE-CHECKOUT] Error looking up promo code:", trimmedCode, error);
        }
      }
    }

    // Build line items
    const lineItems: any[] = [];

    // 1. Startbox - apply percentage discount directly to price if available
    if (startboxPercentOff > 0) {
      const discountedPrice = Math.round(STARTBOX_PRICE * (1 - startboxPercentOff / 100));
      lineItems.push({
        price_data: {
          currency: 'eur',
          unit_amount: discountedPrice,
          product_data: {
            name: 'Eloyo Startbox Basic',
            description: `${startboxPercentOff}% Rabatt angewendet (Original: €149,45)`,
          },
        },
        quantity: 1,
      });
      console.log("[CREATE-CHECKOUT] Startbox discounted:", discountedPrice, "cents");
    } else {
      lineItems.push({
        price: PRICE_IDS.STARTBOX,
        quantity: 1,
      });
    }

    // 2. Abo (subscription)
    if (billingInterval === 'yearly') {
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
      appliedPromoCodes: appliedCodes.join(', '),
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

    // Apply Abo recurring coupon via Stripe discount
    if (aboCouponId) {
      sessionParams.discounts = [{ coupon: aboCouponId }];
      console.log("[CREATE-CHECKOUT] Subscription discount applied:", aboCouponId);
    } else {
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
