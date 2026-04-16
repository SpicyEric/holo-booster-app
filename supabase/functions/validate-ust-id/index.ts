import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Nicht authentifiziert");

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user) throw new Error("Nicht authentifiziert");

    const { vat_id } = await req.json();
    if (!vat_id || typeof vat_id !== "string") {
      throw new Error("Keine USt-IdNr. angegeben");
    }

    // Clean the VAT ID - remove spaces, ensure uppercase
    const cleaned = vat_id.replace(/\s/g, "").toUpperCase();

    // Extract country code and number
    const countryCode = cleaned.substring(0, 2);
    const vatNumber = cleaned.substring(2);

    if (!countryCode || !vatNumber) {
      throw new Error("Ungültiges Format. Bitte im Format DE123456789 eingeben.");
    }

    // Call VIES REST API
    const viesResponse = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryCode}/vat/${vatNumber}`,
      { method: "GET" }
    );

    if (!viesResponse.ok) {
      const errorText = await viesResponse.text();
      console.error("VIES API error:", viesResponse.status, errorText);
      throw new Error("VIES-Service ist derzeit nicht erreichbar. Bitte versuche es später erneut.");
    }

    const data = await viesResponse.json();

    if (!data.isValid) {
      // Mark as not verified in DB
      await supabase
        .from("sales_rep_profiles")
        .update({ ust_id_verified: false } as any)
        .eq("user_id", user.id);

      return new Response(JSON.stringify({
        valid: false,
        message: "USt-IdNr. ist ungültig oder nicht aktiv.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valid - update DB
    await supabase
      .from("sales_rep_profiles")
      .update({ ust_id_verified: true, vat_id: cleaned } as any)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({
      valid: true,
      name: data.name || "",
      address: data.address || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("validate-ust-id error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
