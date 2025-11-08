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

    const { customerId, phone, optIn } = await req.json();

    console.log('Capturing contact:', { customerId, phone: phone ? 'provided' : 'none', optIn });

    // GDPR: Require explicit opt-in
    if (!optIn) {
      console.error('Opt-in required but not provided');
      return new Response(
        JSON.stringify({ error: 'Opt-in erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Telefonnummer erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate customer exists and is active
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('id, name, offer_text, stamps_required, stamp_reward_text')
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

    // Hash IP for GDPR compliance
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

    // Check if this phone number has been here before
    const { data: existingContact } = await supabaseClient
      .from('contacts')
      .select('id')
      .eq('customer_id', customerId)
      .eq('phone', phone)
      .maybeSingle();

    const isReturningCustomer = !!existingContact;

    if (isReturningCustomer) {
      console.log('Returning customer detected:', existingContact.id);
      
      // Check if stamp already added today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayStamp } = await supabaseClient
        .from('stamps')
        .select('id')
        .eq('customer_id', customerId)
        .eq('phone', phone)
        .eq('stamp_date', today)
        .maybeSingle();

      if (todayStamp) {
        return new Response(
          JSON.stringify({ error: 'Du hast heute bereits einen Stempel erhalten! Komm morgen wieder.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add new stamp
      const { error: stampError } = await supabaseClient
        .from('stamps')
        .insert({
          customer_id: customerId,
          phone: phone,
          stamp_date: today,
        });

      if (stampError) {
        console.error('Error creating stamp:', stampError);
        return new Response(
          JSON.stringify({ error: 'Fehler beim Erstellen des Stempels' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Count total stamps
      const { data: stamps, error: stampCountError } = await supabaseClient
        .from('stamps')
        .select('id')
        .eq('customer_id', customerId)
        .eq('phone', phone);

      if (stampCountError) {
        console.error('Error counting stamps:', stampCountError);
      }

      const stampCount = stamps?.length || 0;
      const stampsRequired = customer.stamps_required || 5;
      const stampCardComplete = stampCount >= stampsRequired;

      console.log(`Stamp added. Count: ${stampCount}/${stampsRequired}, Complete: ${stampCardComplete}`);

      // Create scan record
      await supabaseClient
        .from('scans')
        .insert({
          customer_id: customerId,
          contact_id: existingContact.id,
          ip_hash: ipHash,
          user_agent: userAgent,
        });

      // If stamp card complete, generate voucher
      if (stampCardComplete) {
        // Reset stamps for this customer
        await supabaseClient
          .from('stamps')
          .delete()
          .eq('customer_id', customerId)
          .eq('phone', phone);

        // Generate voucher code
        const voucherCode = `${customer.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        const { error: claimError } = await supabaseClient
          .from('claims')
          .insert({
            customer_id: customerId,
            contact_id: existingContact.id,
            code: voucherCode,
            expire_at: expireAt.toISOString(),
          });

        if (claimError) {
          console.error('Error creating claim:', claimError);
        }

        return new Response(
          JSON.stringify({
            isReturningCustomer: true,
            stampCardComplete: true,
            stampCount: 0, // Reset
            voucherCode,
            expiresAt: expireAt.toISOString(),
            offerText: customer.stamp_reward_text || customer.offer_text,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Just show stamp card
      return new Response(
        JSON.stringify({
          isReturningCustomer: true,
          stampCardComplete: false,
          stampCount,
          stampsRequired,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First time visitor - create contact
    const { data: contact, error: contactError } = await supabaseClient
      .from('contacts')
      .insert({
        customer_id: customerId,
        phone: phone,
        opt_in: true,
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

    console.log('New contact created:', contact.id);

    // Create scan record
    await supabaseClient
      .from('scans')
      .insert({
        customer_id: customerId,
        contact_id: contact.id,
        ip_hash: ipHash,
        user_agent: userAgent,
      });

    // Generate voucher for first time (after Google review)
    const voucherCode = `${customer.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { error: claimError } = await supabaseClient
      .from('claims')
      .insert({
        customer_id: customerId,
        contact_id: contact.id,
        code: voucherCode,
        expire_at: expireAt.toISOString(),
      });

    if (claimError) {
      console.error('Error creating claim:', claimError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Erstellen des Gutscheins' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Claim created for new visitor:', voucherCode);

    return new Response(
      JSON.stringify({
        isReturningCustomer: false,
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