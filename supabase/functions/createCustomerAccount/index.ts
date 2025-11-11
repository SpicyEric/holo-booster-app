import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { customerEmail, customerId, customerName } = await req.json();

    console.log("[CREATE-CUSTOMER-ACCOUNT] Creating account for:", customerEmail);

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      email_confirm: true,
      user_metadata: {
        full_name: customerName,
      },
    });

    if (authError) {
      console.error("[CREATE-CUSTOMER-ACCOUNT] Auth error:", authError);
      throw authError;
    }

    console.log("[CREATE-CUSTOMER-ACCOUNT] Auth user created:", authData.user.id);

    // Link user to customer
    const { error: linkError } = await supabaseAdmin
      .from("customer_users")
      .insert({
        user_id: authData.user.id,
        customer_id: customerId,
      });

    if (linkError) {
      console.error("[CREATE-CUSTOMER-ACCOUNT] Link error:", linkError);
      throw linkError;
    }

    // Assign customer role (idempotent - ignore if already exists)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "customer",
      })
      .select();

    if (roleError) {
      // If role already exists (unique constraint violation), that's OK
      if (roleError.code === '23505') {
        console.log("[CREATE-CUSTOMER-ACCOUNT] Role already exists for user:", authData.user.id);
      } else {
        console.error("[CREATE-CUSTOMER-ACCOUNT] Role error:", roleError);
        throw roleError;
      }
    } else {
      console.log("[CREATE-CUSTOMER-ACCOUNT] Role 'customer' assigned successfully");
    }

    console.log("[CREATE-CUSTOMER-ACCOUNT] Account setup complete");

    // Generate password reset link so the customer can set a password
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: customerEmail,
    });

    if (resetError) {
      console.error("[CREATE-CUSTOMER-ACCOUNT] Reset link error:", resetError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        resetLink: resetData?.properties?.action_link 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CREATE-CUSTOMER-ACCOUNT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
