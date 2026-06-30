import { demoRosterMembers } from './demoMembers';
import type { MemberWish, RangeStats, RoleStats, RosterSelectionStatus, ValidationStatus, WishChoice } from '@/types/guild';
import type { GuildSeason } from '@/types/seasons';

export { demoAnalyticsMetadata } from './demoAnalytics';

type DemoWishSeed = {
  classId: string;
  specIds: string[];
  comment?: string;
  validation: ValidationStatus;
  validatedBy?: string;
};

type DemoMemberSeed = {
  id: string;
  characterName: string;
  realm?: string;
  status: 'confirmed' | 'potential' | 'withdrawn';
  selectionStatus: RosterSelectionStatus;
  external?: boolean;
  wishes?: DemoWishSeed[];
};

export const demoGuild = {
  id: 'demo-astral-vanguard',
  name: 'Astral Vanguard',
  region: 'EU',
  server: 'Tarren Mill',
  faction: 'Horde',
};

export const demoRoster = {
  id: 'demo-midnight-mythic-team',
  seasonId: 'demo-midnight-season',
  name: 'Midnight Mythic Team',
};

export const demoRosters = [
  {
    id: demoRoster.id,
    name: demoRoster.name,
    is_default: true,
    hasAccess: true,
    wishes_locked: false,
    wishes_lock_at: null,
  },
  {
    id: 'demo-weekend-heroic-team',
    name: 'Weekend Heroic Team',
    is_default: false,
    hasAccess: true,
    wishes_locked: false,
    wishes_lock_at: null,
  },
];

export const demoSeasons: GuildSeason[] = [
  {
    id: demoRoster.seasonId,
    guild_id: demoGuild.id,
    roster_id: demoRoster.id,
    hide_member_wishes: false,
    name: 'Midnight Launch Prep',
    state: 'active',
    starts_at: '2026-07-01T18:00:00.000Z',
    ends_at: null,
    source_season_id: null,
    created_by: 'demo-officer',
    activated_at: '2026-06-26T18:00:00.000Z',
    archived_at: null,
    created_at: '2026-06-20T18:00:00.000Z',
    updated_at: '2026-06-26T18:00:00.000Z',
  },
  {
    id: 'demo-midnight-draft-season',
    guild_id: demoGuild.id,
    roster_id: demoRoster.id,
    hide_member_wishes: false,
    name: 'Midnight Split Prep',
    state: 'draft',
    starts_at: null,
    ends_at: null,
    source_season_id: demoRoster.seasonId,
    created_by: 'demo-officer',
    activated_at: null,
    archived_at: null,
    created_at: '2026-06-28T18:00:00.000Z',
    updated_at: '2026-06-28T18:00:00.000Z',
  },
  {
    id: 'demo-the-war-within-archive',
    guild_id: demoGuild.id,
    roster_id: demoRoster.id,
    hide_member_wishes: false,
    name: 'The War Within S3',
    state: 'archived',
    starts_at: '2026-03-01T18:00:00.000Z',
    ends_at: '2026-06-15T18:00:00.000Z',
    source_season_id: null,
    created_by: 'demo-officer',
    activated_at: '2026-03-01T18:00:00.000Z',
    archived_at: '2026-06-16T18:00:00.000Z',
    created_at: '2026-02-20T18:00:00.000Z',
    updated_at: '2026-06-16T18:00:00.000Z',
  },
];

export const demoMetrics = {
  totalMembers: 27,
  submittedMembers: 21,
  approvedWishes: 14,
  pendingWishes: 7,
  rejectedWishes: 2,
  externalMembers: 2,
};

const wish = (
  choice_index: number,
  seed: DemoWishSeed,
  validatedBy = 'Officer council',
): WishChoice => ({
  choice_index,
  class_id: seed.classId,
  spec_ids: seed.specIds,
  comment: seed.comment ?? null,
  validation_status: seed.validation,
  validated_by_username: seed.validation === 'pending' ? null : validatedBy,
  validated_at: seed.validation === 'pending' ? null : '2026-06-26T19:30:00.000Z',
});

const memberSeeds: DemoMemberSeed[] = [
  { id: 'demo-01', characterName: 'Nyxara', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'death-knight', specIds: ['dk-blood'], validation: 'approved', comment: 'Can flex DPS if we recruit another tank.' },
    { classId: 'paladin', specIds: ['paladin-protection'], validation: 'pending' },
    { classId: 'demon-hunter', specIds: ['dh-vengeance'], validation: 'pending', comment: 'Backup tank option if the roster needs mobility.' },
  ] },
  { id: 'demo-02', characterName: 'Thornwall', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'paladin', specIds: ['paladin-protection'], validation: 'approved' },
    { classId: 'warrior', specIds: ['warrior-protection'], validation: 'approved' },
    { classId: 'death-knight', specIds: ['dk-blood'], validation: 'pending', comment: 'Can cover grip utility if needed.' },
  ] },
  { id: 'demo-03', characterName: 'Lunaria', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'priest', specIds: ['priest-discipline'], validation: 'approved', comment: 'Prefers raid healing assignment.' },
  ] },
  { id: 'demo-04', characterName: 'Mistvale', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'monk', specIds: ['monk-mistweaver'], validation: 'approved' },
    { classId: 'druid', specIds: ['druid-restoration'], validation: 'pending' },
  ] },
  { id: 'demo-05', characterName: 'Seraphyne', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'paladin', specIds: ['paladin-holy'], validation: 'approved' },
  ] },
  { id: 'demo-06', characterName: 'Tidecall', status: 'potential', selectionStatus: 'bench', wishes: [
    { classId: 'shaman', specIds: ['shaman-restoration'], validation: 'pending', comment: 'Schedule depends on work shifts.' },
  ] },
  { id: 'demo-07', characterName: 'Bloomshift', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'druid', specIds: ['druid-restoration'], validation: 'approved' },
    { classId: 'evoker', specIds: ['evoker-preservation'], validation: 'rejected' },
  ] },
  { id: 'demo-08', characterName: 'Ashflare', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'mage', specIds: ['mage-fire', 'mage-arcane'], validation: 'approved' },
  ] },
  { id: 'demo-09', characterName: 'Voidmark', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'warlock', specIds: ['warlock-destruction'], validation: 'approved', comment: 'Happy to handle gateway assignments.' },
  ] },
  { id: 'demo-10', characterName: 'Skyrend', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'evoker', specIds: ['evoker-augmentation'], validation: 'approved' },
  ] },
  { id: 'demo-11', characterName: 'Ironchant', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'warrior', specIds: ['warrior-fury'], validation: 'approved' },
    { classId: 'death-knight', specIds: ['dk-frost'], validation: 'pending' },
  ] },
  { id: 'demo-12', characterName: 'Nightstep', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'rogue', specIds: ['rogue-assassination'], validation: 'approved' },
  ] },
  { id: 'demo-13', characterName: 'Starwoven', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'priest', specIds: ['priest-shadow'], validation: 'approved' },
  ] },
  { id: 'demo-14', characterName: 'Frostlark', status: 'potential', selectionStatus: 'bench', wishes: [
    { classId: 'mage', specIds: ['mage-frost'], validation: 'pending' },
  ] },
  { id: 'demo-15', characterName: 'Wildarrow', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'hunter', specIds: ['hunter-marksmanship'], validation: 'approved' },
  ] },
  { id: 'demo-16', characterName: 'Sunforge', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'paladin', specIds: ['paladin-retribution'], validation: 'approved' },
  ] },
  { id: 'demo-17', characterName: 'Felborne', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'demon-hunter', specIds: ['dh-havoc'], validation: 'approved' },
  ] },
  { id: 'demo-18', characterName: 'Rootflare', status: 'potential', selectionStatus: 'undecided', wishes: [
    { classId: 'druid', specIds: ['druid-balance'], validation: 'pending', comment: 'Could reroll if ranged is full.' },
  ] },
  { id: 'demo-19', characterName: 'Stormbyte', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'shaman', specIds: ['shaman-elemental'], validation: 'rejected', comment: 'Officer note: revisit after pending ranged trials are confirmed.' },
  ] },
  { id: 'demo-20', characterName: 'Nethercoil', status: 'confirmed', selectionStatus: 'selected', wishes: [
    { classId: 'warlock', specIds: ['warlock-affliction'], validation: 'approved' },
  ] },
  { id: 'demo-21', characterName: 'Kaelith', status: 'withdrawn', selectionStatus: 'not_selected', wishes: [
    { classId: 'mage', specIds: ['mage-arcane'], validation: 'pending', comment: 'May return after launch month.' },
  ] },
  { id: 'demo-22', characterName: 'Rookguard', realm: 'Draenor', status: 'confirmed', selectionStatus: 'selected', external: true, wishes: [
    { classId: 'warrior', specIds: ['warrior-protection'], validation: 'approved', validatedBy: 'Nyx', comment: 'Manual recruit added after officer review.' },
  ] },
  { id: 'demo-23', characterName: 'Vespera', realm: 'Kazzak', status: 'confirmed', selectionStatus: 'selected', external: true, wishes: [
    { classId: 'priest', specIds: ['priest-shadow'], validation: 'approved', validatedBy: 'Nyx', comment: 'Manual recruit confirmed for ranged coverage.' },
  ] },
  { id: 'demo-24', characterName: 'Dawnbraid', status: 'confirmed', selectionStatus: 'undecided' },
  { id: 'demo-25', characterName: 'Embershard', status: 'confirmed', selectionStatus: 'undecided' },
  { id: 'demo-26', characterName: 'Bonewake', status: 'potential', selectionStatus: 'undecided' },
  { id: 'demo-27', characterName: 'Gloomveil', status: 'confirmed', selectionStatus: 'undecided' },
];

const getDemoRosterMember = (characterName: string) => {
  const member = demoRosterMembers.find((rosterMember) => rosterMember.character_name === characterName);
  if (!member) {
    throw new Error(`Missing demo roster member fixture for ${characterName}`);
  }
  return member;
};

const getDemoMemberIdentity = (member: DemoMemberSeed) => {
  if (member.external) {
    return {
      username: `Manual-${member.characterName.replace(/\s+/g, '-')}`,
      mainCharacterName: member.characterName,
      realmName: member.realm ?? demoGuild.server,
    };
  }

  const rosterMember = getDemoRosterMember(member.characterName);
  return {
    username: rosterMember.profile?.username ?? rosterMember.character_name,
    mainCharacterName: rosterMember.character_name,
    realmName: rosterMember.character_realm,
  };
};

export const demoMembers: MemberWish[] = memberSeeds.map((member) => ({
  id: member.id,
  seasonMemberId: `${member.id}-season`,
  ...getDemoMemberIdentity(member),
  status: member.status,
  selectionStatus: member.selectionStatus,
  isExternal: member.external,
  externalWishId: member.external ? `${member.id}-external-wish` : null,
  wishes: (member.wishes ?? []).map((seed, index) => wish(index + 1, seed, seed.validatedBy)),
}));

export const demoRoleStats: RoleStats = {
  tank: 2,
  healer: 5,
  dps: 20,
};

export const demoRangeStats: RangeStats = {
  melee: 9,
  ranged: 16,
};

export const demoAnalytics = {
  missing: [
    'Only one confirmed Devotion Aura source after validation',
    'No backup combat resurrection if Bloomshift is absent',
    'Mail token is overloaded for launch-week gearing',
  ],
  present: [
    'Bloodlust covered by Shaman and Evoker options',
    'Gateway, raid stamina, and Mystic Touch are present',
    'Two stable tanks and five healer candidates for progression',
  ],
  alerts: [
    '5 wishes still need officer review before lock',
    '2 players are external manual entries and should be claimed later',
  ],
};

export const demoPolls = [
  { id: 'poll-1', title: 'Which raid days work for you?', status: 'Open', responses: 24 },
  { id: 'poll-2', title: 'Are you available for Midnight launch week?', status: 'Draft', responses: 18 },
  { id: 'poll-3', title: 'Loot / attendance / bench preference survey', status: 'Results shared', responses: 21 },
];

export const demoForumTopics = [
  { id: 'topic-1', title: 'Midnight roster announcement', category: 'Announcements', pinned: true, replies: 12 },
  { id: 'topic-2', title: 'First raid strategy notes', category: 'Strategy', pinned: true, replies: 9 },
  { id: 'topic-3', title: 'Roster feedback before wishlist lock', category: 'Roster', pinned: false, replies: 17 },
];
