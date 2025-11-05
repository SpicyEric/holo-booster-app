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
    const colorSchemes = [
      { name: 'purple', primary: '#8B5CF6', secondary: '#EC4899' },
      { name: 'blue', primary: '#3B82F6', secondary: '#06B6D4' },
      { name: 'green', primary: '#10B981', secondary: '#F59E0B' },
    ];

    // Generate 3 designs with different color schemes
    for (const scheme of colorSchemes) {
      const prompt = `Create a modern DIN A5 (148mm x 210mm) vertical poster design for a loyalty QR code stand with the following elements:
      
1. Company name "${customer.company_name || customer.name}" prominently displayed at the top in elegant typography
2. A clean, modern layout with ${scheme.primary} and ${scheme.secondary} gradient color scheme
3. Three numbered steps in the middle:
   - Step 1: "Scanne den Code" (Scan the code) with QR code icon
   - Step 2: "Beantworte 3 Fragen" (Answer 3 questions) with form icon
   - Step 3: "Erhalte dein Geschenk" (Receive your gift) with gift icon
4. A placeholder square in the center for QR code (150mm x 150mm)
5. The offer text "${customer.offer_text}" displayed attractively below the steps
6. Modern, professional design suitable for retail/gastronomy
7. Clean white or light background with gradient accents
8. Icons should be simple and modern
9. Use sans-serif fonts
10. High quality, print-ready design

The design should be eye-catching, professional, and encourage customers to scan the QR code.`;

      console.log('Generating design with color scheme:', scheme.name);

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
        console.error('AI API error:', await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageBase64) {
        console.error('No image generated for scheme:', scheme.name);
        continue;
      }

      // Upload to Supabase Storage
      const base64Data = imageBase64.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const fileName = `${customerId}/design-${scheme.name}-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('customer-assets')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('customer-assets')
        .getPublicUrl(fileName);

      designUrls.push(publicUrl);
    }

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
