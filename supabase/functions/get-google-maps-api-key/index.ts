import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey =
      Deno.env.get('VITE_GOOGLE_MAPS_API_KEY')?.trim() ||
      Deno.env.get('GOOGLE_MAPS_API_KEY')?.trim() ||
      '';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY_MISSING' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ apiKey }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error in get-google-maps-api-key:', error);
    return new Response(
      JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
