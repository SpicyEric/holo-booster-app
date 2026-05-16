import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(input: string): string {
  let d = (input || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return "+" + d.slice(1).replace(/\D/g, "");
  d = d.replace(/^0+/, "");
  return "+49" + d;
}
const isValidE164 = (p: string) => /^\+[1-9]\d{6,14}$/.test(p);

function generateOtp(): string {
  // 6-digit, cryptographically random
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, "0");
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone: rawPhone } = await req.json();
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

    const SEVEN_API_KEY = Deno.env.get("SEVEN_API_KEY");
    if (!SEVEN_API_KEY) {
      return new Response(JSON.stringify({ error: "SMS-Provider nicht konfiguriert" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate + store hashed OTP (5 minutes valid)
    const code = generateOtp();
    const code_hash = await sha256(`${phone}:${code}`);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate previous unused codes for this phone
    await admin.from("phone_otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("phone", phone)
      .is("used_at", null);

    const { error: insErr } = await admin.from("phone_otp_codes").insert({
      phone, code_hash, expires_at, ip_address: ip,
    });
    if (insErr) {
      console.error("phone_otp_codes insert error:", insErr);
      return new Response(JSON.stringify({ error: "OTP konnte nicht erstellt werden" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via seven.io
    const text = `Dein eloyo Bestätigungscode: ${code}\nGültig 5 Minuten.`;
    const sv = await fetch("https://gateway.seven.io/api/sms", {
      method: "POST",
      headers: {
        "X-Api-Key": SEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: phone, text, from: "eloyo" }),
    });
    const svJson = await sv.json().catch(() => ({}));
    // seven.io returns { success: "100", ... } on success
    const okCode = String((svJson as any)?.success ?? "");
    if (!sv.ok || (okCode && okCode !== "100")) {
      console.error("seven.io send error:", svJson);
      return new Response(JSON.stringify({ error: "SMS-Versand fehlgeschlagen" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("sms_otp_attempts").insert({ phone, ip_address: ip });

    return new Response(JSON.stringify({ success: true, phone }), {
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
