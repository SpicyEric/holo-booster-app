import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { street, houseNumber, postalCode, city } = await req.json();
    
    const OPENCAGE_API_KEY = Deno.env.get('OPENCAGE_API_KEY');
    if (!OPENCAGE_API_KEY) {
      console.error('OPENCAGE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build address string
    const addressParts = [street, houseNumber, postalCode, city, 'Germany'].filter(Boolean);
    const address = addressParts.join(' ');
    
    console.log('Geocoding address:', address);

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${OPENCAGE_API_KEY}&language=de&countrycode=de&limit=1`;
    
    const response = await fetch(url);
    const data = await response.json();

    console.log('OpenCage response status:', data.status?.code);

    if (data.status?.code !== 200) {
      console.error('OpenCage API error:', data.status);
      return new Response(
        JSON.stringify({ error: 'Geocoding failed', details: data.status?.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data.results || data.results.length === 0) {
      console.log('No results found for address');
      return new Response(
        JSON.stringify({ error: 'Address not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.results[0];
    const coordinates = {
      lat: result.geometry.lat,
      lng: result.geometry.lng,
      formatted: result.formatted,
      confidence: result.confidence
    };

    console.log('Geocoding successful:', coordinates);

    return new Response(
      JSON.stringify(coordinates),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geocoding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
