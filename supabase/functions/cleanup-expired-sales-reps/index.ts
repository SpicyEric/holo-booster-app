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

    // Find sales rep profiles where contract is still pending and deadline has passed
    const { data: expiredReps, error: fetchError } = await supabase
      .from("sales_rep_profiles")
      .select("id, user_id, first_name, last_name, email, contract_deadline")
      .eq("contract_status", "pending")
      .lt("contract_deadline", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired reps:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredReps || expiredReps.length === 0) {
      return new Response(JSON.stringify({ message: "No expired accounts found", deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deleted: string[] = [];

    for (const rep of expiredReps) {
      console.log(`Deleting expired sales rep: ${rep.first_name} ${rep.last_name} (${rep.email})`);

      // Delete the sales rep profile
      const { error: deleteProfileError } = await supabase
        .from("sales_rep_profiles")
        .delete()
        .eq("id", rep.id);

      if (deleteProfileError) {
        console.error(`Error deleting profile for ${rep.email}:`, deleteProfileError);
        continue;
      }

      // Remove user role
      if (rep.user_id) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", rep.user_id)
          .eq("role", "sales_partner");

        // Delete the auth user
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(rep.user_id);
        if (deleteUserError) {
          console.error(`Error deleting auth user for ${rep.email}:`, deleteUserError);
        }
      }

      deleted.push(rep.email);
    }

    return new Response(
      JSON.stringify({ message: `Deleted ${deleted.length} expired accounts`, deleted }),
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
