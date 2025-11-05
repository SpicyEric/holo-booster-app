import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up contact by token');

    // Find contact by unsubscribe token
    const { data: contact, error: contactError } = await supabaseClient
      .from('contacts')
      .select('id, email, phone, created_at, customer_id')
      .eq('unsubscribe_token', token)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (contactError || !contact) {
      console.error('Contact not found:', contactError);
      return new Response(
        JSON.stringify({ error: 'Kontakt nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer name separately
    const { data: customer } = await supabaseClient
      .from('customers')
      .select('name')
      .eq('id', contact.customer_id)
      .single();

    console.log('Contact found:', contact.id);

    // Return contact data (GDPR Art. 15 - Right of Access)
    return new Response(
      JSON.stringify({
        email: contact.email,
        phone: contact.phone,
        createdAt: contact.created_at,
        customerName: customer?.name || 'Unbekannt',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in lookupContactByToken:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
