import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-10-28.acacia",
    });

    // First check if a 19% MwSt tax rate already exists
    const existing = await stripe.taxRates.list({ limit: 100, active: true });
    const found = existing.data.find(
      (tr) => tr.percentage === 19 && tr.jurisdiction === "DE" && tr.inclusive === true
    );

    if (found) {
      console.log("[CREATE-TAX-RATE] Existing tax rate found:", found.id);
      return new Response(
        JSON.stringify({
          taxRateId: found.id,
          message: `Bestehende Tax Rate gefunden: ${found.id}`,
          created: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new tax rate
    const taxRate = await stripe.taxRates.create({
      display_name: "MwSt.",
      description: "Mehrwertsteuer Deutschland",
      jurisdiction: "DE",
      percentage: 19,
      inclusive: true,
    });

    console.log("[CREATE-TAX-RATE] Created:", taxRate.id);

    return new Response(
      JSON.stringify({
        taxRateId: taxRate.id,
        message: `Neue Tax Rate erstellt: ${taxRate.id}`,
        created: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CREATE-TAX-RATE] Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
