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
    const { customer_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get customer's Google tokens
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('google_access_token, google_refresh_token, google_token_expires_at, google_business_name')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer?.google_access_token) {
      throw new Error('Google account not linked');
    }

    let accessToken = customer.google_access_token;

    // Check if token is expired and refresh if needed
    if (new Date(customer.google_token_expires_at) < new Date()) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: customer.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update token in database
      await supabase
        .from('customers')
        .update({
          google_access_token: accessToken,
          google_token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('id', customer_id);
    }

    // Get accounts
    const accountsResponse = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const accountsData = await accountsResponse.json();
    const accountName = accountsData.accounts?.[0]?.name;

    if (!accountName) {
      throw new Error('No business account found');
    }

    // Get locations
    const locationsResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const locationsData = await locationsResponse.json();
    const locationName = locationsData.locations?.[0]?.name;

    if (!locationName) {
      throw new Error('No location found');
    }

    // Get reviews
    const reviewsResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const reviewsData = await reviewsResponse.json();
    
    // Filter for 1-3 star reviews only
    const lowStarReviews = (reviewsData.reviews || [])
      .filter((review: any) => review.starRating && review.starRating <= 3)
      .map((review: any) => ({
        id: review.reviewId,
        googleId: review.reviewId,
        stars: review.starRating,
        reviewerName: review.reviewer?.displayName || 'Anonymous',
        reviewText: review.comment || '',
        date: review.createTime?.split('T')[0] || new Date().toISOString().split('T')[0],
        selected: false,
      }));

    return new Response(
      JSON.stringify({ 
        reviews: lowStarReviews,
        businessName: customer.google_business_name,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching Google reviews:', error);
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
