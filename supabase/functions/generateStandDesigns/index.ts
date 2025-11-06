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

    const { customerId } = await req.json();

    // Get customer data
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Kunde nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer.qr_code_url) {
      return new Response(
        JSON.stringify({ error: 'Bitte generiere zuerst einen QR-Code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting template-based design generation...');

    // Check if template exists in Supabase Storage
    const { data: templateExists } = await supabaseClient
      .storage
      .from('customer-assets')
      .list('', {
        search: 'base-template.png'
      });

    if (!templateExists || templateExists.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Base template not found. Please upload the template first.',
          needsTemplate: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get template URL
    const { data: { publicUrl: templateUrl } } = supabaseClient
      .storage
      .from('customer-assets')
      .getPublicUrl('base-template.png');

    console.log('Template URL:', templateUrl);

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials not configured');
    }

    // Clean offer text
    const offerText = (customer.offer_text || 'Geschenk sichern!').slice(0, 100);

    // Build Cloudinary transformation URL with proper syntax
    // Using auto-upload with remote fetch
    // Design dimensions: 1414x2000px
    // QR Code position: x=224px (0.1584), y=759px (0.3795)
    // QR Code size: 285x285px (0.2016 x 0.1425)
    const transformations = [
      // Base layer: template
      'f_auto',
      'q_auto',
      // QR Code overlay
      `l_fetch:${encodeURIComponent(customer.qr_code_url).replace(/%/g, '%25')}`,
      'w_285,h_285,c_fill',
      'fl_layer_apply',
      'x_224,y_759,g_north_west',
      // Logo overlay (if exists)
    ];

    if (customer.logo_url) {
      transformations.push(
        `l_fetch:${encodeURIComponent(customer.logo_url).replace(/%/g, '%25')}`,
        'w_200,h_200,c_fit',
        'fl_layer_apply',
        'x_100,y_100,g_north_west'
      );
    }

    // Text overlay
    transformations.push(
      `l_text:Arial_56_bold:${encodeURIComponent(offerText)}`,
      'co_rgb:000000',
      'fl_layer_apply',
      'x_874,y_380,g_north_west'
    );

    // Use fetch with the template URL as base
    const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/fetch/${transformations.join(',')}/${encodeURIComponent(templateUrl)}`;

    console.log('Generating design via Cloudinary fetch...');
    console.log('URL length:', cloudinaryUrl.length);

    // Fetch composed image
    const imageResponse = await fetch(cloudinaryUrl);
    
    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Cloudinary error:', errorText);
      throw new Error(`Cloudinary composition failed: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);

    // Upload final design to Supabase Storage
    const fileName = `${customerId}/design-a5-${Date.now()}.png`;
    const { error: uploadError } = await supabaseClient
      .storage
      .from('customer-assets')
      .upload(fileName, uint8Array, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload design to storage');
    }

    const { data: { publicUrl } } = supabaseClient
      .storage
      .from('customer-assets')
      .getPublicUrl(fileName);

    const designUrls = [publicUrl];

    // Update customer with design URLs
    const { error: updateError } = await supabaseClient
      .from('customers')
      .update({ design_urls: designUrls })
      .eq('id', customerId);

    if (updateError) {
      console.error('Error updating customer:', updateError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Speichern der Designs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ designUrls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generateStandDesigns:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
