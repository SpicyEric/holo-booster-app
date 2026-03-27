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

    const { latitude, longitude, radius, type, keyword } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: "Koordinaten erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      radius: String(Math.min(radius || 5000, 50000)),
      key: GOOGLE_MAPS_API_KEY,
      language: "de",
    });

    if (type) params.set("type", type);
    if (keyword) params.set("keyword", keyword);

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
    console.log("Searching places:", { latitude, longitude, radius, type, keyword });

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: data.error_message || `Places API: ${data.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map results to a clean format
    const places = (data.results || []).map((p: any) => ({
      place_id: p.place_id,
      name: p.name,
      address: p.vicinity || p.formatted_address,
      latitude: p.geometry?.location?.lat,
      longitude: p.geometry?.location?.lng,
      rating: p.rating,
      reviews_count: p.user_ratings_total,
      types: p.types,
      photo_reference: p.photos?.[0]?.photo_reference || null,
      opening_hours: p.opening_hours ? { open_now: p.opening_hours.open_now } : null,
      business_status: p.business_status,
    }));

    return new Response(JSON.stringify({ success: true, places }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-places error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
