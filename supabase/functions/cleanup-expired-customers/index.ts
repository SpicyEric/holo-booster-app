import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find customers cancelled more than 12 months ago
    const cutoff12Months = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredCustomers, error: fetchError } = await supabase
      .from("customers")
      .select("id, name, company_name, email, cancelled_at")
      .eq("status", "canceled")
      .eq("active", false)
      .eq("is_demo", false)
      .not("cancelled_at", "is", null)
      .lt("cancelled_at", cutoff12Months);

    if (fetchError) {
      console.error("Error fetching expired customers:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredCustomers || expiredCustomers.length === 0) {
      return new Response(JSON.stringify({ message: "No expired customers found", deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deleted: string[] = [];

    for (const customer of expiredCustomers) {
      console.log(`Deleting expired customer: ${customer.name} (${customer.email})`);

      // Delete related data first
      await supabase.from("customer_users").delete().eq("customer_id", customer.id);
      await supabase.from("customer_subscriptions").delete().eq("customer_id", customer.id);
      await supabase.from("merchant_assignments").delete().eq("customer_id", customer.id);
      await supabase.from("customer_boxes").delete().eq("customer_id", customer.id);
      await supabase.from("contacts").delete().eq("customer_id", customer.id);

      // Delete the customer record
      const { error: deleteError } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id);

      if (deleteError) {
        console.error(`Error deleting customer ${customer.email}:`, deleteError);
        continue;
      }

      deleted.push(customer.email || customer.name);
    }

    return new Response(
      JSON.stringify({ message: `Deleted ${deleted.length} expired customers`, deleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
