import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFY_SERVICE_SID = "VAe4ceb0ec09ab9f1729db171d70c58f55";

function normalizePhone(input: string): string {
  let d = (input || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return "+" + d.slice(1).replace(/\D/g, "");
  d = d.replace(/^0+/, "");
  return "+49" + d;
}
const isValidE164 = (p: string) => /^\+[1-9]\d{6,14}$/.test(p);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone: rawPhone, channel: rawChannel } = await req.json();
    if (!rawPhone) {
      return new Response(JSON.stringify({ error: "phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const phone = normalizePhone(rawPhone);
    if (!isValidE164(phone)) {
      return new Response(JSON.stringify({ error: "Ungültige Handynummer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const channel = rawChannel === "call" ? "call" : "sms";

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = Date.now();
    const HOUR = new Date(now - 60 * 60 * 1000).toISOString();
    const DAY = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const { count: phoneHour } = await admin
      .from("sms_otp_attempts").select("*", { count: "exact", head: true })
      .eq("phone", phone).gte("created_at", HOUR);
    if ((phoneHour ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Zu viele SMS-Anfragen für diese Nummer. Bitte warte eine Stunde." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: phoneDay } = await admin
      .from("sms_otp_attempts").select("*", { count: "exact", head: true })
      .eq("phone", phone).gte("created_at", DAY);
    if ((phoneDay ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Tageslimit für diese Nummer erreicht. Bitte versuche es morgen erneut." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (ip !== "unknown") {
      const { count: ipHour } = await admin
        .from("sms_otp_attempts").select("*", { count: "exact", head: true })
        .eq("ip_address", ip).gte("created_at", HOUR);
      if ((ipHour ?? 0) >= 10) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen von dieser Verbindung. Bitte warte eine Stunde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Twilio Verify – Start verification
    const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const KEY_SID = Deno.env.get("TWILIO_API_KEY_SID");
    const KEY_SECRET = Deno.env.get("TWILIO_API_KEY_SECRET");
    if (!ACCOUNT_SID || !KEY_SID || !KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Twilio nicht konfiguriert" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const basic = btoa(`${KEY_SID}:${KEY_SECRET}`);

    const tw = await fetch(
      `https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Channel: channel }),
      }
    );
    const twJson = await tw.json();
    if (!tw.ok) {
      console.error("Twilio Verify start error:", twJson);
      const msg = twJson?.message || "SMS-Versand fehlgeschlagen";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("sms_otp_attempts").insert({ phone, ip_address: ip });

    return new Response(JSON.stringify({ success: true, phone, status: twJson.status }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("request-phone-otp error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
