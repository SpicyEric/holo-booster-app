import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

interface CheckoutRequest {
  customerName: string;
  customerEmail: string;
  companyName: string;
  address?: {
    street: string;
    houseNumber?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  billingAddress?: {
    name?: string;
    street?: string;
    houseNumber?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    email?: string;
  };
  billingInterval: 'monthly' | 'yearly';
  promoCodes?: string[];
  locationCount?: number;
  industry?: string;
  vatId?: string;
  contactPhone?: string;
  additionalContacts?: string;
  partnerUserId?: string;
  salesRepDiscount?: number; // in euros, deducted from startbox
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe Price IDs
const PRICE_IDS = {
  STARTBOX: "price_1SYPFvBhiBjCX9PmvCYIpxGd",
  ABO_MONTHLY: "price_1SYPBgBhiBjCX9PmImKaK2YC",
  ADDITIONAL_STARTBOX: "price_1TGI0vBhiBjCX9PmlblKG1OW",
  ADDITIONAL_ABO_MONTHLY: "price_1TGI0uBhiBjCX9PmtT9lzPrz",
};

// Prices in cents
const STARTBOX_PRICE = 14945;
const ADDITIONAL_STARTBOX_PRICE = 9945;
const ABO_MONTHLY = 4945;
const ADDITIONAL_ABO_MONTHLY = 3945;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-CHECKOUT] Function started");

    const body: CheckoutRequest = await req.json();
    const {
      customerName, customerEmail, companyName, address,
      billingAddress, billingInterval, promoCodes,
      locationCount = 1, industry, vatId, contactPhone,
      additionalContacts, partnerUserId, salesRepDiscount,
    } = body;

    const salesRepDiscountCents = Math.min((salesRepDiscount || 0) * 100, 5000); // max 50€

    const additionalLocations = Math.max(0, locationCount - 1);
    console.log("[CREATE-CHECKOUT] Request:", { billingInterval, locationCount, promoCodes });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-10-28.acacia",
    });

    // Create or retrieve Stripe customer
    const existingCustomers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId: string;

    const billingAddr = billingAddress || address;
    const stripeAddress = billingAddr ? {
      line1: [billingAddr.street, billingAddr.houseNumber].filter(Boolean).join(' ') || undefined,
      city: billingAddr.city || undefined,
      postal_code: billingAddr.postalCode || undefined,
      country: billingAddr.country === 'Deutschland' ? 'DE' : billingAddr.country || undefined,
    } : undefined;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      // Update address
      if (stripeAddress) {
        await stripe.customers.update(customerId, {
          address: stripeAddress,
          metadata: { companyName, industry: industry || '', vatId: vatId || '', locationCount: String(locationCount) },
        });
      }
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: billingAddress?.name || companyName,
        address: stripeAddress,
        metadata: { companyName, industry: industry || '', vatId: vatId || '', locationCount: String(locationCount) },
      });
      customerId = customer.id;
    }

    // Process promo codes
    let startboxPercentOff = 0;
    let aboCouponId: string | null = null;
    const appliedCodes: string[] = [];

    if (promoCodes && promoCodes.length > 0) {
      for (const code of promoCodes.slice(0, 2)) {
        const trimmedCode = code.trim();
        if (!trimmedCode) continue;
        try {
          const promoCodesList = await stripe.promotionCodes.list({ code: trimmedCode, active: true, limit: 1 });
          if (promoCodesList.data.length > 0) {
            const promoCode = promoCodesList.data[0];
            const coupon = await stripe.coupons.retrieve(promoCode.coupon.id);
            if (coupon.percent_off && coupon.duration === 'once') {
              startboxPercentOff = coupon.percent_off;
              appliedCodes.push(trimmedCode);
            } else if (coupon.duration === 'repeating') {
              aboCouponId = coupon.id;
              appliedCodes.push(trimmedCode);
            } else if (!aboCouponId) {
              aboCouponId = coupon.id;
              appliedCodes.push(trimmedCode);
            }
          }
        } catch (error) {
          console.log("[CREATE-CHECKOUT] Promo error:", trimmedCode, error);
        }
      }
    }

    // Build line items
    const lineItems: any[] = [];

    // 1. First Startbox (apply salesRepDiscount + promo discount)
    const startboxAfterSalesDiscount = STARTBOX_PRICE - salesRepDiscountCents;
    if (startboxPercentOff > 0) {
      const discountedPrice = Math.round(startboxAfterSalesDiscount * (1 - startboxPercentOff / 100));
      lineItems.push({
        price_data: {
          currency: 'eur', unit_amount: Math.max(0, discountedPrice),
          product_data: { name: 'Eloyo Startbox Basic', description: `${startboxPercentOff}% Rabatt${salesRepDiscountCents > 0 ? ` + ${salesRepDiscount}€ Partner-Rabatt` : ''} (Original: €149,45)` },
        },
        quantity: 1,
      });
    } else if (salesRepDiscountCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur', unit_amount: Math.max(0, startboxAfterSalesDiscount),
          product_data: { name: 'Eloyo Startbox Basic', description: `${salesRepDiscount}€ Partner-Rabatt (Original: €149,45)` },
        },
        quantity: 1,
      });
    } else {
      lineItems.push({ price: PRICE_IDS.STARTBOX, quantity: 1 });
    }

    // 2. Additional Startboxes
    if (additionalLocations > 0) {
      if (startboxPercentOff > 0) {
        const discountedAdditional = Math.round(ADDITIONAL_STARTBOX_PRICE * (1 - startboxPercentOff / 100));
        lineItems.push({
          price_data: {
            currency: 'eur', unit_amount: discountedAdditional,
            product_data: { name: 'Zusatzstandort Startbox', description: `${additionalLocations}× zusätzliche Standorte (${startboxPercentOff}% Rabatt)` },
          },
          quantity: additionalLocations,
        });
      } else {
        lineItems.push({ price: PRICE_IDS.ADDITIONAL_STARTBOX, quantity: additionalLocations });
      }
    }

    // 3. First location Abo
    if (billingInterval === 'yearly') {
      const yearlyAmount = ABO_MONTHLY * 11; // 11 months
      lineItems.push({
        price_data: {
          currency: 'eur', unit_amount: yearlyAmount,
          recurring: { interval: 'year' },
          product_data: { name: 'Eloyo Abo (Jährlich)', description: '11 Monate zahlen, 12 Monate nutzen' },
        },
        quantity: 1,
      });
    } else {
      lineItems.push({ price: PRICE_IDS.ABO_MONTHLY, quantity: 1 });
    }

    // 4. Additional location Abo
    if (additionalLocations > 0) {
      if (billingInterval === 'yearly') {
        const additionalYearly = ADDITIONAL_ABO_MONTHLY * 11;
        lineItems.push({
          price_data: {
            currency: 'eur', unit_amount: additionalYearly,
            recurring: { interval: 'year' },
            product_data: { name: 'Zusatzstandort Abo (Jährlich)', description: `${additionalLocations}× zusätzliche Standorte – 11 Monate zahlen` },
          },
          quantity: additionalLocations,
        });
      } else {
        lineItems.push({ price: PRICE_IDS.ADDITIONAL_ABO_MONTHLY, quantity: additionalLocations });
      }
    }

    // Metadata
    const metadata: Record<string, string> = {
      customerName, customerEmail, companyName, billingInterval,
      address: JSON.stringify(address || {}),
      billingAddress: JSON.stringify(billingAddress || {}),
      appliedPromoCodes: appliedCodes.join(', '),
      locationCount: String(locationCount),
      industry: industry || '',
      vatId: vatId || '',
      contactPhone: contactPhone || '',
      additionalContacts: additionalContacts || '',
      promoterId: partnerUserId || '',
      salesRepDiscountCents: String(salesRepDiscountCents),
    };

    const sessionParams: any = {
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      payment_method_types: ["card"],
      success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata,
      subscription_data: {
        metadata: { promoterId: partnerUserId || '', salesRepDiscountCents: String(salesRepDiscountCents) },
      },
    };

    if (aboCouponId) {
      sessionParams.discounts = [{ coupon: aboCouponId }];
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log("[CREATE-CHECKOUT] Session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
