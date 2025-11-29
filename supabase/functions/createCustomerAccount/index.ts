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

    console.log("[CREATE-CUSTOMER-ACCOUNT] Processing account for:", customerEmail);

    let userId: string;
    let isExistingUser = false;

    // Try to create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      email_confirm: true,
      user_metadata: {
        full_name: customerName,
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message?.includes("already been registered") || authError.code === "email_exists") {
        console.log("[CREATE-CUSTOMER-ACCOUNT] User already exists, looking up existing user");
        
        // Get existing user by email
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error("[CREATE-CUSTOMER-ACCOUNT] Error listing users:", listError);
          throw listError;
        }
        
        const existingUser = usersData.users.find(u => u.email === customerEmail);
        
        if (!existingUser) {
          throw new Error("User exists but could not be found");
        }
        
        userId = existingUser.id;
        isExistingUser = true;
        console.log("[CREATE-CUSTOMER-ACCOUNT] Found existing user:", userId);
      } else {
        console.error("[CREATE-CUSTOMER-ACCOUNT] Auth error:", authError);
        throw authError;
      }
    } else {
      userId = authData.user.id;
      console.log("[CREATE-CUSTOMER-ACCOUNT] New auth user created:", userId);
    }

    // Check if user is already linked to this customer
    const { data: existingLink } = await supabaseAdmin
      .from("customer_users")
      .select("id")
      .eq("user_id", userId)
      .eq("customer_id", customerId)
      .single();

    if (!existingLink) {
      // Link user to customer
      const { error: linkError } = await supabaseAdmin
        .from("customer_users")
        .insert({
          user_id: userId,
          customer_id: customerId,
        });

      if (linkError) {
        // Ignore duplicate key errors
        if (linkError.code !== '23505') {
          console.error("[CREATE-CUSTOMER-ACCOUNT] Link error:", linkError);
          throw linkError;
        }
      } else {
        console.log("[CREATE-CUSTOMER-ACCOUNT] User linked to customer");
      }
    } else {
      console.log("[CREATE-CUSTOMER-ACCOUNT] User already linked to customer");
    }

    // Assign merchant role (idempotent - ignore if already exists)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "merchant",
      });

    if (roleError) {
      // If role already exists (unique constraint violation), that's OK
      if (roleError.code === '23505') {
        console.log("[CREATE-CUSTOMER-ACCOUNT] Role already exists for user:", userId);
      } else {
        console.error("[CREATE-CUSTOMER-ACCOUNT] Role error:", roleError);
        throw roleError;
      }
    } else {
      console.log("[CREATE-CUSTOMER-ACCOUNT] Role 'merchant' assigned successfully");
    }

    // Also create merchant_assignments if not exists
    const { data: existingAssignment } = await supabaseAdmin
      .from("merchant_assignments")
      .select("id")
      .eq("merchant_user_id", userId)
      .eq("customer_id", customerId)
      .single();

    if (!existingAssignment) {
      const { error: assignmentError } = await supabaseAdmin
        .from("merchant_assignments")
        .insert({
          merchant_user_id: userId,
          customer_id: customerId,
        });

      if (assignmentError && assignmentError.code !== '23505') {
        console.error("[CREATE-CUSTOMER-ACCOUNT] Assignment error:", assignmentError);
        // Don't throw, this is not critical
      } else {
        console.log("[CREATE-CUSTOMER-ACCOUNT] Merchant assignment created");
      }
    }

    console.log("[CREATE-CUSTOMER-ACCOUNT] Account setup complete, generating password reset link");

    // Generate password reset link so the customer can set a password
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: customerEmail,
      options: {
        redirectTo: 'https://eloyo.de/auth',
      },
    });

    if (resetError) {
      console.error("[CREATE-CUSTOMER-ACCOUNT] Reset link error:", resetError);
    } else {
      console.log("[CREATE-CUSTOMER-ACCOUNT] Password reset link generated");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        isExistingUser: isExistingUser,
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
