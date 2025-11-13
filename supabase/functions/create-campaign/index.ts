import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { data: customerUser } = await supabaseClient
      .from('customer_users')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (!customerUser) throw new Error('No customer found for user');

    const { segment, messageText, addUnsubscribe, packageTier, estRecipients } = await req.json();

    // Validate message length
    if (!messageText || messageText.length > 120) {
      throw new Error('Message text must be between 1 and 120 characters');
    }

    // Remove emojis
    const cleanText = messageText.replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}|\u{1F900}-\u{1F9FF}|\u{1F1E0}-\u{1F1FF}]/gu, '');

    // Validate package tier
    if (!['100', '250', '500', '800', '1200'].includes(packageTier)) {
      throw new Error('Invalid package tier');
    }

    // Create campaign
    const { data: campaign, error } = await supabaseClient
      .from('campaigns')
      .insert({
        customer_id: customerUser.customer_id,
        created_by_user_id: user.id,
        segment,
        est_recipients: estRecipients,
        package_tier: packageTier,
        message_text: cleanText,
        add_unsubscribe: true,
        status: 'payment_required'
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ campaign }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating campaign:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
