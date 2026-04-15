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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, full_name, role, password: customPassword } = await req.json();

    // Create user with custom password or auto-generated password
    const password = customPassword || crypto.randomUUID();
    
    let userId: string;
    let isExistingUser = false;

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
      },
    });

    if (createError) {
      // If user already exists (e.g. as end_customer), reuse them
      if (createError.message?.includes('already been registered') || (createError as any).code === 'email_exists') {
        console.log('[createUserAccount] User already exists, reusing:', email);
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        const existing = usersData.users.find((u: any) => u.email === email);
        if (!existing) throw new Error('User exists but could not be found');
        userId = existing.id;
        isExistingUser = true;
      } else {
        console.error('Error creating user:', createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      userId = newUser.user.id;
    }

    // Remove auto-assigned end_customer role (from trigger) if assigning a different role
    const assignedRole = role || 'merchant';
    if (assignedRole !== 'end_customer') {
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'end_customer');
    }

    // Assign role (upsert to be idempotent)
    const { error: roleInsertError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: assignedRole,
      }, { onConflict: 'user_id,role' });

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
      if (!isExistingUser) {
        await supabase.auth.admin.deleteUser(userId);
      }
      return new Response(JSON.stringify({ error: 'Failed to assign role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create profile (skip if existing user already has one)
    if (!isExistingUser) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: full_name || '',
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    // Send welcome email with password setup link
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      try {
        // Generate a recovery link directly (works for all user types)
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: "recovery",
          email: email,
          options: {
            redirectTo: "https://eloyo.de/auth",
          },
        });

        let passwordSetupUrl: string;
        if (linkError || !linkData?.properties?.action_link) {
          console.error('Failed to generate recovery link, using redirect fallback:', linkError);
          passwordSetupUrl = `${supabaseUrl}/functions/v1/password-setup-redirect?email=${encodeURIComponent(email)}`;
        } else {
          passwordSetupUrl = linkData.properties.action_link as string;
        }

        const roleName = role === 'partner' ? 'Vertriebspartner' : 'Benutzer';
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Eloyo <support@eloyo.de>',
            to: [email],
            subject: 'Willkommen bei Eloyo - Passwort festlegen',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Willkommen bei Eloyo! 🎉</h1>
                </div>
                <div style="padding: 40px 30px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                    Ihr Account als ${roleName} wurde erfolgreich erstellt.
                  </p>
                  <p style="color: #374151; font-size: 15px;"><strong>Ihre E-Mail-Adresse:</strong> ${email}</p>
                  <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
                    <p style="margin: 0 0 15px 0; color: #374151; font-weight: 600;">Bitte legen Sie Ihr Passwort fest:</p>
                    <a href="${passwordSetupUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">🔑 Passwort festlegen</a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;"><strong>Hinweis:</strong> Dieser Link ist 24 Stunden gültig.</p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                  <p style="color: #374151; font-size: 15px;">Herzliche Grüße,<br/><strong>Ihr Eloyo Team</strong></p>
                </div>
                <div style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0; color: #9ca3af; font-size: 13px;">E-Mail: <a href="mailto:support@eloyo.de" style="color: #6366f1; text-decoration: none;">support@eloyo.de</a></p>
                </div>
              </div>
            `,
          }),
        });

        if (!response.ok) {
          console.error('Failed to send email:', await response.text());
        } else {
          console.log('Welcome email sent successfully to:', email);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        temporary_password: password 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});