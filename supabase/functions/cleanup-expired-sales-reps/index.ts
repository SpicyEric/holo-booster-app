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

    // 1) Sales reps where contract is still pending and 30-day deadline has passed
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

    // 2) Sales reps inactive for 365+ days
    // Timer starts from activated_at (when admin approved contract)
    // Resets on each new conversion (last_conversion_at)
    const cutoff365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inactiveReps, error: inactiveError } = await supabase
      .from("sales_rep_profiles")
      .select("id, user_id, first_name, last_name, email, activated_at, last_conversion_at")
      .eq("contract_status", "approved")
      .not("activated_at", "is", null);

    // Filter: delete if both activated_at and last_conversion_at are older than 365 days
    // (last_conversion_at resets the timer, so we check whichever is more recent)
    const filteredInactive = (inactiveReps || []).filter((rep: any) => {
      const lastActivity = rep.last_conversion_at
        ? new Date(Math.max(new Date(rep.activated_at).getTime(), new Date(rep.last_conversion_at).getTime()))
        : new Date(rep.activated_at);
      return lastActivity.toISOString() < cutoff365;
    });

    if (inactiveError) {
      console.error("Error fetching inactive reps:", inactiveError);
    }

    // Combine both lists, deduplicate by user_id
    const allRepsToDelete = [...(expiredReps || [])];
    const seenUserIds = new Set((expiredReps || []).map((r: any) => r.user_id));
    for (const rep of filteredInactive) {
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
    const errors: string[] = [];

    for (const rep of allRepsToDelete) {
      console.log(`Deleting sales rep: ${rep.first_name} ${rep.last_name} (${rep.email})`);

      try {
        // --- Clean up all related data ---

        // 1. Remove promoter_id from customers (keeps customers, removes binding)
        if (rep.user_id) {
          const { error: clearPromoterErr } = await supabase
            .from("customers")
            .update({ promoter_id: null })
            .eq("promoter_id", rep.user_id);
          if (clearPromoterErr) {
            console.error(`Error clearing promoter_id for ${rep.email}:`, clearPromoterErr);
          }
        }

        // 2. Delete commissions
        if (rep.user_id) {
          const { error: commErr } = await supabase
            .from("commissions")
            .delete()
            .eq("promoter_id", rep.user_id);
          if (commErr) console.error(`Error deleting commissions for ${rep.email}:`, commErr);
        }

        // 3. Gutschriften + PDFs bleiben erhalten (Admin muss sie weiterhin sehen)
        // Nur den vertriebler_id-Bezug in der Gutschriften-Tabelle belassen

        // 4. Delete contract uploads from storage
        if (rep.user_id) {
          const { data: contracts } = await supabase
            .from("sales_rep_contract_uploads")
            .select("file_path")
            .eq("vertriebler_id", rep.id);
          if (contracts && contracts.length > 0) {
            const paths = contracts.map((c: any) => c.file_path);
            await supabase.storage.from("sales-rep-contracts").remove(paths);
            await supabase
              .from("sales_rep_contract_uploads")
              .delete()
              .eq("vertriebler_id", rep.id);
          }
        }

        // 5. Reset eloyo_boxes assigned to this sales rep (return to available)
        if (rep.user_id) {
          const { error: boxErr } = await supabase
            .from("eloyo_boxes")
            .update({ vertriebler_id: null, status: "verfuegbar" })
            .eq("vertriebler_id", rep.user_id)
            .in("status", ["zugewiesen", "versendet"]);
          if (boxErr) console.error(`Error resetting boxes for ${rep.email}:`, boxErr);
        }

        // 6. Delete box_pakete
        if (rep.user_id) {
          const { error: paketErr } = await supabase
            .from("box_pakete")
            .delete()
            .eq("vertriebler_id", rep.user_id);
          if (paketErr) console.error(`Error deleting box_pakete for ${rep.email}:`, paketErr);
        }

        // 7. Delete the sales_rep_profile
        const { error: deleteProfileError } = await supabase
          .from("sales_rep_profiles")
          .delete()
          .eq("id", rep.id);

        if (deleteProfileError) {
          console.error(`Error deleting profile for ${rep.email}:`, deleteProfileError);
          errors.push(rep.email);
          continue;
        }

        // 8. Delete user_roles and auth user
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
      } catch (repErr) {
        console.error(`Unexpected error processing ${rep.email}:`, repErr);
        errors.push(rep.email);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Deleted ${deleted.length} accounts`,
        deleted,
        errors: errors.length > 0 ? errors : undefined,
      }),
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
