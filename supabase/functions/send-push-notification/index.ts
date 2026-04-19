import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const textEncoder = new TextEncoder();

function toBase64Url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    toBase64Url(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: serviceAccount.token_uri,
        iat: now,
        exp: now + 3600,
      })
    ),
  ].join(".");

  const pemContents = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      textEncoder.encode(unsignedToken)
    )
  );

  const signedToken = `${unsignedToken}.${toBase64Url(signature)}`;
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedToken,
    }),
  });

  const tokenText = await tokenResponse.text();
  let tokenData: Record<string, unknown> = {};

  try {
    tokenData = tokenText ? JSON.parse(tokenText) : {};
  } catch {
    throw new Error(`Failed to parse access token response: ${tokenText}`);
  }

  if (!tokenResponse.ok || typeof tokenData.access_token !== "string") {
    throw new Error(`Failed to get access token: ${tokenText}`);
  }

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let user_id: string | undefined;
  let title = "";
  let body = "";
  let data: Record<string, unknown> | undefined;
  let source: string | undefined;
  let trigger_function: string | undefined;

  try {
    const payload = await req.json();
    user_id = payload.user_id;
    title = payload.title;
    body = payload.body;
    data = payload.data;
    source = payload.source;
    trigger_function = payload.trigger_function;

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lookup recipient info for richer logs
    let recipient_email: string | null = null;
    let recipient_name: string | null = null;
    try {
      const { data: userInfo } = await supabase.auth.admin.getUserById(user_id);
      recipient_email = userInfo?.user?.email ?? null;
      const meta = userInfo?.user?.user_metadata ?? {};
      recipient_name = (meta as any).full_name || (meta as any).name || null;
    } catch (_e) {
      // ignore lookup failures
    }

    // Get service account
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not configured");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);

    // Get device tokens for user
    const { data: tokens, error: tokensError } = await supabase
      .from("device_tokens")
      .select("fcm_token, platform")
      .eq("user_id", user_id);

    if (tokensError) throw tokensError;

    if (!tokens || tokens.length === 0) {
      await supabase.from("push_notification_logs").insert({
        user_id,
        recipient_email,
        recipient_name,
        title,
        body,
        data: data ?? null,
        source: source ?? null,
        trigger_function: trigger_function ?? null,
        device_count: 0,
        sent_count: 0,
        failed_count: 0,
        invalid_token_count: 0,
        status: "no_devices",
      });

      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "no_device_tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get FCM access token
    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];
    const fcmResponses: Array<Record<string, unknown>> = [];

    for (const { fcm_token, platform } of tokens) {
      try {
        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token: fcm_token,
                notification: { title, body },
                data: data
                  ? Object.fromEntries(
                      Object.entries(data).map(([k, v]) => [k, String(v)])
                    )
                  : {},
                android: {
                  priority: "high",
                  notification: {
                    sound: "default",
                    channel_id: "eloyo_messages",
                  },
                },
                apns: {
                  headers: {
                    "apns-priority": "10",
                    "apns-push-type": "alert",
                  },
                  payload: {
                    aps: {
                      alert: { title, body },
                      sound: "default",
                      badge: 1,
                      "mutable-content": 1,
                    },
                  },
                },
              },
            }),
          }
        );

        const result = await fcmResponse.json();
        fcmResponses.push({
          platform,
          token_preview: `${fcm_token.slice(0, 12)}…${fcm_token.slice(-6)}`,
          ok: fcmResponse.ok,
          status: fcmResponse.status,
          response: result,
        });

        if (fcmResponse.ok) {
          sent++;
        } else {
          failed++;
          console.error("FCM error:", result);
          if (
            result?.error?.code === 404 ||
            result?.error?.details?.some(
              (d: any) => d.errorCode === "UNREGISTERED"
            )
          ) {
            invalidTokens.push(fcm_token);
          }
        }
      } catch (err) {
        failed++;
        console.error("Error sending to token:", err);
        fcmResponses.push({
          platform,
          token_preview: `${fcm_token.slice(0, 12)}…${fcm_token.slice(-6)}`,
          ok: false,
          error: (err as Error).message,
        });
      }
    }

    // Cleanup invalid tokens
    if (invalidTokens.length > 0) {
      await supabase
        .from("device_tokens")
        .delete()
        .in("fcm_token", invalidTokens);
      console.log(`Cleaned up ${invalidTokens.length} invalid tokens`);
    }

    // Persist log
    const status =
      sent > 0 && failed === 0
        ? "success"
        : sent > 0 && failed > 0
        ? "partial"
        : "failed";

    await supabase.from("push_notification_logs").insert({
      user_id,
      recipient_email,
      recipient_name,
      title,
      body,
      data: data ?? null,
      source: source ?? null,
      trigger_function: trigger_function ?? null,
      device_count: tokens.length,
      sent_count: sent,
      failed_count: failed,
      invalid_token_count: invalidTokens.length,
      status,
      fcm_responses: fcmResponses,
    });

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    try {
      await supabase.from("push_notification_logs").insert({
        user_id: user_id ?? null,
        title: title || "(unknown)",
        body: body || "(unknown)",
        data: data ?? null,
        source: source ?? null,
        trigger_function: trigger_function ?? null,
        status: "error",
        error_message: (error as Error).message,
      });
    } catch (_e) {
      // ignore log failure
    }
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
