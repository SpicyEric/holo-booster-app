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

    // Use Cloudinary Upload API instead of transformation
    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials not configured');
    }

    // First, upload the template to Cloudinary using signed upload
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      throw new Error('Failed to fetch template from storage');
    }
    const templateBuffer = await templateResponse.arrayBuffer();
    const templateBase64 = btoa(String.fromCharCode(...new Uint8Array(templateBuffer)));

    // Create signature for Cloudinary upload
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = `templates/base-template-${timestamp}`;
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', `data:image/png;base64,${templateBase64}`);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('public_id', publicId);
    
    // Generate signature using Web Crypto API
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    formData.append('signature', signature);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorDetail = await uploadResponse.text();
      console.error('Cloudinary upload failed:', errorDetail);
      throw new Error(`Template upload to Cloudinary failed: ${errorDetail}`);
    }

    const uploadData = await uploadResponse.json();
    const cloudinaryTemplateId = uploadData.public_id;

    console.log('Template uploaded to Cloudinary:', cloudinaryTemplateId);

    // Clean offer text
    const offerText = (customer.offer_text || 'Geschenk sichern!').replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, ' ');

    // Build transformation URL using uploaded template
    const transformations = [
      // Overlay QR Code
      `l_fetch:${encodeURIComponent(btoa(customer.qr_code_url))}`,
      'w_400,h_400,c_fill',
      'fl_layer_apply,x_130,y_1100,g_north_west',
    ];

    // Add logo if exists
    if (customer.logo_url) {
      transformations.push(
        `l_fetch:${encodeURIComponent(btoa(customer.logo_url))}`,
        'w_200,h_200,c_fit',
        'fl_layer_apply,x_100,y_100,g_north_west'
      );
    }

    // Add text overlay
    transformations.push(
      `l_text:Arial_56_bold:${encodeURIComponent(offerText)}`,
      'co_rgb:000000',
      'fl_layer_apply,x_874,y_380,g_north_west'
    );

    const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join('/')}/${cloudinaryTemplateId}.png`;

    console.log('Generating design via Cloudinary...');
    console.log('URL:', cloudinaryUrl);

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
