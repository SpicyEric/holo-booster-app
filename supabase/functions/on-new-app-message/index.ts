import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function is called when a new app_message is created.
// It sends a push notification to the user's device(s).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    if (!record || !record.user_id) {
      return new Response(
        JSON.stringify({ error: "No record provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get merchant name
    const { data: merchant } = await supabase
      .from("customers")
      .select("name, company_name")
      .eq("id", record.merchant_customer_id)
      .single();

    const merchantName = merchant?.company_name || merchant?.name || "Ein Geschäft";

    // Call the send-push-notification function
    const pushResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          user_id: record.user_id,
          title: `📬 ${merchantName}`,
          body: record.title,
          data: {
            type: "message",
            message_id: record.id,
            merchant_customer_id: record.merchant_customer_id,
          },
        }),
      }
    );

    const pushResult = await pushResponse.json();
    console.log("Push result:", pushResult);

    return new Response(
      JSON.stringify({ success: true, push: pushResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
