import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260628120000_add_roster_wish_privacy.sql',
  'utf8',
);
const privateRowsMigration = readFileSync(
  'supabase/migrations/20260628133000_restrict_private_roster_season_table_rows.sql',
  'utf8',
);
const rosterWishesPage = readFileSync('src/pages/RosterWishes.tsx', 'utf8');
const wishFormEditor = readFileSync('src/components/WishFormEditor.tsx', 'utf8');

describe('roster wish privacy migration', () => {
  it('adds a season-scoped privacy flag', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS hide_member_wishes BOOLEAN NOT NULL DEFAULT false');
    expect(migration).toContain('COMMENT ON COLUMN public.roster_wish_seasons.hide_member_wishes');
  });

  it('routes linked and external wish reads through the privacy helper', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.can_view_roster_wish');
    expect(migration).toContain('public.can_view_roster_wish(guild_id, roster_id, season_id, user_id)');
    expect(migration).toContain('public.can_view_roster_wish(guild_id, roster_id, season_id, NULL)');
    expect(migration).toContain("public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes')");
    expect(migration).toContain("public.has_role(v_actor, 'admin')");
  });

  it('masks other member and external wishes in the roster season table RPC', () => {
    expect(migration).toContain('OR cw.user_id = v_actor');
    expect(migration).toContain('AND (NOT v_hide_member_wishes OR v_can_view_all_wishes)');
    expect(migration).toContain('THEN false');
  });

  it('filters other roster member rows from private season table results', () => {
    expect(privateRowsMigration).toContain('CREATE OR REPLACE FUNCTION public.get_roster_season_table');
    expect(privateRowsMigration).toContain('OR rsm.user_id = v_actor');
    expect(privateRowsMigration).toContain('NOT v_hide_member_wishes');
    expect(privateRowsMigration).toContain('OR v_can_view_all_wishes');
  });

  it('inherits privacy from the source season when preparing a copied season', () => {
    expect(migration).toContain('p_source_season_id IS NOT NULL');
    expect(migration).toContain('SELECT COALESCE(rws.hide_member_wishes, false)');
    expect(migration).toContain('hide_member_wishes,');
    expect(migration).toContain('v_hide_member_wishes,');
  });

  it('keeps private member seasons on the roster page with personal wishes only', () => {
    expect(rosterWishesPage).not.toContain('getGuildMemberPath');
    expect(rosterWishesPage).toContain('t.wishes.privateRosterTitle');
    expect(rosterWishesPage).toContain('t.wishes.privateRosterMessage');
    expect(rosterWishesPage).toContain('member.user_id === user?.id');
    expect(rosterWishesPage).toContain('isPrivateMemberSeason ?');
  });

  it('hides CSV export unless the caller can manage wishes', () => {
    expect(rosterWishesPage).toContain('const canExportWishes = canManageWishes && !isAdminReadOnly');
    expect(rosterWishesPage).toContain('...(canExportWishes');
    expect(rosterWishesPage).toContain("key: 'export'");
    expect(rosterWishesPage).toContain('disabled: wishesLoading || filteredMembers.length === 0');
  });

  it('uses the full wish form editor for private member editing', () => {
    expect(rosterWishesPage).toContain("import { WishFormEditor } from '@/components/WishFormEditor'");
    expect(rosterWishesPage).not.toContain("import { MemberWishEditor } from '@/components/dashboard/MemberWishEditor'");
    expect(rosterWishesPage).toContain('<WishFormEditor');
    expect(wishFormEditor).toContain('<CommitmentToggle status={status}');
    expect(wishFormEditor).toContain('<WishCardEditor');
  });
});
