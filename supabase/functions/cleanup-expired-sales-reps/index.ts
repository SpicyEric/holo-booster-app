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

    // Also find sales reps inactive for 365+ days (based on last_conversion_at)
    const cutoff365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inactiveReps, error: inactiveError } = await supabase
      .from("sales_rep_profiles")
      .select("id, user_id, first_name, last_name, email, last_conversion_at")
      .not("first_conversion_at", "is", null)
      .lt("last_conversion_at", cutoff365);

    if (inactiveError) {
      console.error("Error fetching inactive reps:", inactiveError);
    }

    // Combine both lists, deduplicate by user_id
    const allRepsToDelete = [...(expiredReps || [])];
    const seenUserIds = new Set((expiredReps || []).map((r) => r.user_id));
    for (const rep of inactiveReps || []) {
      if (!seenUserIds.has(rep.user_id)) {
        allRepsToDelete.push(rep);
        seenUserIds.add(rep.user_id);
      }
    }

    if (allRepsToDelete.length === 0) {
      return new Response(JSON.stringify({ message: "No expired accounts found", deleted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deleted: string[] = [];

    for (const rep of allRepsToDelete) {
      console.log(`Deleting sales rep: ${rep.first_name} ${rep.last_name} (${rep.email})`);

      const { error: deleteProfileError } = await supabase
        .from("sales_rep_profiles")
        .delete()
        .eq("id", rep.id);

      if (deleteProfileError) {
        console.error(`Error deleting profile for ${rep.email}:`, deleteProfileError);
        continue;
      }

      if (rep.user_id) {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", rep.user_id)
          .eq("role", "sales_partner");

        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(rep.user_id);
        if (deleteUserError) {
          console.error(`Error deleting auth user for ${rep.email}:`, deleteUserError);
        }
      }

      deleted.push(rep.email);
    }

    return new Response(
      JSON.stringify({ message: `Deleted ${deleted.length} accounts`, deleted }),
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
