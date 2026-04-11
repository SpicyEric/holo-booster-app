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

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const todayStr = today.toISOString().split("T")[0];

    // Find all merchants with birthday automation enabled
    const { data: merchants, error: merchantError } = await supabase
      .from("customers")
      .select("id, name, birthday_enabled, birthday_message, birthday_bonus_points, birthday_gift_type, birthday_offer_title, birthday_offer_description")
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
      const { data: loyaltyAccounts } = await supabase
        .from("loyalty_accounts")
        .select("id, user_id")
        .eq("merchant_customer_id", merchant.id);

      if (!loyaltyAccounts || loyaltyAccounts.length === 0) continue;

      const userIds = loyaltyAccounts.map((la) => la.user_id);

      const { data: birthdayProfiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, birth_date")
        .in("user_id", userIds)
        .not("birth_date", "is", null);

      if (!birthdayProfiles || birthdayProfiles.length === 0) continue;

      const birthdayUsers = birthdayProfiles.filter((p) => {
        if (!p.birth_date) return false;
        const bd = new Date(p.birth_date);
        return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay;
      });

      if (birthdayUsers.length === 0) continue;

      const giftType = (merchant as any).birthday_gift_type || "points";
      const bonusPoints = merchant.birthday_bonus_points || 5;
      const messageBody =
        merchant.birthday_message ||
        "Alles Gute zum Geburtstag! Als kleines Geschenk schenken wir dir etwas Besonderes.";

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

        if (existingMsg) continue;

        const greeting = user.first_name
          ? `Alles Gute zum Geburtstag, ${user.first_name}!`
          : "Alles Gute zum Geburtstag!";

        let offerId: string | null = null;

        if (giftType === "points") {
          // Create a birthday bonus offer (points are NOT credited automatically - user claims them)
          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + 30);

          const { data: offerData } = await supabase
            .from("offers")
            .insert({
              merchant_customer_id: merchant.id,
              title: `🎁 Geburtstags-Bonus`,
              description: `${bonusPoints} Punkte als Geburtstagsgeschenk`,
              is_active: true,
              show_in_storefront: false,
              valid_until: validUntil.toISOString(),
            })
            .select("id")
            .single();

          if (offerData) offerId = offerData.id;

          const { data: insertedMsg } = await supabase.from("app_messages").insert({
            merchant_customer_id: merchant.id,
            user_id: user.user_id,
            title: greeting,
            body: `${messageBody}\n\n🎁 Du hast ${bonusPoints} Bonus-Punkte als Geschenk! Tippe hier, um sie einzulösen.`,
            show_in_storefront: false,
            offer_id: offerId,
          } as any).select("id, user_id, title, merchant_customer_id").single();

          // Send push notification
          if (insertedMsg) {
            await fetch(`${supabaseUrl}/functions/v1/on-new-app-message`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
              body: JSON.stringify({ record: insertedMsg }),
            }).catch(err => console.error("Push error:", err));
          }
        } else {
          // Create an offer gift
          const offerTitle = (merchant as any).birthday_offer_title || "Geburtstags-Angebot";
          const offerDesc = (merchant as any).birthday_offer_description || null;

          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + 30);

          const { data: offerData } = await supabase
            .from("offers")
            .insert({
              merchant_customer_id: merchant.id,
              title: offerTitle,
              description: offerDesc,
              is_active: true,
              show_in_storefront: false,
              valid_until: validUntil.toISOString(),
            })
            .select("id")
            .single();

          if (offerData) offerId = offerData.id;

          const { data: insertedMsg2 } = await supabase.from("app_messages").insert({
            merchant_customer_id: merchant.id,
            user_id: user.user_id,
            title: greeting,
            body: `${messageBody}\n\n🎁 Wir haben ein besonderes Angebot für dich: ${offerTitle}`,
            show_in_storefront: false,
            offer_id: offerId,
          } as any).select("id, user_id, title, merchant_customer_id").single();

          // Send push notification
          if (insertedMsg2) {
            await fetch(`${supabaseUrl}/functions/v1/on-new-app-message`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
              body: JSON.stringify({ record: insertedMsg2 }),
            }).catch(err => console.error("Push error:", err));
          }
        }

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
