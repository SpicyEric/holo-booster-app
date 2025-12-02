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

    const appUrl = Deno.env.get('APP_SUPABASE_URL');
    const appServiceKey = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY');

    console.log(`App URL: ${appUrl}`);
    console.log(`Service key present: ${!!appServiceKey}`);
    console.log(`Service key length: ${appServiceKey?.length || 0}`);
    console.log(`Attempting to delete merchant with ID: ${merchantId}`);

    // Create App-DB client with Service Role Key (bypasses RLS)
    const appSupabaseAdmin = createClient(appUrl!, appServiceKey!);

    // First, check if merchant exists
    const { data: existingMerchant, error: selectError } = await appSupabaseAdmin
      .from('merchants')
      .select('id, name')
      .eq('id', merchantId)
      .single();

    console.log(`Select result:`, JSON.stringify({ existingMerchant, selectError }));

    if (selectError) {
      console.error('Error finding merchant:', selectError);
      return new Response(
        JSON.stringify({ error: `Merchant not found: ${selectError.message}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found merchant: ${existingMerchant?.name}`);

    // Delete merchant from App-DB
    const { data: deleteData, error: deleteError, count } = await appSupabaseAdmin
      .from('merchants')
      .delete()
      .eq('id', merchantId)
      .select();

    console.log(`Delete result:`, JSON.stringify({ deleteData, deleteError, count }));

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    if (!deleteData || deleteData.length === 0) {
      console.error('No rows were deleted - this should not happen after successful select');
      return new Response(
        JSON.stringify({ error: 'Deletion failed - no rows affected' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted merchant: ${merchantId}`);

    return new Response(
      JSON.stringify({ success: true, deleted: deleteData }),
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
