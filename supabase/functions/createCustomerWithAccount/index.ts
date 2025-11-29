import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.4";

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

    const customerData = await req.json();
    const { email, company_name, name, google_review_url, offer_text, logo_url } = customerData;

    // Generate QR code
    let qrCodeUrl = '';
    if (google_review_url) {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(google_review_url, {
          width: 512,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        qrCodeUrl = qrCodeDataUrl;
      } catch (qrError) {
        console.error('QR Code generation error:', qrError);
      }
    }

    // Create customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        name: name || company_name,
        company_name,
        email,
        google_review_url,
        offer_text,
        logo_url,
        qr_code_url: qrCodeUrl,
        active: true,
      })
      .select()
      .single();

    if (customerError) {
      console.error('Error creating customer:', customerError);
      return new Response(JSON.stringify({ error: customerError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user account if email provided
    let customerUser = null;
    let temporaryPassword = null;

    if (email) {
      temporaryPassword = crypto.randomUUID();
      
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: company_name || name,
          customer_id: customer.id,
        },
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
      } else {
        customerUser = newUser.user;

        // Create customer_users link (wichtig für Dashboard-Zugriff)
        await supabase
          .from('customer_users')
          .insert({
            user_id: customerUser.id,
            customer_id: customer.id,
          });

        // Assign merchant role
        await supabase
          .from('user_roles')
          .insert({
            user_id: customerUser.id,
            role: 'merchant',
          });

        // Create profile
        await supabase
          .from('profiles')
          .insert({
            user_id: customerUser.id,
            full_name: company_name || name,
          });

        // Create merchant assignment
        await supabase
          .from('merchant_assignments')
          .insert({
            merchant_user_id: customerUser.id,
            customer_id: customer.id,
          });

        // Send comprehensive onboarding email
        try {
          // Generate password reset (setup) link
          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
          });

          if (linkError) {
            console.error('Error generating password setup link:', linkError);
          } else if (linkData?.properties?.action_link) {
            const passwordSetupUrl = linkData.properties.action_link as string;
            
            // Send via new comprehensive onboarding email function
            const emailResponse = await fetch(
              `${supabaseUrl}/functions/v1/send-merchant-onboarding`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  to: email,
                  companyName: company_name || name,
                  contactName: name,
                  passwordSetupUrl,
                  privacyUrl: 'https://eloyo.de/datenschutz',
                  termsUrl: 'https://eloyo.de/agb',
                  customerId: customer.id,
                }),
              }
            );

            if (!emailResponse.ok) {
              const txt = await emailResponse.text();
              console.error('Failed to send onboarding email:', emailResponse.status, txt);
              
              // Fallback to legacy welcome email
              console.log('Attempting fallback to sendWelcomeEmail...');
              const fallbackResponse = await fetch(
                `${supabaseUrl}/functions/v1/sendWelcomeEmail`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    customerEmail: email,
                    customerName: company_name || name,
                    resetLink: passwordSetupUrl,
                  }),
                }
              );
              
              if (!fallbackResponse.ok) {
                console.error('Fallback email also failed:', await fallbackResponse.text());
              }
            } else {
              console.log('Onboarding email sent successfully');
            }
          }
        } catch (emailError) {
          console.error('Error sending onboarding email:', emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        customer,
        user: customerUser,
        temporary_password: temporaryPassword,
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
