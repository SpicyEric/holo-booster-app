import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, customer_id } = await req.json();
    
    if (!code || !customer_id) {
      throw new Error('Missing code or customer_id');
    }

    console.log('[OAUTH] Processing callback for customer:', customer_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Exchange code for access token
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
    
    // Use the frontend redirect URI (where the code was received)
    const redirectUri = `https://3ee30c31-4eaa-4550-a0fd-340678fe1b0c.lovableproject.com/customer/google-reviews`;

    console.log('[OAUTH] Exchanging code for tokens...');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    
    console.log('[OAUTH] Token response status:', tokenResponse.status);
    
    if (!tokenData.access_token) {
      console.error('[OAUTH] Token error:', tokenData);
      throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
    }

    console.log('[OAUTH] Access token received');

    // Get business account info
    console.log('[OAUTH] Fetching business account info...');
    const accountsResponse = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const accountsData = await accountsResponse.json();
    console.log('[OAUTH] Accounts response status:', accountsResponse.status);
    
    const accountName = accountsData.accounts?.[0]?.accountName || 'Unknown Business';

    // Store tokens in database
    console.log('[OAUTH] Storing tokens for customer:', customer_id);
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        google_access_token: tokenData.access_token,
        google_refresh_token: tokenData.refresh_token,
        google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        google_business_name: accountName,
      })
      .eq('id', customer_id);

    if (updateError) {
      console.error('[OAUTH] Database update error:', updateError);
      throw updateError;
    }

    console.log('[OAUTH] Successfully linked account');

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true,
        business_name: accountName 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in google-oauth-callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
