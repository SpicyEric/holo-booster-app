import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log(`Deleting merchant with ID: ${merchantId}`);

    // Create App-DB client with Service Role Key (bypasses RLS)
    const appSupabaseAdmin = createClient(
      Deno.env.get('APP_SUPABASE_URL')!,
      Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete merchant from App-DB
    const { error } = await appSupabaseAdmin
      .from('merchants')
      .delete()
      .eq('id', merchantId);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    console.log(`Successfully deleted merchant: ${merchantId}`);

    return new Response(
      JSON.stringify({ success: true }),
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
