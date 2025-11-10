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

    const { userIds } = await req.json();
    console.log('Fetching emails for user IDs:', userIds);

    if (!userIds || !Array.isArray(userIds)) {
      throw new Error('userIds must be an array');
    }

    const emails: Record<string, string> = {};

    // Fetch emails from auth.users using admin client
    for (const userId of userIds) {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error) {
        console.error(`Error fetching user ${userId}:`, error);
        continue;
      }
      
      if (user?.email) {
        emails[userId] = user.email;
      }
    }

    console.log('Fetched emails:', emails);

    return new Response(
      JSON.stringify({ emails }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in getUserEmails:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});