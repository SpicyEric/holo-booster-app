import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify cron secret
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[AUTO-REPLY-CRON] Starting auto-reply check...');

    // Get all customers with auto-reply enabled and due for execution
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('auto_reply_enabled', true)
      .lte('next_auto_reply_run', new Date().toISOString());

    if (error) {
      console.error('[AUTO-REPLY-CRON] Error fetching customers:', error);
      throw error;
    }

    console.log(`[AUTO-REPLY-CRON] Found ${customers?.length || 0} customers to process`);

    const results = [];

    for (const customer of customers || []) {
      try {
        console.log(`[AUTO-REPLY-CRON] Processing customer ${customer.id}...`);
        
        // Check if customer has Google access token
        if (!customer.google_access_token || !customer.google_refresh_token) {
          console.log(`[AUTO-REPLY-CRON] Customer ${customer.id} has no Google tokens, skipping`);
          
          // Disable auto-reply for this customer
          await supabase
            .from('customers')
            .update({ auto_reply_enabled: false })
            .eq('id', customer.id);
          
          continue;
        }

        // Process auto-replies for this customer
        const result = await runAutoReplyForCustomer(customer, supabase);
        results.push({ customer_id: customer.id, ...result });

      } catch (error) {
        console.error(`[AUTO-REPLY-CRON] Error processing customer ${customer.id}:`, error);
        results.push({ 
          customer_id: customer.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log('[AUTO-REPLY-CRON] Completed!', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AUTO-REPLY-CRON] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function runAutoReplyForCustomer(customer: any, supabase: any) {
  try {
    // 1. Refresh Google access token if expired
    let accessToken = customer.google_access_token;
    
    if (new Date(customer.google_token_expires_at) < new Date()) {
      console.log(`[AUTO-REPLY] Refreshing access token for customer ${customer.id}`);
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: customer.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('Failed to refresh access token');
      }

      accessToken = tokenData.access_token;
      
      // Update token in database
      await supabase
        .from('customers')
        .update({
          google_access_token: accessToken,
          google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq('id', customer.id);
    }

    // 2. Get Google Business accounts and locations
    const accountsResponse = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const accountsData = await accountsResponse.json();
    const accountId = accountsData.accounts?.[0]?.name;

    if (!accountId) {
      throw new Error('No Google Business account found');
    }

    const locationsResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const locationsData = await locationsResponse.json();
    const locationId = locationsData.locations?.[0]?.name;

    if (!locationId) {
      throw new Error('No Google Business location found');
    }

    // 3. Fetch reviews
    const reviewsResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationId}/reviews?orderBy=updateTime desc&pageSize=50`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const reviewsData = await reviewsResponse.json();

    // 4. Filter reviews
    const lastCheck = customer.last_auto_reply_check ? new Date(customer.last_auto_reply_check) : new Date(0);
    const now = new Date();
    
    const eligibleReviews = (reviewsData.reviews || []).filter((review: any) => {
      const reviewDate = new Date(review.createTime);
      const stars = review.starRating === "FIVE" ? 5 : 
                    review.starRating === "FOUR" ? 4 :
                    review.starRating === "THREE" ? 3 : 2;
      
      return reviewDate > lastCheck && 
             stars >= (customer.auto_reply_min_rating || 4) && 
             !review.reviewReply;
    });

    console.log(`[AUTO-REPLY] Found ${eligibleReviews.length} eligible reviews for customer ${customer.id}`);

    let repliedCount = 0;
    const maxReplies = 20; // Limit per run

    // 5. Send auto-replies
    for (const review of eligibleReviews.slice(0, maxReplies)) {
      try {
        const reviewerName = review.reviewer?.displayName || 'Kunde';
        const replyText = `${reviewerName}, vielen Dank für deine positive Bewertung! 😊 Wir freuen uns sehr, dass du zufrieden bist.`;

        const replyResponse = await fetch(
          `https://mybusiness.googleapis.com/v4/${review.name}/reply`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment: replyText }),
          }
        );

        if (!replyResponse.ok) {
          throw new Error(`Failed to send reply: ${replyResponse.statusText}`);
        }

        // Log the reply
        await supabase
          .from('review_auto_replies')
          .insert({
            customer_id: customer.id,
            review_id: review.name,
            reviewer_name: reviewerName,
            review_text: review.comment || '',
            reply_text: replyText,
            status: 'success',
          });

        repliedCount++;
        console.log(`[AUTO-REPLY] Replied to review ${review.name}`);

      } catch (error) {
        console.error(`[AUTO-REPLY] Error replying to review ${review.name}:`, error);
        
        // Log the error
        await supabase
          .from('review_auto_replies')
          .insert({
            customer_id: customer.id,
            review_id: review.name,
            reviewer_name: review.reviewer?.displayName || 'Unknown',
            review_text: review.comment || '',
            reply_text: '',
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });
      }
    }

    // 6. Update customer's next run time
    const [hours, minutes] = customer.auto_reply_daily_time.split(':').map(Number);
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(hours, minutes, 0, 0);

    await supabase
      .from('customers')
      .update({
        last_auto_reply_check: now.toISOString(),
        next_auto_reply_run: nextRun.toISOString(),
      })
      .eq('id', customer.id);

    return { 
      success: true, 
      replied_count: repliedCount,
      eligible_reviews: eligibleReviews.length 
    };

  } catch (error) {
    console.error(`[AUTO-REPLY] Error in runAutoReplyForCustomer:`, error);
    throw error;
  }
}
