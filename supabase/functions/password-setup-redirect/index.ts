import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const customerId = url.searchParams.get("cid");
    const email = url.searchParams.get("email");

    if (!customerId || !email) {
      return new Response("Ungültiger Link. Bitte kontaktieren Sie support@eloyo.de", {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate that customer exists and email matches
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email")
      .eq("id", customerId)
      .single();

    if (customerError || !customer || customer.email?.toLowerCase() !== email.toLowerCase()) {
      console.error("Invalid customer/email combo:", customerId, email);
      return new Response("Ungültiger Link. Bitte kontaktieren Sie support@eloyo.de", {
        status: 403,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Generate a fresh recovery link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: "https://eloyo.de/auth",
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate recovery link:", linkError);
      return new Response(
        "Fehler beim Generieren des Links. Bitte kontaktieren Sie support@eloyo.de",
        { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const actionLink = linkData.properties.action_link as string;
    console.log("Password setup redirect successful for:", email);

    // Redirect to the fresh recovery link
    return new Response(null, {
      status: 302,
      headers: { Location: actionLink },
    });
  } catch (error) {
    console.error("Error in password-setup-redirect:", error);
    return new Response("Ein Fehler ist aufgetreten.", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
