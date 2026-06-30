import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { demoRosterMembers } from '@/demo/demoMembers';
import { DEMO_ACTIVE_POLL_ID, DEMO_CLOSED_POLL_ID } from '@/demo/demoPolls';
import { demoAnalyticsMetadata, demoMembers } from '@/demo/demoRoster';
import { translationsEn } from '@/i18n/translations.en';
import { buildCompositionCoverage } from '@/lib/compositionAnalytics';
import { buildMajorBuffsDebuffs } from '@/lib/raidEffectAnalytics';
import Demo from '@/pages/Demo';

const navigateMock = vi.fn();
const toastMock = vi.fn();
const supabaseFromMock = vi.hoisted(() => vi.fn());
const supabaseRpcMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({}),
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { ...translationsEn, lang: 'en' },
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@posthog/react', () => ({
  useFeatureFlagEnabled: () => false,
}));

vi.mock('@/lib/productEvents', () => ({
  capturePostHogProductEvent: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseFromMock,
    rpc: supabaseRpcMock,
  },
}));

const selectTab = (name: RegExp) => {
  const tab = screen.getByRole('tab', { name });
  fireEvent.pointerDown(tab, { button: 0, ctrlKey: false });
  fireEvent.pointerUp(tab, { button: 0, ctrlKey: false });
  fireEvent.click(tab);
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    configurable: true,
  });
  Object.defineProperty(window, 'ResizeObserver', {
    value: class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
  toastMock.mockReset();
  supabaseFromMock.mockReset();
  supabaseRpcMock.mockReset();
});

describe('Demo page', () => {
  it('renders the public sample guild as a real roster workspace on /demo', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Astral Vanguard/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Midnight Mythic Team').length).toBeGreaterThan(0);
    expect(screen.getByText('Midnight Launch Prep')).toBeInTheDocument();
    expect(screen.queryByText('Demo mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Create my guild workspace')).not.toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Validated Selection')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Columns')).toBeInTheDocument();
    expect(screen.getByText('Nyx')).toBeInTheDocument();
    expect(screen.getByText('Nyxara - Tarren Mill')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Wishes Table' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Members' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Polls' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('supports /demo/roster as the same roster workspace', () => {
    render(
      <MemoryRouter initialEntries={['/demo/roster']}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Astral Vanguard/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Midnight Mythic Team').length).toBeGreaterThan(0);
    expect(screen.getByText('Midnight Launch Prep')).toBeInTheDocument();
  });

  it('shows demo guidance when an officer action is simulated', () => {
    render(
      <MemoryRouter initialEntries={['/demo/roster']}>
        <Demo />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Edit my wishes'));

    expect(toastMock).toHaveBeenCalledWith({
      title: 'Demo action',
      description: 'The demo does not let you test these actions. Sign in with Battle.net to use Guildforce with your guild!',
    });
  });

  it('renders a local member wishes detail page on /demo/member/:memberId', () => {
    render(
      <MemoryRouter initialEntries={['/demo/member/demo-01']}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Astral Vanguard/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nyx').length).toBeGreaterThan(0);
    expect(screen.getByText('Nyxara - Tarren Mill')).toBeInTheDocument();
    expect(screen.getByText('Wishes of Nyx')).toBeInTheDocument();
    expect(screen.getByText('Midnight Launch Prep')).toBeInTheDocument();
    expect(screen.getByText('Decision')).toBeInTheDocument();
    expect(screen.getByText('Commitment')).toBeInTheDocument();
    expect(screen.getByText('First wish granted')).toBeInTheDocument();
    expect(screen.getByText('Death Knight')).toBeInTheDocument();
    expect(screen.getByText('Paladin')).toBeInTheDocument();
    expect(screen.getByText('Demon Hunter')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('No wish changes for this season yet.')).toBeInTheDocument();
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('opens the local member detail route from the demo roster table', () => {
    render(
      <MemoryRouter initialEntries={['/demo']}>
        <Demo />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Nyx'));

    expect(navigateMock).toHaveBeenCalledWith('/demo/member/demo-01?rosterId=demo-midnight-mythic-team&seasonId=demo-midnight-season');
  });

  it('returns from demo member details to the roster while preserving roster and season query params', () => {
    render(
      <MemoryRouter initialEntries={['/demo/member/demo-01?rosterId=demo-alt-roster&seasonId=demo-archived-season']}>
        <Demo />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(navigateMock).toHaveBeenCalledWith('/demo/roster?rosterId=demo-alt-roster&seasonId=demo-archived-season');
  });

  it('keeps demo member detail actions local and simulated', () => {
    render(
      <MemoryRouter initialEntries={['/demo/member/demo-01']}>
        <Demo />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }));
    fireEvent.click(screen.getAllByTitle('Reject')[0]);

    expect(toastMock).toHaveBeenCalledWith({
      title: 'Demo action',
      description: 'The demo does not let you test these actions. Sign in with Battle.net to use Guildforce with your guild!',
    });
    expect(toastMock).toHaveBeenCalledTimes(3);
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('handles unknown demo member detail routes without Supabase reads', () => {
    render(
      <MemoryRouter initialEntries={['/demo/member/unknown']}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('No data to display').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Back' }).length).toBeGreaterThan(0);
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('renders real analytics from injected metadata without Supabase metadata reads', async () => {
    render(
      <MemoryRouter initialEntries={['/demo/analytics']}>
        <Demo />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Analysis scope:')).toBeInTheDocument();
    expect(screen.getByText('Major Buffs')).toBeInTheDocument();
    expect(screen.getByText('Major Debuffs')).toBeInTheDocument();
    expect(screen.getByText('Raid Essentials')).toBeInTheDocument();
    expect(screen.getByText('Raid Enhancements')).toBeInTheDocument();
    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByText('Enemy Weakening')).toBeInTheDocument();
    expect(screen.getByText('Bloodlust')).toBeInTheDocument();
    expect(screen.getByText(/Combat resurrection/)).toBeInTheDocument();
    expect(screen.getByText('Demonic Gateway')).toBeInTheDocument();
    expect(screen.getByText('Raid defensives')).toBeInTheDocument();
    expect(screen.getByText(/Knockback/)).toBeInTheDocument();
    expect(screen.getByText('Healing reduction')).toBeInTheDocument();
    expect(screen.getByText('Extra damage to shields')).toBeInTheDocument();
    expect(screen.getByText('Low risk: Cloth and Plate each concentrate 6 of 18 wishes (33%).')).toBeInTheDocument();
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('renders the demo polls workspace with realistic local poll cards', () => {
    render(
      <MemoryRouter initialEntries={['/demo/polls']}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getByRole('tab', { name: /Active \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Drafts \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Closed \(1\)/i })).toBeInTheDocument();
    expect(screen.getByText('Midnight launch availability check')).toBeInTheDocument();
    expect(screen.getByText('23/27 responded')).toBeInTheDocument();
    expect(screen.getByText('4 questions')).toBeInTheDocument();
    expect(screen.getByText('2 sections')).toBeInTheDocument();

    selectTab(/Drafts \(1\)/i);
    expect(screen.getByText('Trial feedback prep')).toBeInTheDocument();
    expect(screen.getByText('Draft preview only. It has not been published to members.')).toBeInTheDocument();

    selectTab(/Closed \(1\)/i);
    expect(screen.getByText('Loot, attendance, and bench policy review')).toBeInTheDocument();
    expect(screen.getByText(/Members favor roster upgrades first/i)).toBeInTheDocument();
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('navigates from demo poll cards to local response and results routes', () => {
    render(
      <MemoryRouter initialEntries={['/demo/polls']}>
        <Demo />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Open poll/i }));
    expect(navigateMock).toHaveBeenCalledWith(`/demo/poll/${DEMO_ACTIVE_POLL_ID}`);

    selectTab(/Closed \(1\)/i);
    fireEvent.click(screen.getByRole('button', { name: /View results/i }));
    expect(navigateMock).toHaveBeenCalledWith(`/demo/poll/${DEMO_CLOSED_POLL_ID}/results`);
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('renders and submits a local demo poll response without Supabase reads', () => {
    render(
      <MemoryRouter initialEntries={[`/demo/poll/${DEMO_ACTIVE_POLL_ID}`]}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getByText('Which raid nights can you commit to for the first four weeks?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Wednesday + Sunday'));
    fireEvent.click(screen.getByLabelText('Normal clear'));
    fireEvent.click(screen.getByRole('button', { name: /Submit my responses/i }));

    expect(toastMock).toHaveBeenCalledWith({
      title: 'Demo response saved',
      description: 'Your answers were stored locally for this demo session.',
    });
    expect(navigateMock).toHaveBeenCalledWith(`/demo/poll/${DEMO_ACTIVE_POLL_ID}/results`);
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('renders closed demo poll results from local fixture data', () => {
    render(
      <MemoryRouter initialEntries={[`/demo/poll/${DEMO_CLOSED_POLL_ID}/results`]}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Loot, attendance, and bench policy review').length).toBeGreaterThan(0);
    expect(screen.getByText('Respondents')).toBeInTheDocument();
    expect(screen.getByText('21 respondents')).toBeInTheDocument();
    expect(screen.getAllByText('Which loot council priority feels fairest for launch week?').length).toBeGreaterThan(0);
    expect(screen.getByText('Roster upgrade first')).toBeInTheDocument();
    expect(screen.getAllByText('What would make loot or bench calls easier to accept?').length).toBeGreaterThan(0);
    expect(screen.getByText(/A short note after each raid/i)).toBeInTheDocument();
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('handles unknown demo poll routes without Supabase reads', () => {
    render(
      <MemoryRouter initialEntries={['/demo/poll/unknown']}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getByText('Demo poll not found')).toBeInTheDocument();
    expect(screen.getByText('This local demo route does not match an available sample poll.')).toBeInTheDocument();
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('keeps demo analytics metadata complete enough for all coverage sections', () => {
    const spellIds = new Set(demoAnalyticsMetadata.wowSpells.map((spell) => spell.spell_id));
    const abilityKeys = new Set(demoAnalyticsMetadata.compositionAbilities.map((ability) => ability.ability_key));
    const countAbilitiesByCoverage = (coverageKey: string) =>
      demoAnalyticsMetadata.compositionAbilities.filter((ability) => ability.coverage_key === coverageKey).length;

    for (const ability of demoAnalyticsMetadata.compositionAbilities) {
      if (ability.spell_id) {
        expect(spellIds.has(ability.spell_id)).toBe(true);
      }
      expect(ability.ability_key.startsWith('demo-')).toBe(false);
    }

    for (const mapping of demoAnalyticsMetadata.compositionMappings) {
      expect(abilityKeys.has(mapping.ability_id)).toBe(true);
    }

    expect(demoAnalyticsMetadata.raidEffects.some((effect) => effect.category === 'major_buff')).toBe(true);
    expect(demoAnalyticsMetadata.raidEffects.some((effect) => effect.category === 'major_debuff')).toBe(true);
    expect(countAbilitiesByCoverage('combat_res')).toBeGreaterThan(3);
    expect(countAbilitiesByCoverage('interrupts')).toBeGreaterThan(8);
    expect(countAbilitiesByCoverage('ally_magic_dispels')).toBeGreaterThan(8);
    expect(countAbilitiesByCoverage('ally_poison_dispels')).toBeGreaterThan(10);
    expect(countAbilitiesByCoverage('raid_defensives')).toBeGreaterThan(3);
    expect(countAbilitiesByCoverage('knockbacks')).toBeGreaterThan(3);
    expect(countAbilitiesByCoverage('aoe_stuns')).toBeGreaterThan(5);
    expect(countAbilitiesByCoverage('aoe_slows')).toBeGreaterThan(10);
    expect(countAbilitiesByCoverage('mortal_strike')).toBeGreaterThan(1);
    expect(countAbilitiesByCoverage('extra_damage_to_shields')).toBeGreaterThan(3);
    expect(countAbilitiesByCoverage('warlock_curses')).toBeGreaterThan(1);
    expect(abilityKeys.has('curse_of_tongues_cast_speed')).toBe(true);
  });

  it('builds grouped real spell entries for analytics tooltip data', () => {
    const majorCoverage = buildMajorBuffsDebuffs(
      demoMembers,
      demoAnalyticsMetadata.raidEffects,
      demoAnalyticsMetadata.wowSpells,
      'en',
      () => true,
    );
    const coverage = buildCompositionCoverage(
      demoMembers,
      demoAnalyticsMetadata.compositionAbilities,
      demoAnalyticsMetadata.compositionMappings,
      demoAnalyticsMetadata.wowSpells,
      'en',
      () => true,
      {
        coverageKinds: ['raid_utility', 'raid_defensive', 'external', 'raid_buff', 'raid_debuff'],
      },
    );
    const atrophicPoison = majorCoverage.debuffs.find((stat) => stat.spellId === 381637);
    const coverageByKey = new Map(coverage.map((stat) => [stat.coverageKey, stat]));
    const spellNamesFor = (coverageKey: string) =>
      coverageByKey.get(coverageKey)?.spellEntries.map((entry) => entry.name) ?? [];

    expect(atrophicPoison?.spellEntries[0]?.description).toContain(
      'Coats your weapons with a Non-Lethal Poison',
    );
    expect(spellNamesFor('combat_res')).toEqual(expect.arrayContaining(['Rebirth', 'Raise Ally', 'Soulstone', 'Intercession']));
    expect(spellNamesFor('interrupts')).toEqual(expect.arrayContaining(['Mind Freeze', 'Disrupt', 'Counterspell', 'Pummel']));
    expect(spellNamesFor('ally_magic_dispels')).toEqual(expect.arrayContaining(['Cleanse', "Nature's Cure", 'Mass Dispel', 'Singe Magic']));
    expect(spellNamesFor('warlock_curses')).toEqual(expect.arrayContaining(['Curse of Weakness', 'Curse of Tongues']));
    expect(spellNamesFor('execute_damage')).toEqual(expect.arrayContaining(['Execute', 'Shadow Word: Death', 'Kill Shot', 'Hammer of Wrath', 'Touch of Death']));
    expect(spellNamesFor('extra_damage_to_shields')).toEqual(expect.arrayContaining(['Wrecking Throw', 'Shattering Throw', 'Unravel', 'Devour Matter']));
  });

  it('renders the public members screen like the guild members workspace without Supabase reads', () => {
    render(
      <MemoryRouter initialEntries={['/demo/members']}>
        <Demo />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Astral Vanguard/).length).toBeGreaterThan(0);
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All classes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All ranks/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Guildforce' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Main/Alt' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Character/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Server/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Level/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Class/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Player/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Rank/i })).toBeInTheDocument();
    expect(screen.getAllByText('Nyxara').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Guild Master').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GM Alt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Officer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Officer Alt').length).toBeGreaterThan(0);
    expect(screen.queryByText('Social')).not.toBeInTheDocument();
    expect(screen.getAllByText('90').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getAllByText('Alt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Riftcoil').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ashvault').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not registered').length).toBeGreaterThan(0);
    expect(screen.queryByText('Social')).not.toBeInTheDocument();
    expect(supabaseFromMock).not.toHaveBeenCalled();
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('keeps demo member ranks and levels coherent with the fake guild hierarchy', () => {
    const raidRankIndexes = new Set([0, 2, 4, 5, 6, 7]);
    const gmRanks = new Set(['Guild Master', 'GM Alt']);
    const officerRanks = new Set(['Officer', 'Officer Alt']);
    const raidLeaderRanks = new Set(['Raid Leader', 'Alt']);
    const forbiddenRaidLeaderRanks = new Set(['Officer', 'Officer Alt', 'Core Raider', 'Raider', 'Trial']);
    const membersByProfile = new Map<string, string[]>();

    for (const member of demoRosterMembers) {
      expect(member.character_level).toBeLessThanOrEqual(90);
      expect(member.rank_name).not.toBe('Social');

      if (raidRankIndexes.has(member.rank_index)) {
        expect(member.character_level).toBe(90);
      }

      if (!member.matched_user_id) continue;
      const ranks = membersByProfile.get(member.matched_user_id) ?? [];
      ranks.push(member.rank_name ?? '');
      membersByProfile.set(member.matched_user_id, ranks);
    }

    expect(membersByProfile.get('gf-nyx')?.every((rank) => gmRanks.has(rank))).toBe(true);
    expect(membersByProfile.get('gf-thorn')?.every((rank) => officerRanks.has(rank))).toBe(true);
    expect(membersByProfile.get('gf-luna')?.every((rank) => officerRanks.has(rank))).toBe(true);
    expect(membersByProfile.get('gf-ash')?.every((rank) => raidLeaderRanks.has(rank))).toBe(true);
    expect(membersByProfile.get('gf-void')?.every((rank) => raidLeaderRanks.has(rank))).toBe(true);
    expect(membersByProfile.get('gf-ash')?.some((rank) => forbiddenRaidLeaderRanks.has(rank))).toBe(false);
    expect(membersByProfile.get('gf-void')?.some((rank) => forbiddenRaidLeaderRanks.has(rank))).toBe(false);

    expect(demoRosterMembers.find((member) => member.character_name === 'Riftcoil')?.rank_name).toBe('Alt');
    expect(demoRosterMembers.find((member) => member.character_name === 'Ashvault')?.rank_name).toBe('Alt');
    expect(demoRosterMembers.find((member) => member.character_name === 'Nethercoil')?.rank_name).toBe('Raider');
    expect(demoRosterMembers.find((member) => member.character_name === 'Nethercoil')?.matched_user_id).toBe('gf-nether');
    expect(demoMembers.some((member) => member.mainCharacterName === 'Riftcoil')).toBe(false);
    expect(demoMembers.find((member) => member.mainCharacterName === 'Nethercoil')?.username).toBe('Nether');
    expect(demoMembers.find((member) => member.mainCharacterName === 'Wildarrow')?.username).toBe('Wild');
    expect(demoMembers.find((member) => member.mainCharacterName === 'Rootflare')?.username).toBe('Root');
    expect(demoMembers.find((member) => member.mainCharacterName === 'Kaelith')?.username).toBe('Kael');
    expect(demoMembers.find((member) => member.mainCharacterName === 'Bonewake')?.username).toBe('Bone');
    expect(demoMembers.find((member) => member.mainCharacterName === 'Gloomveil')?.username).toBe('Gloom');
  });

  it('keeps roster wishes as a subset of demo guild members', () => {
    const rosterMembersByName = new Map(demoRosterMembers.map((member) => [member.character_name, member]));
    const excludedAltCharacters = ['Nyxbank', 'Thornmark', 'Moonlace', 'Ashvault', 'Riftcoil'];
    const expectedRosterCharacters = ['Dawnbraid', 'Embershard', 'Bonewake', 'Gloomveil', 'Nethercoil'];

    expect(demoMembers).toHaveLength(27);

    for (const wishMember of demoMembers) {
      if (wishMember.isExternal) continue;

      const rosterMember = rosterMembersByName.get(wishMember.mainCharacterName);
      expect(rosterMember).toBeDefined();
      expect(rosterMember?.profile?.username).toBeTruthy();
      expect(wishMember.username).toBe(rosterMember?.profile?.username);
      expect(wishMember.mainCharacterName).toBe(rosterMember?.character_name);
      expect(wishMember.realmName).toBe(rosterMember?.character_realm);
      expect(rosterMember?.rank_name).not.toBe('Alt');
    }

    expect(demoMembers.some((member) => member.username.startsWith('Guest-'))).toBe(false);

    for (const characterName of excludedAltCharacters) {
      expect(demoMembers.some((member) => member.mainCharacterName === characterName)).toBe(false);
    }

    for (const characterName of expectedRosterCharacters) {
      expect(demoMembers.some((member) => member.mainCharacterName === characterName)).toBe(true);
    }

    expect(demoMembers.find((member) => member.mainCharacterName === 'Rookguard')).toMatchObject({
      status: 'confirmed',
      selectionStatus: 'selected',
      isExternal: true,
    });
    expect(demoMembers.find((member) => member.mainCharacterName === 'Rookguard')?.wishes).toHaveLength(1);
    expect(demoMembers.find((member) => member.mainCharacterName === 'Rookguard')?.wishes[0]?.validated_by_username).toBe('Nyx');
    expect(demoMembers.find((member) => member.mainCharacterName === 'Vespera')).toMatchObject({
      status: 'confirmed',
      selectionStatus: 'selected',
      isExternal: true,
    });
    expect(demoMembers.find((member) => member.mainCharacterName === 'Vespera')?.wishes).toHaveLength(1);
    expect(demoMembers.find((member) => member.mainCharacterName === 'Vespera')?.wishes[0]?.validated_by_username).toBe('Nyx');
    expect(demoMembers.find((member) => member.mainCharacterName === 'Nyxara')?.wishes.length).toBeGreaterThan(2);
    expect(demoMembers.find((member) => member.mainCharacterName === 'Thornwall')?.wishes.length).toBeGreaterThan(2);
  });

  it('filters and sorts local demo members', () => {
    render(
      <MemoryRouter initialEntries={['/demo/members']}>
        <Demo />
      </MemoryRouter>,
    );

    const characterHeader = () => screen.getByRole('columnheader', { name: /Character/i });
    expect(characterHeader()).toHaveAttribute('aria-sort', 'none');

    fireEvent.click(screen.getByText('Character'));
    expect(characterHeader()).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(screen.getByText('Character'));
    expect(characterHeader()).toHaveAttribute('aria-sort', 'descending');

    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), {
      target: { value: 'Nyxara' },
    });

    expect(screen.getAllByText('Nyxara').length).toBeGreaterThan(0);
    expect(screen.queryByText('Thornwall')).not.toBeInTheDocument();
  });

  it('shows demo guidance when a member action is simulated', async () => {
    render(
      <MemoryRouter initialEntries={['/demo/members']}>
        <Demo />
      </MemoryRouter>,
    );

    fireEvent.pointerDown(screen.getAllByLabelText('Actions')[0], { button: 0, ctrlKey: false });
    fireEvent.keyDown(screen.getAllByLabelText('Actions')[0], { key: 'Enter', code: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Main/i }));

    expect(toastMock).toHaveBeenCalledWith({
      title: 'Demo action',
      description: 'The demo does not let you test these actions. Sign in with Battle.net to use Guildforce with your guild!',
    });
  });
});
