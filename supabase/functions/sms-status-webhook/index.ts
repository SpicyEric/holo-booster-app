import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('SMS Status Webhook:', payload);

    // seven.io sends status updates
    // Expected format varies, but typically includes:
    // - id (message ID from provider)
    // - status (e.g., 'delivered', 'failed')
    // - foreign_id (our campaign reference)
    
    const { id: providerId, status, foreign_id } = payload;

    if (!foreign_id || !foreign_id.startsWith('cmp:')) {
      console.log('Not a campaign message, ignoring');
      return new Response('OK', { status: 200 });
    }

    // Parse foreign_id: "cmp:{campaignId}:{batchNo}"
    const [, campaignId] = foreign_id.split(':');

    // Map seven.io status to our status
    let mappedStatus = 'sent';
    if (status === 'delivered') mappedStatus = 'delivered';
    else if (status === 'failed' || status === 'undelivered') mappedStatus = 'failed';

    // Update message status
    await supabaseAdmin
      .from('campaign_messages')
      .update({
        provider_msg_id: providerId,
        status: mappedStatus,
        ...(mappedStatus === 'delivered' && { delivered_at: new Date().toISOString() })
      })
      .eq('campaign_id', campaignId)
      .is('provider_msg_id', null); // Only update if not already set

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('SMS webhook error:', error);
    return new Response('Error', { status: 500 });
  }
});
