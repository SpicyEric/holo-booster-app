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

    const designUrls: string[] = [];
    const colorScheme = { 
      name: 'purple-pink', 
      primary: '#8B5CF6', 
      secondary: '#EC4899',
      gradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)'
    };

    // Generate design with purple-pink gradient
    const prompt = `Create a modern DIN A3 (297mm x 420mm) horizontal poster design for a loyalty QR code stand with the following EXACT layout:

CRITICAL DESIGN REQUIREMENTS:
1. Top: Purple-pink diagonal gradient stripes in corners (like reference image)
2. Center Top: Company name "${customer.company_name || customer.name}" in large bold font with purple gradient text
3. Layout: HORIZONTAL bullet-style from LEFT to RIGHT:
   - Far LEFT: Medium-sized QR code placeholder (not too large)
   - CENTER-LEFT: Step 1 icon (QR scan icon) + "Scanne den Code."
   - CENTER: Step 2 icon (review/star icon) + "Bewerte ehrlich."
   - CENTER-RIGHT: Step 3 icon (gift icon) + "Erhalte dein Geschenk."
4. Bottom: Large text "${customer.offer_text}" in bold, centered
5. Color scheme: Purple (#8B5CF6) to Pink (#EC4899) gradient
6. Background: Clean white/light gray
7. Icons: Simple, modern line icons in purple
8. Typography: Bold sans-serif fonts
9. Numbers 1, 2, 3 in large purple gradient text
10. Decorative diagonal gradient stripes in top-left and bottom-right corners

Style: Modern, clean, professional, eye-catching. High quality print-ready design.`;

      console.log('Generating A3 design with purple-pink gradient');

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI API error: ${errorText}`);
      }

      const aiData = await aiResponse.json();
      const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageBase64) {
        console.error('No image generated');
        throw new Error('Failed to generate design image');
      }

      // Upload to Supabase Storage
      const base64Data = imageBase64.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const fileName = `${customerId}/design-a3-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('customer-assets')
        .upload(fileName, buffer, {
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

      designUrls.push(publicUrl);

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
