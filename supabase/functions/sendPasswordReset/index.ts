import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, set_password } = await req.json();
    console.log('Processing password request for:', email);

    if (!email) {
      throw new Error('Email is required');
    }

    // If set_password is provided, directly update the user's password (admin only)
    if (set_password) {
      // Find user by email
      const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      
      const user = userList.users.find(u => u.email === email);
      if (!user) throw new Error('User not found');

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: set_password,
      });
      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Passwort wurde gesetzt' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Generate password reset link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (error) {
      console.error('Error generating reset link:', error);
      throw error;
    }

    const actionLink = data?.properties?.action_link;
    console.log('Password reset link generated successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Password-Reset-Link wurde generiert', action_link: actionLink }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in sendPasswordReset:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
