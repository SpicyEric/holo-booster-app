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

    // Use Cloudinary to compose the image
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials not configured');
    }

    // Encode URLs for Cloudinary fetch
    const qrUrlEncoded = btoa(customer.qr_code_url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const logoUrlEncoded = customer.logo_url ? btoa(customer.logo_url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : null;
    const templateUrlEncoded = btoa(templateUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Clean offer text for display
    const offerText = (customer.offer_text || 'Geschenk sichern!').replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '');

    // Build transformation layers
    const layers = [];
    
    // Layer 1: QR Code at position x=130, y=1100 (from top), size=400x400
    layers.push(`l_fetch:${qrUrlEncoded}/w_400,h_400,c_fill/x_130,y_1100,g_north_west/fl_layer_apply`);
    
    // Layer 2: Logo at position x=100, y=100 (from top), size=200x200 (if exists)
    if (logoUrlEncoded) {
      layers.push(`l_fetch:${logoUrlEncoded}/w_200,h_200,c_fit/x_100,y_100,g_north_west/fl_layer_apply`);
    }
    
    // Layer 3: Text centered at x=874, y=380
    layers.push(`l_text:Arial_56_bold:${encodeURIComponent(offerText)}/co_rgb:000000/x_874,y_380,g_north_west/fl_layer_apply`);

    // Build final Cloudinary URL
    const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${layers.join('/')}/f_png/l_fetch:${templateUrlEncoded}/fl_layer_apply`;

    console.log('Generating design via Cloudinary...');
    console.log('URL:', cloudinaryUrl);

    // Fetch composed image from Cloudinary
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
