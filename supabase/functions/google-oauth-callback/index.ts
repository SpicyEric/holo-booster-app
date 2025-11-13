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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // customer_id
    
    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Exchange code for access token
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
    const redirectUri = `${url.origin}/api/google-callback`;

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
    
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get business account info
    const accountsResponse = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const accountsData = await accountsResponse.json();
    const accountName = accountsData.accounts?.[0]?.accountName || 'Unknown Business';

    // Store tokens in database
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        google_access_token: tokenData.access_token,
        google_refresh_token: tokenData.refresh_token,
        google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        google_business_name: accountName,
      })
      .eq('id', state);

    if (updateError) {
      throw updateError;
    }

    // Redirect back to the app
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${url.origin}/customer/google-reviews?linked=true`,
      },
    });

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
