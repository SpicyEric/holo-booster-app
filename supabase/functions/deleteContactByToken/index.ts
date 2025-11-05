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

    console.log('Deleting contact by token');

    // Find contact by unsubscribe token
    const { data: contact, error: contactError } = await supabaseClient
      .from('contacts')
      .select('id, customer_id')
      .eq('unsubscribe_token', token)
      .is('deleted_at', null)
      .maybeSingle();

    if (contactError || !contact) {
      console.error('Contact not found:', contactError);
      return new Response(
        JSON.stringify({ error: 'Kontakt nicht gefunden oder bereits gelöscht' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create audit log entry (GDPR-compliant: no PII stored)
    const { error: auditError } = await supabaseClient
      .from('contact_deletions')
      .insert({
        customer_id: contact.customer_id,
        deletion_method: 'self_service',
      });

    if (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    // Hard delete contact (GDPR Art. 17 - Right to Erasure)
    // This will cascade delete all related claims due to ON DELETE CASCADE
    const { error: deleteError } = await supabaseClient
      .from('contacts')
      .delete()
      .eq('id', contact.id);

    if (deleteError) {
      console.error('Error deleting contact:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Löschen der Daten' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contact deleted successfully:', contact.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Daten erfolgreich gelöscht' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in deleteContactByToken:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
