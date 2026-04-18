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

    const { version } = await req.json().catch(() => ({ version: null }));

    // Alle Vertriebler mit outdated-Flag finden
    const { data: outdated, error } = await supabase
      .from("sales_rep_profiles")
      .select("user_id, first_name, last_name, email")
      .eq("vertrag_outdated", true)
      .not("email", "is", null);
    if (error) throw error;

    if (!resendKey) {
      console.warn("RESEND_API_KEY fehlt – keine Mails versendet");
      return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_resend_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const list = outdated || [];
    let sent = 0;
    for (const p of list) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "ELOYO <noreply@eloyo.de>",
            to: [p.email],
            subject: "Wichtig: Neue Vertragsversion verfügbar",
            html: `
              <p>Hallo ${p.first_name || ""},</p>
              <p>es gibt eine <strong>neue Version</strong> deines Vertriebspartnervertrags${version ? ` (<strong>${version}</strong>)` : ""}.</p>
              <p>Bitte logge dich in dein Backoffice ein und nimm die neue Version innerhalb der nächsten <strong>30 Tage</strong> an. Bis dahin sind <strong>Boxenbestellung und Auszahlung gesperrt</strong>.</p>
              <p><a href="https://eloyo.de/vertriebler/vertrag" style="background:#6b21a8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Zum Vertrag →</a></p>
              <p>Viele Grüße,<br>Dein ELOYO Team</p>
            `,
          }),
        });
        sent++;
      } catch (e) { console.error("Mail an", p.email, "fehlgeschlagen:", e); }
    }

    // Admin-Info
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "ELOYO <noreply@eloyo.de>",
          to: [adminEmail],
          subject: `Neue Vertragsversion${version ? ` ${version}` : ""} aktiviert – ${sent} Vertriebler informiert`,
          html: `<p>Eine neue Vertragsversion wurde aktiviert. <strong>${sent}</strong> von ${list.length} Vertrieblern wurden per E-Mail informiert.</p>`,
        }),
      });
    } catch (e) { console.error("Admin-Mail fehlgeschlagen:", e); }

    return new Response(JSON.stringify({ success: true, sent, total: list.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-vertrag-version error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
