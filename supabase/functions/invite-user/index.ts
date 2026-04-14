/**
 * invite-user edge function
 * Sends a Supabase auth invitation email and creates a user_profiles row.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (set automatically by Supabase).
 *
 * Deploy: npx supabase functions deploy invite-user
 * Test: npx supabase functions invoke invite-user --body '{"email":"test@example.com","role":"employee"}'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller is authenticated (pass caller's JWT in Authorization header)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a service-role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the calling user is an admin
    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: callerErr } = await supabaseAdmin.auth.getUser(callerToken);
    if (callerErr || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileErr || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { email, name, role = 'employee' } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validRoles = ['employee', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: `role must be one of: ${validRoles.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send invitation via Supabase Auth admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      {
        data: {
          // This metadata is available in the user's raw_user_meta_data
          invited_by: callerUser.id,
          initial_role: role,
        },
      }
    );

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create or update the user_profiles row with the desired role
    // (the trigger in migration 001 may have already created a default row)
    if (inviteData.user) {
      const { error: profileUpdateErr } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: inviteData.user.id,
          username: email.toLowerCase().trim(),
          name: name ?? email.split('@')[0],
          role,
          active: true,
        });

      if (profileUpdateErr) {
        console.error('Failed to set user profile role:', profileUpdateErr.message);
        // Don't fail the whole request — invite email was sent
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId: inviteData.user?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('invite-user error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
