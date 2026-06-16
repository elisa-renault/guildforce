import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260616090000_fix_admin_activity_metrics_sync_backfill.sql'),
  'utf8',
);

const getUserActivityCtes = () =>
  [...migrationSql.matchAll(/user_activity AS \(([\s\S]*?)\),\n\s{2}guild_activity AS/g)].map((match) => match[1]);

describe('admin dashboard activity SQL', () => {
  it('keeps product activity based on explicit user actions instead of sync timestamps', () => {
    const userActivityCtes = getUserActivityCtes();

    expect(userActivityCtes).toHaveLength(2);

    for (const userActivitySql of userActivityCtes) {
      expect(userActivitySql).toContain('cw.created_at AS occurred_at');
      expect(userActivitySql).not.toContain('cw.updated_at AS occurred_at');
      expect(userActivitySql).not.toContain('public.guild_members');
      expect(userActivitySql).not.toContain('gm.joined_at AS occurred_at');
    }
  });
});
