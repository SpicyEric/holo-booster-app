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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { user_id, email, origin } = await req.json();

    if (!user_id || !email) {
      throw new Error('user_id and email are required');
    }

    // Get verification token from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email_verification_token, email_verified')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (profile.email_verified) {
      return new Response(JSON.stringify({ success: true, already_verified: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = profile.email_verification_token;
    const baseUrl = origin || 'https://holo-booster-app.lovable.app';
    const verifyUrl = `${baseUrl}/app/verify-email?token=${token}`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Eloyo <support@eloyo.de>',
        to: [email],
        subject: 'Bestätige deine E-Mail-Adresse – Eloyo',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #7c3aed; font-size: 24px;">Willkommen bei Eloyo! 🎉</h1>
            <p style="font-size: 16px; line-height: 1.5;">Bitte bestätige deine E-Mail-Adresse, um alle Funktionen nutzen zu können – insbesondere das <strong>Einlösen von Prämien</strong>.</p>
            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 20px 0;">
              ✉️ E-Mail bestätigen
            </a>
            <p style="color: #888; font-size: 13px; margin-top: 24px;">Falls der Button nicht funktioniert, kopiere diesen Link:<br>
            <a href="${verifyUrl}" style="color: #7c3aed; word-break: break-all;">${verifyUrl}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #aaa; font-size: 12px;">– Dein Eloyo Team</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Resend error:', errorText);
      throw new Error('E-Mail konnte nicht gesendet werden');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
