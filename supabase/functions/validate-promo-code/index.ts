import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidatePromoRequest {
  code: string;
}

interface PromoValidationResponse {
  valid: boolean;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  appliesTo?: 'one_time' | 'recurring' | 'both';
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code }: ValidatePromoRequest = await req.json();
    
    if (!code || code.trim() === "") {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Bitte geben Sie einen Rabattcode ein" 
        } as PromoValidationResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    console.log(`Validating promo code: ${code}`);

    // Search for the promotion code in Stripe
    const promotionCodes = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      console.log(`Promo code not found: ${code}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Ungültiger oder abgelaufener Rabattcode" 
        } as PromoValidationResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const promotionCode = promotionCodes.data[0];
    const coupon = promotionCode.coupon;

    console.log(`Found valid promo code. Coupon details:`, {
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      duration: coupon.duration,
    });

    // Determine discount type and value
    const discountType = coupon.percent_off ? 'percentage' : 'fixed';
    const discountValue = coupon.percent_off || (coupon.amount_off ? coupon.amount_off / 100 : 0);

    // Determine what the discount applies to
    // For simplicity, we'll apply recurring discounts to monthly and one-time to setup
    // You can customize this logic based on your specific coupon configuration
    let appliesTo: 'one_time' | 'recurring' | 'both' = 'both';
    
    if (coupon.duration === 'once') {
      appliesTo = 'one_time';
    } else if (coupon.duration === 'forever' || coupon.duration === 'repeating') {
      appliesTo = 'recurring';
    }

    const response: PromoValidationResponse = {
      valid: true,
      discountType,
      discountValue,
      appliesTo,
    };

    console.log(`Validation successful:`, response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error validating promo code:", error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: "Fehler bei der Validierung des Rabattcodes" 
      } as PromoValidationResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
