import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

// Simple CSV escaping (RFC4180-ish)
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function isAdminUser(supabaseAdmin: any, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

function getIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Export backend-auth users list (admin-only)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const BACKEND_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!BACKEND_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Export service is not configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = getBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAdmin = createClient(BACKEND_URL, SERVICE_ROLE_KEY);

  // Validate caller + ensure admin role (same pattern as full-backup)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const ok = await isAdminUser(supabaseAdmin, userData.user.id);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    console.error('Admin check failed:', e);
    return new Response(JSON.stringify({ error: 'Failed to authorize admin' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const filename = `guildforce_users_${getIsoDate()}.csv`;
  const headers = {
    ...corsHeaders,
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };

  // We stream to avoid memory spikes
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`id,email,created_at,last_sign_in_at\n`));

        const PER_PAGE = 1000;
        let page = 1;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PER_PAGE });
          if (error) throw error;

          const users = data?.users ?? [];
          for (const u of users) {
            const line = [
              csvCell(u.id),
              csvCell(u.email),
              csvCell(u.created_at),
              csvCell(u.last_sign_in_at),
            ].join(',') + `\n`;
            controller.enqueue(encoder.encode(line));
          }

          if (users.length < PER_PAGE) break;
          page += 1;
        }

        controller.close();
      } catch (err) {
        console.error('Export users stream error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, { headers });
});
