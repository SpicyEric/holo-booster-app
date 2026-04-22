import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("VITE_GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: "Google Maps API Key nicht konfiguriert" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Suchbegriff erforderlich (min. 2 Zeichen)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      query: query.trim(),
      key: GOOGLE_MAPS_API_KEY,
      language: "de",
      region: "de",
    });

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
    console.log("Text search:", query);

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Text Search API error:", data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: data.error_message || `Places API: ${data.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const places = (data.results || []).slice(0, 20).map((p: any) => ({
      place_id: p.place_id,
      name: p.name,
      address: p.formatted_address || p.vicinity,
      latitude: p.geometry?.location?.lat,
      longitude: p.geometry?.location?.lng,
      rating: p.rating ?? null,
      reviews_count: p.user_ratings_total ?? null,
      types: p.types || [],
      photo_reference: p.photos?.[0]?.photo_reference || null,
      opening_hours: p.opening_hours ? { open_now: p.opening_hours.open_now } : null,
      business_status: p.business_status,
    }));

    return new Response(JSON.stringify({ success: true, places }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("text-search-places error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
