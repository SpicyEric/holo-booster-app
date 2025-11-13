import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user) throw new Error("Not authenticated");

    // Check if user is admin
    const { data: userRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!userRole) throw new Error("Not authorized - admin only");

    const { checkoutSessionId } = await req.json();

    if (!checkoutSessionId) {
      throw new Error("checkoutSessionId is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    
    if (!session) {
      throw new Error("Checkout session not found");
    }

    const metadata = session.metadata || {};
    
    if (metadata.type !== 'sms_campaign' || !metadata.campaign_id) {
      throw new Error("This is not an SMS campaign checkout session");
    }

    // Get campaign to find customer_id
    const { data: campaign } = await supabaseClient
      .from('campaigns')
      .select('customer_id')
      .eq('id', metadata.campaign_id)
      .single();

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Check if invoice already exists
    const { data: existingInvoice } = await supabaseClient
      .from("invoices")
      .select("id")
      .eq("stripe_invoice_id", `sms_${checkoutSessionId}`)
      .single();

    if (existingInvoice) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Invoice already exists",
          invoiceId: existingInvoice.id 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create invoice
    const { data: newInvoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .insert({
        customer_id: campaign.customer_id,
        stripe_invoice_id: `sms_${checkoutSessionId}`,
        pdf_url: null,
        total_amount_cents: session.amount_total || 0,
        currency: (session.currency || 'eur').toUpperCase(),
        status: "paid",
        invoice_type: "sms_campaign",
        issued_at: new Date(session.created * 1000).toISOString(),
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    console.log("[BACKFILL] SMS Campaign invoice created:", newInvoice.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invoice created successfully",
        invoice: newInvoice 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[BACKFILL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
