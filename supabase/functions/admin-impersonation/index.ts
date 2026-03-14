import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function isAdminUser(supabaseAdmin: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Impersonation service is not configured.' }, 500);
  }

  const token = getBearerToken(req);
  if (!token) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData?.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const actorUser = authData.user;

  try {
    const actorIsAdmin = await isAdminUser(supabaseAdmin, actorUser.id);
    if (!actorIsAdmin) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }
  } catch (error) {
    console.error('Failed to authorize admin impersonation:', error);
    return jsonResponse({ error: 'Failed to authorize admin' }, 500);
  }

  if (path === 'start') {
    const { targetUserId, startPath } = await req.json();

    if (!targetUserId || typeof targetUserId !== 'string') {
      return jsonResponse({ error: 'targetUserId is required' }, 400);
    }

    if (targetUserId === actorUser.id) {
      return jsonResponse({ error: 'You cannot impersonate your own account' }, 400);
    }

    const { data: targetRoles, error: targetRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .in('role', ['admin', 'moderator']);

    if (targetRolesError) {
      console.error('Failed to load target roles:', targetRolesError);
      return jsonResponse({ error: 'Failed to validate target user' }, 500);
    }

    if ((targetRoles || []).length > 0) {
      return jsonResponse({ error: 'Admins and moderators cannot be impersonated' }, 403);
    }

    const [{ data: authUserData, error: authUserError }, { data: profileData, error: profileError }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(targetUserId),
      supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', targetUserId)
        .maybeSingle(),
    ]);

    if (profileError) {
      console.error('Failed to load target profile:', profileError);
      return jsonResponse({ error: 'Failed to load target profile' }, 500);
    }

    if (authUserError || !authUserData?.user) {
      return jsonResponse({ error: 'Target auth account not found' }, 404);
    }

    if (!authUserData.user.email) {
      return jsonResponse({ error: 'Target user has no login email' }, 400);
    }

    const { data: sessionAudit, error: auditError } = await supabaseAdmin
      .from('admin_impersonation_sessions')
      .insert({
        actor_user_id: actorUser.id,
        target_user_id: targetUserId,
        target_username: profileData?.username ?? null,
        target_email: authUserData.user.email,
        start_path: typeof startPath === 'string' ? startPath : null,
      })
      .select('id')
      .single();

    if (auditError || !sessionAudit) {
      console.error('Failed to create impersonation audit session:', auditError);
      return jsonResponse({ error: 'Failed to start impersonation' }, 500);
    }

    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUserData.user.email,
    });

    if (magicLinkError || !magicLinkData?.properties?.hashed_token) {
      console.error('Failed to generate impersonation session:', magicLinkError);
      return jsonResponse({ error: 'Failed to generate impersonation session' }, 500);
    }

    return jsonResponse({
      verifyToken: magicLinkData.properties.hashed_token,
      tokenType: 'magiclink',
      impersonationId: sessionAudit.id,
      target: {
        id: targetUserId,
        username: profileData?.username ?? null,
      },
    });
  }

  if (path === 'restore') {
    const { impersonationId, restorePath } = await req.json();

    if (!impersonationId || typeof impersonationId !== 'string') {
      return jsonResponse({ error: 'impersonationId is required' }, 400);
    }

    const { data: impersonationSession, error: sessionError } = await supabaseAdmin
      .from('admin_impersonation_sessions')
      .select('id, actor_user_id, ended_at')
      .eq('id', impersonationId)
      .maybeSingle();

    if (sessionError) {
      console.error('Failed to load impersonation session:', sessionError);
      return jsonResponse({ error: 'Failed to load impersonation session' }, 500);
    }

    if (!impersonationSession) {
      return jsonResponse({ error: 'Impersonation session not found' }, 404);
    }

    if (impersonationSession.actor_user_id !== actorUser.id) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    if (!impersonationSession.ended_at) {
      const { error: updateError } = await supabaseAdmin
        .from('admin_impersonation_sessions')
        .update({
          ended_at: new Date().toISOString(),
          restore_path: typeof restorePath === 'string' ? restorePath : null,
        })
        .eq('id', impersonationId);

      if (updateError) {
        console.error('Failed to complete impersonation session:', updateError);
        return jsonResponse({ error: 'Failed to close impersonation session' }, 500);
      }
    }

    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
});
