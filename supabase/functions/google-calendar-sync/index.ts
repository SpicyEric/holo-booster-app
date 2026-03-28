import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

async function getValidAccessToken(
  supabase: any,
  userId: string,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow) return null;

  // Check if token is still valid (with 5min buffer)
  const expiresAt = new Date(tokenRow.token_expires_at).getTime();
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return tokenRow.access_token;
  }

  // Refresh the token
  const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenRow.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const refreshData = await refreshRes.json();
  if (refreshData.error) {
    console.error("Token refresh failed:", refreshData);
    // Delete invalid tokens
    await supabase.from("google_calendar_tokens").delete().eq("user_id", userId);
    return null;
  }

  const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from("google_calendar_tokens")
    .update({
      access_token: refreshData.access_token,
      token_expires_at: newExpiresAt,
      ...(refreshData.refresh_token ? { refresh_token: refreshData.refresh_token } : {}),
    })
    .eq("user_id", userId);

  return refreshData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("No auth token");

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { action, appointment } = await req.json();

    const accessToken = await getValidAccessToken(supabase, user.id, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "not_connected", message: "Google Calendar nicht verbunden" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      const startDate = new Date(appointment.scheduled_at);
      const endDate = new Date(startDate.getTime() + (appointment.duration_minutes || 60) * 60000);

      const event = {
        summary: appointment.title,
        description: appointment.description || undefined,
        location: appointment.address || undefined,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: "Europe/Berlin",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "Europe/Berlin",
        },
      };

      const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(`Google Calendar API error: ${JSON.stringify(data)}`);

      // Store the Google Calendar event ID
      if (appointment.id && data.id) {
        await supabase
          .from("pipeline_appointments")
          .update({ google_calendar_event_id: data.id })
          .eq("id", appointment.id);
      }

      return new Response(
        JSON.stringify({ success: true, google_event_id: data.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (!appointment.google_calendar_event_id) {
        return new Response(
          JSON.stringify({ success: true, message: "No Google event to delete" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/primary/events/${appointment.google_calendar_event_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // 404 = already deleted, that's fine
      if (!res.ok && res.status !== 404) {
        const data = await res.json();
        throw new Error(`Google Calendar delete error: ${JSON.stringify(data)}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unknown action");
  } catch (err: any) {
    console.error("google-calendar-sync error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
