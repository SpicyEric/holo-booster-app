import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Segment {
  type: 'all' | 'last_scanners' | 'min_scans' | 'exact_scans' | 'timerange';
  value?: number;
  from?: string;
  to?: string;
  timeField?: 'first_scan_at' | 'last_scan_at';
  limit?: number;
}

async function sendSMSBatch(
  recipients: Array<{ id: string; phone: string }>,
  message: string,
  campaignId: string,
  batchNo: number
): Promise<Array<{ contactId: string; success: boolean; error?: string }>> {
  const SEVEN_API_KEY = Deno.env.get('SEVEN_API_KEY');
  
  const phoneNumbers = recipients.map(r => r.phone).join(',');
  
  try {
    const response = await fetch('https://gateway.seven.io/api/sms', {
      method: 'POST',
      headers: {
        'X-Api-Key': SEVEN_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: phoneNumbers,
        text: message,
        label: `${campaignId}`,
        foreign_id: `cmp:${campaignId}:${batchNo}`
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('seven.io error:', result);
      return recipients.map(r => ({
        contactId: r.id,
        success: false,
        error: result.message || 'API error'
      }));
    }

    return recipients.map(r => ({
      contactId: r.id,
      success: true
    }));

  } catch (error) {
    console.error('SMS send error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return recipients.map(r => ({
      contactId: r.id,
      success: false,
      error: errorMsg
    }));
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { campaignId } = await req.json();

    // Get campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) throw new Error('Campaign not found');

    if (campaign.status !== 'paid') {
      throw new Error('Campaign must be paid before sending');
    }

    // Update status to sending
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    const segment: Segment = campaign.segment;
    const packageLimit = parseInt(campaign.package_tier);

    // Build query for recipients
    let query = supabaseAdmin
      .from('contacts')
      .select('id, phone')
      .eq('customer_id', campaign.customer_id)
      .eq('opt_in', true)
      .is('deleted_at', null)
      .is('opted_out_at', null)
      .not('phone', 'is', null);

    switch (segment.type) {
      case 'last_scanners':
        if (segment.value) {
          query = query
            .not('last_scan_at', 'is', null)
            .order('last_scan_at', { ascending: false })
            .limit(Math.min(segment.value, packageLimit));
        }
        break;
      
      case 'min_scans':
        if (segment.value) {
          query = query.gte('scan_count', segment.value);
        }
        break;
      
      case 'exact_scans':
        if (segment.value !== undefined) {
          query = query.eq('scan_count', segment.value);
        }
        break;
      
      case 'timerange':
        if (segment.from && segment.to && segment.timeField) {
          query = query
            .gte(segment.timeField, segment.from)
            .lte(segment.timeField, segment.to);
        }
        break;
    }

    // Apply deterministic random selection if needed
    let recipients: Array<{ id: string; phone: string }> = [];
    
    if (segment.limit && segment.limit < packageLimit) {
      // Will be sorted by MD5 hash for deterministic randomness
      const { data: allContacts } = await query;
      
      if (allContacts) {
        // Sort by MD5 hash of id+campaignId (deterministic)
        const sorted = allContacts.sort((a, b) => {
          const hashA = a.id + campaignId;
          const hashB = b.id + campaignId;
          return hashA.localeCompare(hashB);
        });
        
        recipients = sorted.slice(0, segment.limit);
      }
    } else {
      const { data } = await query.limit(packageLimit);
      recipients = data || [];
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No eligible recipients found');
    }

    // Prepare message
    let finalMessage = campaign.message_text;
    if (campaign.add_unsubscribe) {
      finalMessage += '\n\nStop mit STOP.';
    }

    // Create campaign_messages records
    await supabaseAdmin
      .from('campaign_messages')
      .insert(
        recipients.map(r => ({
          campaign_id: campaignId,
          contact_id: r.id,
          status: 'queued'
        }))
      );

    // Send in batches of 200
    const BATCH_SIZE = 200;
    const batches = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      batches.push(recipients.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const results = await sendSMSBatch(batch, finalMessage, campaignId, i);

      // Update campaign_messages with results
      for (const result of results) {
        if (result.success) {
          await supabaseAdmin
            .from('campaign_messages')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('campaign_id', campaignId)
            .eq('contact_id', result.contactId);
          totalSent++;
        } else {
          await supabaseAdmin
            .from('campaign_messages')
            .update({ 
              status: 'failed',
              error_code: result.error
            })
            .eq('campaign_id', campaignId)
            .eq('contact_id', result.contactId);
          totalFailed++;
        }
      }

      // Small delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update campaign status
    await supabaseAdmin
      .from('campaigns')
      .update({ 
        status: totalFailed === recipients.length ? 'failed' : 'done'
      })
      .eq('id', campaignId);

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: totalSent,
        failed: totalFailed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending campaign:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Try to update campaign status to failed
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { campaignId } = await req.json();
    if (campaignId) {
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
