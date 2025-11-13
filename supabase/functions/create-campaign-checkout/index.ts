import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PACKAGE_PRICES: Record<string, { price_id: string; amount_cents: number; name: string }> = {
  '100': { 
    price_id: 'price_1SSwOiBhiBjCX9PmJhUwc6d8', 
    amount_cents: 1785,
    name: 'QRait SMS-Paket ≤ 100'
  },
  '250': { 
    price_id: 'price_1SSwRDBhiBjCX9PmvGQB0q4i', 
    amount_cents: 4463,
    name: 'QRait SMS-Paket ≤ 250'
  },
  '500': { 
    price_id: 'price_1SSwTQBhiBjCX9PmI1TGSTjN', 
    amount_cents: 8925,
    name: 'QRait SMS-Paket ≤ 500'
  },
  '800': { 
    price_id: 'price_1SSwVFBhiBjCX9Pm9Dfogl3x', 
    amount_cents: 14280,
    name: 'QRait SMS-Paket ≤ 800'
  },
  '1200': { 
    price_id: 'price_1SSwXJBhiBjCX9PmYm60UkTr', 
    amount_cents: 21420,
    name: 'QRait SMS-Paket ≤ 1200'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { campaignId } = await req.json();

    // Get campaign
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('*, customers!inner(id, stripe_customer_id, email)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) throw new Error('Campaign not found');

    // Verify user has access to this campaign
    const { data: customerUser } = await supabaseClient
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', user.id)
      .eq('customer_id', campaign.customer_id)
      .single();

    if (!customerUser) throw new Error('Unauthorized');

    if (campaign.status !== 'payment_required') {
      throw new Error('Campaign is not in payment_required status');
    }

    const packageInfo = PACKAGE_PRICES[campaign.package_tier];
    if (!packageInfo) throw new Error('Invalid package tier');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Get or create Stripe customer
    let stripeCustomerId = campaign.customers.stripe_customer_id;
    
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: campaign.customers.email || user.email,
        metadata: {
          customer_id: campaign.customer_id
        }
      });
      stripeCustomerId = stripeCustomer.id;

      await supabaseClient
        .from('customers')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', campaign.customer_id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: packageInfo.name,
              description: `SMS-Kampagne - bis zu ${campaign.package_tier} Empfänger`,
            },
            unit_amount: packageInfo.amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/customer/sms-campaigns?session_id={CHECKOUT_SESSION_ID}&campaign_id=${campaignId}`,
      cancel_url: `${req.headers.get('origin')}/customer/sms-campaigns?canceled=true`,
      client_reference_id: campaignId,
      metadata: {
        campaign_id: campaignId,
        customer_id: campaign.customer_id,
        type: 'sms_campaign'
      }
    });

    // Create SMS order record
    await supabaseClient
      .from('stripe_sms_orders')
      .insert({
        campaign_id: campaignId,
        checkout_session_id: session.id,
        amount_cents: packageInfo.amount_cents,
        status: 'open'
      });

    return new Response(
      JSON.stringify({ checkoutUrl: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating checkout:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
