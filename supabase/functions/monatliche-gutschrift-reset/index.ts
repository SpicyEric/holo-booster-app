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

    // Mark all 'available' initial commissions as 'paid' (ausgezahlt)
    const { data: updated, error } = await supabase
      .from("commissions")
      .update({ status: "paid" })
      .eq("commission_type", "initial")
      .eq("status", "available")
      .select("id");

    if (error) throw error;

    const count = updated?.length || 0;
    console.log(`[monatliche-gutschrift-reset] ${count} Direktprovisionen auf 'paid' gesetzt`);

    return new Response(JSON.stringify({ success: true, updated_count: count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("monatliche-gutschrift-reset error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
