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

    const { place_id } = await req.json();
    if (!place_id) {
      return new Response(JSON.stringify({ error: "place_id erforderlich" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      place_id,
      key: GOOGLE_MAPS_API_KEY,
      language: "de",
      fields: "name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,types,geometry,address_components,opening_hours,photos,url",
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      return new Response(
        JSON.stringify({ error: data.error_message || `Places API: ${data.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const r = data.result;
    const components = r.address_components || [];
    const getComponent = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || null;

    // Build photo URL
    let photoUrl = null;
    if (r.photos?.[0]?.photo_reference) {
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
    }

    const details = {
      place_id,
      name: r.name,
      address: r.formatted_address,
      street: getComponent("route"),
      house_number: getComponent("street_number"),
      postal_code: getComponent("postal_code"),
      city: getComponent("locality") || getComponent("administrative_area_level_1"),
      latitude: r.geometry?.location?.lat,
      longitude: r.geometry?.location?.lng,
      phone: r.formatted_phone_number || r.international_phone_number || null,
      website: r.website || null,
      google_rating: r.rating || null,
      google_reviews_count: r.user_ratings_total || 0,
      google_photo_url: photoUrl,
      types: r.types || [],
      opening_hours: r.opening_hours?.weekday_text || null,
      google_maps_url: r.url || null,
    };

    return new Response(JSON.stringify({ success: true, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("place-details error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
