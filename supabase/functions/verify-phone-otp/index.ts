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
const syntheticEmail = (phone: string) =>
  `phone${phone.replace(/\D/g, "")}@phone-auth.eloyo.de`;

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const rawPhone = body?.phone;
    const code = String(body?.code ?? "").trim();
    const mode = body?.mode === "change" ? "change" : "login";

    if (!rawPhone || !code) {
      return new Response(JSON.stringify({ error: "phone und code erforderlich" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const phone = normalizePhone(rawPhone);
    if (!isValidE164(phone)) {
      return new Response(JSON.stringify({ error: "Ungültige Handynummer" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Look up latest unused code for this phone
    const { data: otpRow, error: otpErr } = await admin
      .from("phone_otp_codes")
      .select("id, code_hash, expires_at, used_at, attempts")
      .eq("phone", phone)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpErr || !otpRow) {
      return new Response(JSON.stringify({ error: "Kein gültiger Code. Bitte neu anfordern." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(otpRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code ist abgelaufen. Bitte neu anfordern." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((otpRow.attempts ?? 0) >= 5) {
      await admin.from("phone_otp_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", otpRow.id);
      return new Response(JSON.stringify({ error: "Zu viele Fehlversuche. Bitte neu anfordern." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = await sha256(`${phone}:${code}`);
    if (expected !== otpRow.code_hash) {
      await admin.from("phone_otp_codes")
        .update({ attempts: (otpRow.attempts ?? 0) + 1 })
        .eq("id", otpRow.id);
      return new Response(JSON.stringify({ error: "Code ist ungültig oder abgelaufen." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark code as used
    await admin.from("phone_otp_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", otpRow.id);

    if (mode === "change") {
      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      if (!jwt) {
        return new Response(JSON.stringify({ error: "Nicht angemeldet" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Session ungültig" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(
        userData.user.id,
        { phone, phone_confirm: true }
      );
      if (updErr) {
        console.error("updateUserById error:", updErr);
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, phone }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // mode = login: ensure synthetic-email user exists, then issue magiclink token_hash
    const email = syntheticEmail(phone);

    let link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error || !link.data?.properties?.hashed_token) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { auth_method: "phone", created_via: "seven_io" },
      });
      if (createErr && !/already/i.test(createErr.message)) {
        console.error("createUser error:", createErr);
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (link.error || !link.data?.properties?.hashed_token) {
        console.error("generateLink error:", link.error);
        return new Response(JSON.stringify({ error: "Login konnte nicht erstellt werden" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: link.data.properties.hashed_token,
        email_otp: link.data.properties.email_otp,
        email,
        phone,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("verify-phone-otp error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
