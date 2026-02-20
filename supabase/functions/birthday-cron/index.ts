import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get today's month and day
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();
    const todayStr = today.toISOString().split("T")[0];

    // Find all merchants with birthday automation enabled
    const { data: merchants, error: merchantError } = await supabase
      .from("customers")
      .select("id, name, birthday_enabled, birthday_message, birthday_bonus_points")
      .eq("birthday_enabled", true)
      .eq("active", true);

    if (merchantError) {
      console.error("Error fetching merchants:", merchantError);
      return new Response(JSON.stringify({ error: merchantError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!merchants || merchants.length === 0) {
      return new Response(
        JSON.stringify({ message: "No merchants with birthday automation", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;

    for (const merchant of merchants) {
      // Get all loyalty accounts for this merchant
      const { data: loyaltyAccounts } = await supabase
        .from("loyalty_accounts")
        .select("id, user_id")
        .eq("merchant_customer_id", merchant.id);

      if (!loyaltyAccounts || loyaltyAccounts.length === 0) continue;

      const userIds = loyaltyAccounts.map((la) => la.user_id);

      // Get profiles with birthday today
      const { data: birthdayProfiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, birth_date")
        .in("user_id", userIds)
        .not("birth_date", "is", null);

      if (!birthdayProfiles || birthdayProfiles.length === 0) continue;

      // Filter profiles where birth_date matches today's month and day
      const birthdayUsers = birthdayProfiles.filter((p) => {
        if (!p.birth_date) return false;
        const bd = new Date(p.birth_date);
        return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay;
      });

      if (birthdayUsers.length === 0) continue;

      const bonusPoints = merchant.birthday_bonus_points || 50;
      const messageBody =
        merchant.birthday_message ||
        "Alles Gute zum Geburtstag! Als kleines Geschenk schenken wir dir Bonus-Punkte.";

      for (const user of birthdayUsers) {
        // Check if we already sent a birthday message today
        const { data: existingMsg } = await supabase
          .from("app_messages")
          .select("id")
          .eq("merchant_customer_id", merchant.id)
          .eq("user_id", user.user_id)
          .gte("sent_at", todayStr + "T00:00:00Z")
          .lte("sent_at", todayStr + "T23:59:59Z")
          .ilike("title", "%Geburtstag%")
          .maybeSingle();

        if (existingMsg) continue; // Already sent today

        // Find the loyalty account for this user
        const loyaltyAccount = loyaltyAccounts.find(
          (la) => la.user_id === user.user_id
        );
        if (!loyaltyAccount) continue;

        // Award bonus points
        await supabase
          .from("loyalty_accounts")
          .update({
            current_points_balance: supabase.rpc ? undefined : undefined,
          });

        // Use raw update to increment points
        const { data: currentAccount } = await supabase
          .from("loyalty_accounts")
          .select("current_points_balance")
          .eq("id", loyaltyAccount.id)
          .single();

        if (currentAccount) {
          await supabase
            .from("loyalty_accounts")
            .update({
              current_points_balance:
                (currentAccount.current_points_balance || 0) + bonusPoints,
              updated_at: new Date().toISOString(),
            })
            .eq("id", loyaltyAccount.id);
        }

        // Log the transaction
        await supabase.from("point_transactions").insert({
          loyalty_account_id: loyaltyAccount.id,
          merchant_customer_id: merchant.id,
          points_change: bonusPoints,
          transaction_type: "birthday_bonus",
          description: `Geburtstags-Bonus: ${bonusPoints} Punkte`,
        });

        // Send birthday message
        const greeting = user.first_name
          ? `Alles Gute zum Geburtstag, ${user.first_name}!`
          : "Alles Gute zum Geburtstag!";

        await supabase.from("app_messages").insert({
          merchant_customer_id: merchant.id,
          user_id: user.user_id,
          title: greeting,
          body: `${messageBody}\n\n🎁 Du hast ${bonusPoints} Bonus-Punkte erhalten!`,
          show_in_storefront: false,
        });

        totalSent++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Birthday messages processed`,
        sent: totalSent,
        date: todayStr,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Birthday cron error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
