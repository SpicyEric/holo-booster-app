import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize phone numbers to consistent +49 format
function normalizePhoneNumber(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, '');
  
  if (normalized.startsWith('0049')) {
    normalized = '+49' + normalized.substring(4);
  } else if (normalized.startsWith('049')) {
    normalized = '+49' + normalized.substring(3);
  } else if (normalized.startsWith('49') && !normalized.startsWith('+')) {
    normalized = '+49' + normalized.substring(2);
  } else if (normalized.startsWith('0')) {
    normalized = '+49' + normalized.substring(1);
  } else if (!normalized.startsWith('+')) {
    normalized = '+49' + normalized;
  }
  
  return normalized;
}

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

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);
    console.log('Phone normalization:', phone, '->', normalizedPhone);

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
    const today = new Date().toISOString().split('T')[0];

    // Check for device scan today (same IP hash, ANY phone number)
    const { data: todayDeviceScan } = await supabaseClient
      .from('scans')
      .select('id, contact_id, contacts!inner(phone)')
      .eq('customer_id', customerId)
      .eq('ip_hash', ipHash)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .maybeSingle();

    // CRITICAL LOGIC: Same device, different phone = BLOCKED
    if (todayDeviceScan) {
      const scannedPhone = (todayDeviceScan as any).contacts?.phone;
      if (scannedPhone && scannedPhone !== normalizedPhone) {
        console.warn('BLOCKED: Same device, different phone number detected');
        return new Response(
          JSON.stringify({ 
            error: 'Von diesem Gerät wurde heute bereits mit einer anderen Nummer gescannt. Bitte verwende dieselbe Nummer oder komm morgen wieder.' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if this phone number exists (for this customer)
    const { data: existingContact } = await supabaseClient
      .from('contacts')
      .select('id')
      .eq('customer_id', customerId)
      .eq('phone', normalizedPhone)
      .is('deleted_at', null)
      .maybeSingle();

    const isReturningCustomer = !!existingContact;

    if (isReturningCustomer) {
      console.log('Returning customer detected:', existingContact.id);
      
      // Check if stamp already added today for this phone
      const { data: todayStamp } = await supabaseClient
        .from('stamps')
        .select('id')
        .eq('customer_id', customerId)
        .eq('phone', normalizedPhone)
        .eq('stamp_date', today)
        .maybeSingle();

      if (todayStamp) {
        // Already scanned today - don't block, show stamp card
        const { data: stamps } = await supabaseClient
          .from('stamps')
          .select('id')
          .eq('customer_id', customerId)
          .eq('phone', normalizedPhone);
        
        const stampCount = stamps?.length || 0;
        const stampsRequired = customer.stamps_required || 5;

        console.log('Already scanned today, showing stamp card');
        
        return new Response(
          JSON.stringify({
            isReturningCustomer: true,
            alreadyScannedToday: true,
            stampCount,
            stampsRequired,
            message: 'Du hast heute bereits einen Stempel erhalten! Komm morgen wieder für den nächsten.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add new stamp
      const { error: stampError } = await supabaseClient
        .from('stamps')
        .insert({
          customer_id: customerId,
          phone: normalizedPhone,
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
        .eq('phone', normalizedPhone);

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
          .eq('phone', normalizedPhone);

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

      // Just show stamp card with new stamp
      return new Response(
        JSON.stringify({
          isReturningCustomer: true,
          stampCardComplete: false,
          stampCount,
          stampsRequired,
          newStampAdded: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First time visitor - create contact
    const { data: contact, error: contactError } = await supabaseClient
      .from('contacts')
      .insert({
        customer_id: customerId,
        phone: normalizedPhone,
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
