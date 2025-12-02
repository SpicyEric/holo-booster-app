import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Lovable Cloud Supabase (where customers table lives)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // App-Database Supabase (where merchants table lives)
    const appSupabase = createClient(
      Deno.env.get("APP_SUPABASE_URL") ?? "",
      Deno.env.get("APP_SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if App-DB credentials are configured
    if (!Deno.env.get("APP_SUPABASE_URL") || !Deno.env.get("APP_SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(
        JSON.stringify({ error: "App-DB credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("[SYNC] Starting customer sync to App-DB...");

    // 1. Fetch all customers from Lovable Cloud
    const { data: customers, error: fetchError } = await supabase
      .from("customers")
      .select("id, name, email, company_name, street, house_number, postal_code, city, phone, website, instagram, facebook, description, status")
      .eq("active", true);

    if (fetchError) {
      console.error("[SYNC] Error fetching customers:", fetchError);
      throw fetchError;
    }

    console.log(`[SYNC] Found ${customers?.length || 0} customers in Lovable Cloud`);

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ synced: 0, skipped: 0, errors: 0, message: "No customers to sync" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch existing merchants from App-DB to avoid duplicates
    const { data: existingMerchants, error: merchantsError } = await appSupabase
      .from("merchants")
      .select("email, name");

    if (merchantsError) {
      console.error("[SYNC] Error fetching existing merchants:", merchantsError);
    }

    // Create a Set of existing emails for quick lookup
    const existingEmails = new Set(
      (existingMerchants || [])
        .filter(m => m.email)
        .map(m => m.email.toLowerCase())
    );

    console.log(`[SYNC] Found ${existingMerchants?.length || 0} existing merchants in App-DB`);

    // 3. Sync each customer
    let synced = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{ name: string; status: string; error?: string }> = [];

    for (const customer of customers) {
      // Skip if merchant with same email already exists
      if (customer.email && existingEmails.has(customer.email.toLowerCase())) {
        console.log(`[SYNC] Skipping ${customer.name} - already exists`);
        skipped++;
        results.push({ name: customer.name, status: "skipped" });
        continue;
      }

      // Build address from components
      const address = [customer.street, customer.house_number]
        .filter(Boolean)
        .join(" ");

      try {
        const { error: insertError } = await appSupabase
          .from("merchants")
          .insert({
            name: customer.company_name || customer.name,
            email: customer.email,
            address: address || null,
            postal_code: customer.postal_code || null,
            city: customer.city || null,
            phone_number: customer.phone || null,
            website: customer.website || null,
            instagram_url: customer.instagram || null,
            facebook_url: customer.facebook || null,
            description: customer.description || null,
            is_active: customer.status === 'active',
            lat: 0,
            lng: 0,
          });

        if (insertError) {
          console.error(`[SYNC] Error syncing ${customer.name}:`, insertError);
          errors++;
          results.push({ name: customer.name, status: "error", error: insertError.message });
        } else {
          console.log(`[SYNC] Synced ${customer.name}`);
          synced++;
          results.push({ name: customer.name, status: "synced" });
          
          // Add to existing set to prevent duplicates within same batch
          if (customer.email) {
            existingEmails.add(customer.email.toLowerCase());
          }
        }
      } catch (err: any) {
        console.error(`[SYNC] Exception syncing ${customer.name}:`, err);
        errors++;
        results.push({ name: customer.name, status: "error", error: err.message });
      }
    }

    console.log(`[SYNC] Complete: ${synced} synced, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        synced, 
        skipped, 
        errors, 
        total: customers.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("[SYNC] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
