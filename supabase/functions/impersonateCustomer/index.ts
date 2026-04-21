import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * impersonateCustomer
 *
 * Allows an admin or partner (sales rep) to obtain a one-time login
 * (verifyOtp token_hash) for a freshly created merchant customer account
 * so they can log in AS that customer right after checkout and finish
 * setup (Box-ID, stamp system, etc.) on the customer's behalf.
 *
 * SECURITY:
 *  - Caller must be authenticated.
 *  - Caller must have role 'admin' OR 'partner'.
 *  - Target email must belong to a `customers` row (i.e. a real merchant).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Verify caller
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await admin.auth.getUser(
      token
    );
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    // 2. Check caller role (admin or partner)
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const allowedRoles = new Set(["admin", "partner"]);
    const hasAccess = (roles || []).some((r: { role: string }) =>
      allowedRoles.has(r.role)
    );
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse body
    const { email, customerId } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Confirm a `customers` row exists for this email (safety)
    const { data: customerRow } = await admin
      .from("customers")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (!customerRow) {
      return new Response(
        JSON.stringify({ error: "Customer not yet provisioned" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Generate magic link → return hashed_token to client for verifyOtp
    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData) {
      console.error("[IMPERSONATE] generateLink error:", linkError);
      return new Response(
        JSON.stringify({ error: linkError?.message || "Link error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      return new Response(
        JSON.stringify({ error: "No token_hash returned" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[IMPERSONATE] caller=${callerId} -> customer=${customerRow.id} (${email})`
    );

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: tokenHash,
        customer_id: customerRow.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[IMPERSONATE] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
