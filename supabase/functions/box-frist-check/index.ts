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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-10-28.acacia",
    });

    // Find expired boxes
    const { data: expiredBoxes, error: queryError } = await supabaseAdmin
      .from("eloyo_boxes")
      .select("id, box_id, vertriebler_id, preis_protokolliert")
      .eq("status", "versendet")
      .lt("frist_ablauf", new Date().toISOString());

    if (queryError) throw queryError;

    console.log(`[BOX-FRIST-CHECK] Found ${expiredBoxes?.length || 0} expired boxes`);

    for (const box of expiredBoxes || []) {
      try {
        // Get or create Stripe customer for this promoter
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_customer_id, full_name, first_name, last_name, user_id")
          .eq("user_id", box.vertriebler_id)
          .single();

        if (!profile) {
          console.error(`No profile found for vertriebler ${box.vertriebler_id}`);
          continue;
        }

        let stripeCustomerId = profile.stripe_customer_id;

        if (!stripeCustomerId) {
          // Get email from auth
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(box.vertriebler_id);
          const email = userData?.user?.email;
          const name = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Vertriebspartner';

          const customer = await stripe.customers.create({
            email: email || undefined,
            name,
            preferred_locales: ['de'],
            metadata: { user_id: box.vertriebler_id },
          });

          stripeCustomerId = customer.id;
          await supabaseAdmin
            .from("profiles")
            .update({ stripe_customer_id: customer.id })
            .eq("user_id", box.vertriebler_id);
        }

        // Create invoice
        const invoice = await stripe.invoices.create({
          customer: stripeCustomerId,
          collection_method: 'send_invoice',
          days_until_due: 14,
          auto_advance: true,
        });

        // Add line item
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: invoice.id!,
          amount: Math.round((box.preis_protokolliert || 30) * 100),
          currency: 'eur',
          description: `eloyo Box ${box.box_id} — Frist abgelaufen`,
        });

        // Finalize and send
        await stripe.invoices.finalizeInvoice(invoice.id!);

        // Update box status
        await supabaseAdmin
          .from("eloyo_boxes")
          .update({
            status: "in_rechnung_gestellt",
            rechnung_stripe_id: invoice.id,
          })
          .eq("id", box.id);

        console.log(`[BOX-FRIST-CHECK] Invoiced box ${box.box_id} → ${invoice.id}`);
      } catch (boxError) {
        console.error(`[BOX-FRIST-CHECK] Error processing box ${box.box_id}:`, boxError);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: expiredBoxes?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[BOX-FRIST-CHECK] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
