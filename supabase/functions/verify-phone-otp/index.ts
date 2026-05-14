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
const syntheticEmail = (phone: string) =>
  `phone${phone.replace(/\D/g, "")}@phone-auth.eloyo.de`;

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

    const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const KEY_SID = Deno.env.get("TWILIO_API_KEY_SID");
    const KEY_SECRET = Deno.env.get("TWILIO_API_KEY_SECRET");
    if (!ACCOUNT_SID || !KEY_SID || !KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Twilio nicht konfiguriert" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const basic = btoa(`${KEY_SID}:${KEY_SECRET}`);

    // Twilio Verify – Check
    const tw = await fetch(
      `https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, Code: code }),
      }
    );
    const twJson = await tw.json();
    if (!tw.ok || twJson?.status !== "approved") {
      console.warn("Verify check failed:", twJson);
      return new Response(
        JSON.stringify({ error: "Code ist ungültig oder abgelaufen." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (mode === "change") {
      // Add/replace phone on currently authenticated user
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
      // user probably doesn't exist yet → create
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { auth_method: "phone", created_via: "twilio_verify" },
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
