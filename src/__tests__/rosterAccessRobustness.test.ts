import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260630100000_roster_access_cache_fallback_debug.sql',
  'utf8',
);
const personalWishFallbackMigration = readFileSync(
  'supabase/migrations/20260630220000_allow_cache_backed_personal_wishes.sql',
  'utf8',
);
const rosterWishesPage = readFileSync('src/pages/RosterWishes.tsx', 'utf8');
const supabaseTypes = readFileSync('src/integrations/supabase/types.ts', 'utf8');

describe('roster access robustness', () => {
  it('allows rank access through Battle.net membership rows and roster cache rows', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_roster_access_debug');
    expect(migration).toContain('FROM public.wow_guild_memberships wgm');
    expect(migration).toContain('FROM public.guild_roster_cache grc');
    expect(migration).toContain("'wow_guild_memberships'::TEXT");
    expect(migration).toContain("'guild_roster_cache'::TEXT");
  });

  it('keeps has_roster_access as the canonical boolean wrapper', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.has_roster_access');
    expect(migration).toContain('FROM public.get_roster_access_debug(p_roster_id, p_user_id)');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.has_roster_access(UUID, UUID) TO authenticated');
  });

  it('returns a typed diagnostic RPC surface', () => {
    expect(supabaseTypes).toContain('get_roster_access_debug');
    expect(supabaseTypes).toContain('best_rank_index: number | null');
    expect(supabaseTypes).toContain('profile_is_syncing: boolean');
  });

  it('falls back from stale personal edit roster ids instead of spinning forever', () => {
    expect(rosterWishesPage).toContain("searchParams.get('edit') === 'my-wishes'");
    expect(rosterWishesPage).toContain('requestedRosterById && requestedRosterById.hasAccess');
    expect(rosterWishesPage).toContain("next.delete('edit')");
    expect(rosterWishesPage).toContain("event: 'stale_personal_edit_roster_fallback'");
  });

  it('shows a no-access state when no roster is accessible', () => {
    expect(rosterWishesPage).toContain('if (!defaultRoster)');
    expect(rosterWishesPage).toContain("event: 'personal_edit_no_accessible_roster'");
    expect(rosterWishesPage).toContain('selectedRoster && !selectedRoster.hasAccess');
  });

  it('shows a recoverable state when the current member row is missing after load', () => {
    expect(rosterWishesPage).toContain('const personalEditMissingMember = hasPersonalEditIntent');
    expect(rosterWishesPage).toContain('t.rosters.accessUpdatingTitle');
    expect(rosterWishesPage).toContain("event: 'personal_edit_missing_current_member'");
    expect(rosterWishesPage).toContain("event: 'personal_edit_retry_failed'");
  });

  it('allows cache-backed self-service wish saves when guild_members is late', () => {
    expect(personalWishFallbackMigration).toContain('CREATE OR REPLACE FUNCTION public.upsert_member_roster_wishes');
    expect(personalWishFallbackMigration).toContain('v_member_exists BOOLEAN := false');
    expect(personalWishFallbackMigration).toContain('v_actor = p_member_id');
    expect(personalWishFallbackMigration).toContain('public.has_roster_access(p_roster_id, p_member_id)');
    expect(personalWishFallbackMigration).toContain('FROM public.guild_roster_cache grc');
    expect(personalWishFallbackMigration).toContain('grc.matched_user_id = p_member_id');
  });

  it('builds a linked current-user fallback before showing the missing-member callout', () => {
    expect(rosterWishesPage).toContain('const needsCurrentUserFallback = hasPersonalEditIntent');
    expect(rosterWishesPage).toContain('!safeMembers.some((member) => member.user_id === user.id)');
    expect(rosterWishesPage).toContain('const fallbackCache = (rosterCacheData || [])');
    expect(rosterWishesPage).toContain('row.matched_user_id === user.id');
    expect(rosterWishesPage).toContain('mergedMembers = [');
    expect(rosterWishesPage).toContain('id: user.id');
    expect(rosterWishesPage).toContain('seasonMemberId: seasonRow?.season_member_id || null');
  });
});
