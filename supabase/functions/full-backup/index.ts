import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const encoder = new TextEncoder();

function escapeSqlString(value: string): string {
  // Escape single quotes for SQL string literals
  return value.replace(/'/g, "''");
}

function quoteIdent(ident: string): string {
  // Quote identifiers defensively (handles weird names safely)
  return `"${ident.replace(/"/g, '""')}"`;
}

function getIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

// Deno edge type defs for createClient can be overly strict; keep this helper flexible.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({
      error: 'Backup service is not configured.',
      detail: 'Missing backend service credentials.',
    }), {
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

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Validate caller + ensure admin role
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

  // Fetch all public tables via RPC
  const { data: tables, error: tablesError } = await supabaseAdmin.rpc('list_public_tables');
  if (tablesError) {
    console.error('Failed to list tables:', tablesError);
    return new Response(JSON.stringify({ error: 'Failed to list tables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const filename = `guildforce_full_backup_${getIsoDate()}.sql`;
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/sql; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`-- ============================================\n`));
        controller.enqueue(encoder.encode(`-- GUILDFORCE FULL DATA EXPORT (SQL)\n`));
        controller.enqueue(encoder.encode(`-- Generated: ${new Date().toISOString()}\n`));
        controller.enqueue(encoder.encode(`-- Format: INSERT INTO ... SELECT * FROM json_populate_recordset\n`));
        controller.enqueue(encoder.encode(`-- ============================================\n\n`));
        controller.enqueue(encoder.encode(`BEGIN;\n\n`));

        const PAGE_SIZE = 1000;

        for (const row of (tables ?? []) as Array<{ table_name: string }>) {
          const tableName = row.table_name;
          if (!tableName) continue;

          // Skip internal-ish tables defensively
          if (tableName.startsWith('pg_') || tableName.startsWith('sql_')) continue;

          const qTable = quoteIdent(tableName);
          controller.enqueue(encoder.encode(`\n-- ====================\n`));
          controller.enqueue(encoder.encode(`-- TABLE: ${tableName}\n`));
          controller.enqueue(encoder.encode(`-- ====================\n`));

          let offset = 0;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { data: rows, error } = await supabaseAdmin
              .from(tableName)
              .select('*')
              .range(offset, offset + PAGE_SIZE - 1);

            if (error) {
              throw new Error(`Failed to export table ${tableName}: ${error.message}`);
            }

            if (!rows || rows.length === 0) break;

            const json = JSON.stringify(rows);
            const escapedJson = escapeSqlString(json);

            // Use the table composite type to preserve column types (arrays/json/timestamps/etc.)
            const stmt =
              `INSERT INTO public.${qTable} ` +
              `SELECT * FROM json_populate_recordset(NULL::public.${qTable}, '${escapedJson}'::json);\n`;

            controller.enqueue(encoder.encode(stmt));

            offset += rows.length;
            if (rows.length < PAGE_SIZE) break;
          }
        }

        controller.enqueue(encoder.encode(`\nCOMMIT;\n`));
        controller.close();
      } catch (err) {
        console.error('Backup stream error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, { headers });
});
