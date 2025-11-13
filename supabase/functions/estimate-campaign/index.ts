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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get customer_id for this user
    const { data: customerUser } = await supabaseClient
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (!customerUser) throw new Error('No customer found for user');

    const { segment } = await req.json() as { segment: Segment };

    // Build query based on segment type
    let query = supabaseClient
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerUser.customer_id)
      .eq('opt_in', true)
      .is('deleted_at', null)
      .is('opted_out_at', null);

    switch (segment.type) {
      case 'all':
        // No additional filters
        break;
      
      case 'last_scanners':
        if (segment.value) {
          query = query
            .not('last_scan_at', 'is', null)
            .order('last_scan_at', { ascending: false })
            .limit(segment.value);
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

    const { count, error } = await query;

    if (error) throw error;

    const estRecipients = count || 0;
    
    // Recommend package tier
    let recommendedTier = '100';
    if (estRecipients > 1000) recommendedTier = '1200';
    else if (estRecipients > 800) recommendedTier = '1200';
    else if (estRecipients > 500) recommendedTier = '800';
    else if (estRecipients > 250) recommendedTier = '500';
    else if (estRecipients > 100) recommendedTier = '250';

    return new Response(
      JSON.stringify({ estRecipients, recommendedTier }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error estimating campaign:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
