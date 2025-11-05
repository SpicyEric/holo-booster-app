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

    const { customerId, email, phone, optIn } = await req.json();

    console.log('Capturing contact:', { customerId, email: email ? 'provided' : 'none', phone: phone ? 'provided' : 'none', optIn });

    // GDPR: Require explicit opt-in
    if (!optIn) {
      console.error('Opt-in required but not provided');
      return new Response(
        JSON.stringify({ error: 'Opt-in erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate customer exists and is active
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('id, name, offer_text')
      .eq('id', customerId)
      .eq('active', true)
      .maybeSingle();

    if (customerError || !customer) {
      console.error('Customer not found or inactive:', customerError);
      return new Response(
        JSON.stringify({ error: 'Kunde nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash IP for GDPR compliance (use IP hash instead of full IP)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ipHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(clientIp + Deno.env.get('SUPABASE_DB_URL'))
    ).then(buffer => 
      Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    );

    const userAgent = req.headers.get('user-agent') || '';

    // Check for existing contact and active claims (duplicate prevention)
    const { data: existingContact } = await supabaseClient
      .from('contacts')
      .select('id')
      .eq('customer_id', customerId)
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle();

    if (existingContact) {
      // Check if active claim exists
      const { data: activeClaim } = await supabaseClient
        .from('claims')
        .select('id, expire_at')
        .eq('contact_id', existingContact.id)
        .is('redeemed_at', null)
        .gt('expire_at', new Date().toISOString())
        .maybeSingle();
      
      if (activeClaim) {
        console.log('Active claim exists for contact:', existingContact.id);
        return new Response(
          JSON.stringify({ error: 'Du hast bereits einen aktiven Gutschein! Bitte löse diesen zuerst ein.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create contact with opt-in
    const { data: contact, error: contactError } = await supabaseClient
      .from('contacts')
      .insert({
        customer_id: customerId,
        email: email || null,
        phone: phone || null,
        opt_in: true, // Explicit opt-in confirmed
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error creating contact:', contactError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Speichern der Kontaktdaten' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contact created:', contact.id);

    // Create scan record
    const { error: scanError } = await supabaseClient
      .from('scans')
      .insert({
        customer_id: customerId,
        contact_id: contact.id,
        ip_hash: ipHash,
        user_agent: userAgent,
      });

    if (scanError) {
      console.error('Error creating scan:', scanError);
    }

    // Generate voucher code (15-minute expiry)
    const voucherCode = `${customer.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { data: claim, error: claimError } = await supabaseClient
      .from('claims')
      .insert({
        customer_id: customerId,
        contact_id: contact.id,
        code: voucherCode,
        expire_at: expireAt.toISOString(),
      })
      .select()
      .single();

    if (claimError) {
      console.error('Error creating claim:', claimError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Erstellen des Gutscheins' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Claim created:', claim.id, 'Code:', voucherCode);

    // Send confirmation email asynchronously (non-blocking)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const emailPromise = fetch(`${supabaseUrl}/functions/v1/sendConfirmationEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: email || phone || '',
        customerName: customer.name,
        offerText: customer.offer_text,
        unsubscribeToken: contact.unsubscribe_token,
      }),
    }).catch(err => console.error('Email sending failed (non-blocking):', err));

    // Start email sending but don't wait for it
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(emailPromise);
    }

    return new Response(
      JSON.stringify({
        voucherCode,
        expiresAt: expireAt.toISOString(),
        offerText: customer.offer_text,
        unsubscribeToken: contact.unsubscribe_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in publicCaptureContact:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
