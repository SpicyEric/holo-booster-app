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
    console.log('[fetch-google-reviews] Starting fetch for customer:', customer_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get customer's Google tokens
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('google_access_token, google_refresh_token, google_token_expires_at, google_business_name')
      .eq('id', customer_id)
      .single();

    console.log('[fetch-google-reviews] Customer lookup:', {
      found: !!customer,
      hasToken: !!customer?.google_access_token,
      error: customerError?.message
    });

    if (customerError) {
      throw new Error('Customer not found: ' + customerError.message);
    }

    if (!customer?.google_access_token) {
      throw new Error('Google account not linked');
    }

    let accessToken = customer.google_access_token;

    // Check if token is expired and refresh if needed
    const expiresAt = new Date(customer.google_token_expires_at);
    console.log('[fetch-google-reviews] Token status:', {
      expiresAt: expiresAt.toISOString(),
      now: new Date().toISOString(),
      expired: expiresAt < new Date()
    });

    if (expiresAt < new Date()) {
      console.log('[fetch-google-reviews] Refreshing expired token...');
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
      console.log('[fetch-google-reviews] Token refresh status:', refreshResponse.status);
      
      if (!refreshData.access_token) {
        console.error('[fetch-google-reviews] Token refresh failed:', refreshData);
        throw new Error('Failed to refresh access token: ' + (refreshData.error || 'Unknown error'));
      }

      accessToken = refreshData.access_token;
      console.log('[fetch-google-reviews] Token refreshed successfully');

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
    console.log('[fetch-google-reviews] Fetching Google Business accounts...');
    const accountsResponse = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const accountsData = await accountsResponse.json();
    console.log('[fetch-google-reviews] Accounts response:', {
      status: accountsResponse.status,
      accountCount: accountsData.accounts?.length || 0
    });

    if (!accountsResponse.ok) {
      console.error('[fetch-google-reviews] Accounts fetch failed:', accountsData);
      throw new Error('Failed to fetch Google Business accounts: ' + (accountsData.error?.message || 'Unknown error'));
    }

    const accountName = accountsData.accounts?.[0]?.name;

    if (!accountName) {
      throw new Error('No business account found. Please ensure you have a Google Business Profile set up.');
    }

    // Get locations
    console.log('[fetch-google-reviews] Fetching locations for account:', accountName);
    const locationsResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const locationsData = await locationsResponse.json();
    console.log('[fetch-google-reviews] Locations response:', {
      status: locationsResponse.status,
      locationCount: locationsData.locations?.length || 0
    });

    if (!locationsResponse.ok) {
      console.error('[fetch-google-reviews] Locations fetch failed:', locationsData);
      throw new Error('Failed to fetch locations: ' + (locationsData.error?.message || 'Unknown error'));
    }

    const locationName = locationsData.locations?.[0]?.name;

    if (!locationName) {
      throw new Error('No location found. Please ensure your Google Business Profile has at least one location.');
    }

    // Get reviews
    console.log('[fetch-google-reviews] Fetching reviews for location:', locationName);
    const reviewsResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const reviewsData = await reviewsResponse.json();
    console.log('[fetch-google-reviews] Reviews response:', {
      status: reviewsResponse.status,
      reviewCount: reviewsData.reviews?.length || 0
    });

    if (!reviewsResponse.ok) {
      console.error('[fetch-google-reviews] Reviews fetch failed:', reviewsData);
      throw new Error('Failed to fetch reviews: ' + (reviewsData.error?.message || 'Unknown error'));
    }
    
    // Return ALL reviews, not just low-star ones
    const allReviews = reviewsData.reviews || [];
    
    // Also filter for 1-3 star reviews for deletion purposes
    const lowStarReviews = allReviews.filter((review: any) => {
      const rating = review.starRating;
      return rating === 'ONE' || rating === 'TWO' || rating === 'THREE';
    });

    console.log('[fetch-google-reviews] Success:', {
      total: allReviews.length,
      lowStar: lowStarReviews.length
    });

    return new Response(
      JSON.stringify({ 
        reviews: lowStarReviews, // For deletion page
        allReviews: allReviews,  // For dashboard
        businessName: customer.google_business_name || accountsData.accounts[0].accountName,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[fetch-google-reviews] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
