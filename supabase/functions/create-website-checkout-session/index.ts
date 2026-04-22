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
  industry?: string;
  vatId?: string;
  contactPhone?: string;
  additionalContacts?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe Price IDs für Eloyo Website Service
const PRICE_IDS = {
  WEBSITE_SETUP: "price_1TOz4OBhiBjCX9PmTUX9G9Le",      // 559€ einmalig (brutto)
  WEBSITE_MONTHLY: "price_1TOz4QBhiBjCX9PmE6O33eDc",    // 39€/Monat (brutto)
};

// Tax Rate ID für 19% MwSt. (inclusive)
const TAX_RATE_ID = "txr_1TJYQcBhiBjCX9Pm1iPiJe16";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-WEBSITE-CHECKOUT] Function started");

    const body: CheckoutRequest = await req.json();
    const {
      customerName, customerEmail, companyName, address,
      billingAddress, industry, vatId, contactPhone, additionalContacts,
    } = body;

    if (!customerEmail || !companyName) {
      return new Response(
        JSON.stringify({ error: "customerEmail und companyName sind erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const invoiceSettings = {
      custom_fields: [{ name: 'USt-IdNr.', value: 'DE337756435' }],
      footer: 'Eloyo | Fuggerstr. 2, 86836 Untermeitingen | USt-IdNr.: DE337756435 | Steuernummer: 102/257/91479 | support@eloyo.de',
    };

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      await stripe.customers.update(customerId, {
        address: stripeAddress,
        preferred_locales: ['de'],
        invoice_settings: invoiceSettings,
        metadata: { 
          companyName, 
          industry: industry || '', 
          vatId: vatId || '',
          serviceType: 'website',
        },
      });
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: billingAddress?.name || companyName,
        address: stripeAddress,
        preferred_locales: ['de'],
        invoice_settings: invoiceSettings,
        metadata: { 
          companyName, 
          industry: industry || '', 
          vatId: vatId || '',
          serviceType: 'website',
        },
      });
      customerId = customer.id;
    }

    // Line items: Einmalige Erstellung + monatliches Abo
    const lineItems = [
      { price: PRICE_IDS.WEBSITE_SETUP, quantity: 1, tax_rates: [TAX_RATE_ID] },
      { price: PRICE_IDS.WEBSITE_MONTHLY, quantity: 1, tax_rates: [TAX_RATE_ID] },
    ];

    const metadata: Record<string, string> = {
      serviceType: 'website',
      customerName, customerEmail, companyName,
      address: JSON.stringify(address || {}),
      billingAddress: JSON.stringify(billingAddress || {}),
      industry: industry || '',
      vatId: vatId || '',
      contactPhone: contactPhone || '',
      additionalContacts: additionalContacts || '',
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      payment_method_types: ["card", "sepa_debit", "link"],
      billing_address_collection: 'required',
      success_url: `${req.headers.get("origin")}/checkout/success?session_id={CHECKOUT_SESSION_ID}&service=website`,
      cancel_url: `${req.headers.get("origin")}/checkout/cancel`,
      metadata,
      subscription_data: {
        metadata: { serviceType: 'website' },
      },
    });

    console.log("[CREATE-WEBSITE-CHECKOUT] Session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-WEBSITE-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
