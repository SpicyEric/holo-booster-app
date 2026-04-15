import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = Deno.env.get("ADMIN_EMAIL");

    const now = new Date();
    const fifteenDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    // Find boxes expiring within 15 days
    const { data: warningBoxes, error } = await supabaseAdmin
      .from("eloyo_boxes")
      .select("id, box_id, vertriebler_id, frist_ablauf")
      .eq("status", "versendet")
      .gte("frist_ablauf", now.toISOString())
      .lte("frist_ablauf", fifteenDaysLater.toISOString());

    if (error) throw error;

    console.log(`[BOX-FRIST-WARNUNG] Found ${warningBoxes?.length || 0} boxes expiring soon`);

    if (!warningBoxes || warningBoxes.length === 0) {
      return new Response(JSON.stringify({ success: true, warned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by vertriebler
    const grouped: Record<string, { boxes: typeof warningBoxes; email?: string; name?: string }> = {};
    for (const box of warningBoxes) {
      if (!grouped[box.vertriebler_id]) {
        grouped[box.vertriebler_id] = { boxes: [] };
      }
      grouped[box.vertriebler_id].boxes.push(box);
    }

    // Get profiles and emails
    const userIds = Object.keys(grouped);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, full_name, first_name, last_name")
      .in("user_id", userIds);

    for (const p of profiles || []) {
      if (grouped[p.user_id]) {
        grouped[p.user_id].name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Vertriebspartner';
      }
    }

    // Get emails
    for (const userId of userIds) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userData?.user?.email && grouped[userId]) {
        grouped[userId].email = userData.user.email;
      }
    }

    let warnedCount = 0;

    for (const [userId, data] of Object.entries(grouped)) {
      if (!data.email || !resendKey) continue;

      const boxList = data.boxes.map(b => {
        const days = Math.ceil((new Date(b.frist_ablauf!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return `• ${b.box_id} — Frist läuft in ${days} Tag${days !== 1 ? 'en' : ''} ab (${new Date(b.frist_ablauf!).toLocaleDateString('de-DE')})`;
      }).join('\n');

      const emailBody = `Hallo ${data.name},

die Frist für folgende eloyo Boxen läuft in weniger als 15 Tagen ab:

${boxList}

Bitte schließe die Boxen bei einem Kunden ab oder sende sie unversehrt zurück. Nach Fristablauf werden pro Box 30,00 € in Rechnung gestellt.

Viele Grüße
Dein eloyo Team`;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "eloyo <noreply@eloyo.de>",
            to: data.email,
            subject: `⚠️ Fristablauf: ${data.boxes.length} Box${data.boxes.length > 1 ? 'en' : ''} laufen bald ab`,
            text: emailBody,
          }),
        });

        if (res.ok) {
          warnedCount++;
          console.log(`[BOX-FRIST-WARNUNG] Warned ${data.email} about ${data.boxes.length} boxes`);
        } else {
          console.error(`[BOX-FRIST-WARNUNG] Email failed for ${data.email}:`, await res.text());
        }
      } catch (emailError) {
        console.error(`[BOX-FRIST-WARNUNG] Email error for ${data.email}:`, emailError);
      }
    }

    return new Response(JSON.stringify({ success: true, warned: warnedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[BOX-FRIST-WARNUNG] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
