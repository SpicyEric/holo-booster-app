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
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "support@eloyo.de";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Vertriebler die seit > 30 Tagen outdated sind und noch nicht inaktiv → vertrag_inaktiv = true
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: candidates, error: selErr } = await supabase
      .from("sales_rep_profiles")
      .select("user_id, first_name, last_name, email, vertrag_outdated_seit")
      .eq("vertrag_outdated", true)
      .neq("vertrag_inaktiv", true)
      .lte("vertrag_outdated_seit", cutoff);
    if (selErr) throw selErr;

    const list = candidates || [];
    if (list.length === 0) {
      return new Response(JSON.stringify({ success: true, marked_inactive: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = list.map(p => p.user_id);
    const { error: updErr } = await supabase
      .from("sales_rep_profiles")
      .update({ vertrag_inaktiv: true, updated_at: new Date().toISOString() })
      .in("user_id", ids);
    if (updErr) throw updErr;

    // Admin-Info
    if (resendKey) {
      try {
        const liste = list.map(p => `<li>${p.first_name || ""} ${p.last_name || ""} (${p.email || "?"})</li>`).join("");
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "ELOYO <noreply@eloyo.de>",
            to: [adminEmail],
            subject: `${list.length} Vertriebler nach 30 Tagen als inaktiv markiert`,
            html: `<p>Folgende Vertriebler haben die neue Vertragsversion innerhalb von 30 Tagen nicht angenommen und wurden als <strong>inaktiv</strong> markiert (Boxenbestellung & Auszahlung gesperrt):</p><ul>${liste}</ul>`,
          }),
        });
      } catch (e) { console.error("Admin-Mail fehlgeschlagen:", e); }
    }

    return new Response(JSON.stringify({ success: true, marked_inactive: list.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("cleanup-vertrag-outdated error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
