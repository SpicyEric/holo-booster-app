import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchantId } = await req.json();

    if (!merchantId) {
      return new Response(
        JSON.stringify({ error: 'merchantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appAdminApiKey = Deno.env.get('APP_ADMIN_API_KEY');
    const appUrl = Deno.env.get('APP_SUPABASE_URL');

    console.log(`App URL: ${appUrl}`);
    console.log(`Admin API Key present: ${!!appAdminApiKey}`);
    console.log(`Attempting to delete merchant with ID: ${merchantId}`);

    // Build request payload - try merchant_id as expected by Admin API
    const payload = {
      action: 'delete_merchant',
      data: { merchant_id: merchantId }
    };
    
    console.log('Sending payload to Admin API:', JSON.stringify(payload));

    // Call the App-Database's admin-api Edge Function
    const response = await fetch(
      `${appUrl}/functions/v1/admin-api`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': appAdminApiKey!
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();
    console.log(`Admin API response:`, JSON.stringify(result));

    if (!response.ok) {
      console.error('Admin API error:', result);
      return new Response(
        JSON.stringify({ error: result.error || 'Failed to delete merchant' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted merchant: ${merchantId}`);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in delete-app-merchant:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
