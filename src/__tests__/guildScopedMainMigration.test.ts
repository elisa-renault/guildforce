import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260628153000_add_guild_scoped_main_characters.sql',
  'utf8',
);
const types = readFileSync('src/integrations/supabase/types.ts', 'utf8');
const membersPage = readFileSync('src/pages/GuildMembers.tsx', 'utf8');
const rosterWishesPage = readFileSync('src/pages/RosterWishes.tsx', 'utf8');

describe('guild-scoped main character migration', () => {
  it('adds stable override columns to guild_members', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS guild_main_character_id UUID');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS guild_main_character_name TEXT');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS guild_main_character_realm_slug TEXT');
  });

  it('exposes read and write RPCs with manage_members authorization', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_guild_member_main_characters');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_guild_member_main_candidates');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.set_guild_member_main_character');
    expect(migration).toContain("public.has_guild_permission(p_guild_id, v_actor, 'manage_members')");
    expect(migration).toContain('p_member_id = v_actor');
  });

  it('clears the override when the selected guild main equals the profile main', () => {
    expect(migration).toContain('wc.is_main = true');
    expect(migration).toContain('SET guild_main_character_id = NULL');
    expect(migration).toContain('guild_main_character_name = NULL');
  });

  it('updates active season snapshots and materialization to use the effective guild main', () => {
    expect(migration).toContain("rws.state IN ('draft', 'active')");
    expect(migration).toContain('WITH effective_main AS');
    expect(migration).toContain('public.get_guild_member_main_characters(v_guild_id)');
    expect(migration).toContain('display_name_snapshot = EXCLUDED.display_name_snapshot');
  });

  it('keeps generated types and UI surfaces aligned', () => {
    expect(types).toContain('guild_main_character_name: string | null');
    expect(types).toContain('get_guild_member_main_candidates');
    expect(types).toContain('set_guild_member_main_character');
    expect(membersPage).toContain('GuildMainSelector');
    expect(rosterWishesPage).toContain('canManageMembers');
    expect(rosterWishesPage).toContain('get_guild_member_main_characters');
  });
});
