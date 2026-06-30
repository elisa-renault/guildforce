import type { AtlasDocStatus, AtlasVisibilityType } from '@/lib/guildAtlas';
import type {
  GuildSecretAccessRulesCompact,
  GuildSecretKind,
  GuildSecretPayload,
  GuildSecretSummary,
} from '@/lib/guildVault';

export interface DemoAtlasDocument {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  collection: string | null;
  tags: string[];
  status: AtlasDocStatus;
  visibility_type: AtlasVisibilityType;
  min_rank_index: number | null;
  roster_id: string | null;
  roster_name: string | null;
  owner_user_id: string | null;
  owner_username: string | null;
  updated_at: string;
}

export interface DemoVaultSecret extends GuildSecretSummary {
  payload: GuildSecretPayload;
  access_rules: GuildSecretAccessRulesCompact;
}

export const demoOverviewStats = {
  committedMembers: 19,
  totalMembers: 27,
  approvedWishes: 39,
  pendingWishes: 5,
  openPolls: 1,
  atlasDocuments: 4,
  vaultSecrets: 3,
};

export const demoOverviewMemberId = 'demo-01';
export const demoOverviewCommitmentStatus = 'confirmed';

export const demoAtlasDocuments: DemoAtlasDocument[] = [
  {
    id: 'demo-atlas-midnight-roster',
    title: 'Midnight roster operating plan',
    summary: 'Raid-night rules, role targets, and launch-week ownership for officers and raiders.',
    content: [
      '## Raid cadence',
      'Wednesday and Sunday are the default progression nights. Thursday stays reserved for optional heroic cleanup when signups are strong.',
      '',
      '## Roster rules',
      '- Confirmed members get first review for the active roster.',
      '- Trials are evaluated after two raid nights with attendance and mechanics notes.',
      '- Bench calls should include a short composition reason in the raid note.',
    ].join('\n'),
    collection: 'Raid planning',
    tags: ['midnight', 'roster', 'progression'],
    status: 'published',
    visibility_type: 'members',
    min_rank_index: null,
    roster_id: null,
    roster_name: null,
    owner_user_id: 'demo-officer',
    owner_username: 'Demo officer',
    updated_at: '2026-06-28T19:30:00.000Z',
  },
  {
    id: 'demo-atlas-healer-cds',
    title: 'Healer cooldown map',
    summary: 'Draft cooldown assignment pattern for the first raid tier.',
    content: [
      '## Baseline pattern',
      'Use major raid cooldowns on scripted overlap windows first. Personal cooldown gaps should be called in the raid note before invites.',
      '',
      '## Review before publish',
      'Role leads still need to confirm Mistvale and Tidecall availability before this becomes the official plan.',
    ].join('\n'),
    collection: 'Role notes',
    tags: ['healers', 'cooldowns'],
    status: 'draft',
    visibility_type: 'officers',
    min_rank_index: null,
    roster_id: null,
    roster_name: null,
    owner_user_id: 'demo-officer',
    owner_username: 'Demo officer',
    updated_at: '2026-06-29T18:05:00.000Z',
  },
  {
    id: 'demo-atlas-midnight-roster-only',
    title: 'Midnight Mythic Team roster brief',
    summary: 'Roster-only prep notes for the first reset and bench rotation.',
    content: [
      '## Roster scope',
      'This document is visible to the Midnight Mythic Team roster in the demo.',
      '',
      '## Launch reset',
      '- Keep Wednesday invites stable.',
      '- Review Sunday bench calls after the availability poll closes.',
      '- Confirm all utility swaps before the pull timer.',
    ].join('\n'),
    collection: 'Raid planning',
    tags: ['midnight', 'roster-only'],
    status: 'published',
    visibility_type: 'roster',
    min_rank_index: null,
    roster_id: 'demo-midnight-mythic-team',
    roster_name: 'Midnight Mythic Team',
    owner_user_id: 'demo-officer',
    owner_username: 'Demo officer',
    updated_at: '2026-06-29T20:15:00.000Z',
  },
  {
    id: 'demo-atlas-trial-guide',
    title: 'Trial onboarding checklist',
    summary: 'Everything a new applicant should have ready before the first raid night.',
    content: [
      '## Before raid',
      '- Set Discord nickname to main character name.',
      '- Fill the active wishlist and poll.',
      '- Confirm crafted item plans with your role lead.',
      '',
      '## After raid',
      'Expect a short written review from an officer within 48 hours.',
    ].join('\n'),
    collection: 'Recruitment',
    tags: ['trial', 'onboarding'],
    status: 'published',
    visibility_type: 'rank',
    min_rank_index: 5,
    roster_id: null,
    roster_name: null,
    owner_user_id: 'demo-officer',
    owner_username: 'Demo officer',
    updated_at: '2026-06-26T20:15:00.000Z',
  },
  {
    id: 'demo-atlas-old-loot',
    title: 'Old loot council notes',
    summary: 'Archived policy notes kept for audit context.',
    content: 'These notes are archived in the demo to show officer lifecycle actions.',
    collection: 'Policies',
    tags: ['loot', 'archive'],
    status: 'archived',
    visibility_type: 'officers',
    min_rank_index: null,
    roster_id: null,
    roster_name: null,
    owner_user_id: 'demo-officer',
    owner_username: 'Demo officer',
    updated_at: '2026-06-20T21:00:00.000Z',
  },
];

export const demoVaultSecrets: DemoVaultSecret[] = [
  {
    id: 'demo-vault-logs',
    label: 'Warcraft Logs team account',
    service_name: 'Warcraft Logs',
    secret_kind: 'credential',
    illustration_url: null,
    service_url: 'https://www.warcraftlogs.com',
    login_identifier_hint: 'logs@astral.example',
    description: 'Shared account used by officers to manage private reports and guild aliases.',
    preview_mask: 'logs@astral.example / ********',
    requires_reason: true,
    updated_at: '2026-06-29T15:30:00.000Z',
    can_reveal: true,
    can_manage: true,
    can_audit: true,
    payload: { username: 'logs@astral.example', password: 'demo-password' },
    access_rules: {
      access: [{ access_type: 'rank', min_rank_index: 0, max_rank_index: 3 }],
      manage: [{ access_type: 'rank', min_rank_index: 0, max_rank_index: 1 }],
    },
  },
  {
    id: 'demo-vault-raid-note',
    label: 'Raid note template',
    service_name: 'Guild note',
    secret_kind: 'note',
    illustration_url: null,
    service_url: '',
    login_identifier_hint: null,
    description: 'Reusable private note for bench communication and progression assignments.',
    preview_mask: 'Private note',
    requires_reason: false,
    updated_at: '2026-06-28T11:00:00.000Z',
    can_reveal: true,
    can_manage: true,
    can_audit: true,
    payload: { value: 'Bench reason, comp goal, cooldown owner, and next review date.' },
    access_rules: {
      access: [{ access_type: 'rank', min_rank_index: 0, max_rank_index: 4 }],
      manage: [{ access_type: 'user', user_id: 'demo-01' }],
    },
  },
  {
    id: 'demo-vault-api-token',
    label: 'Recruitment webhook token',
    service_name: 'Discord',
    secret_kind: 'token',
    illustration_url: null,
    service_url: 'https://discord.com',
    login_identifier_hint: null,
    description: 'Webhook token for recruitment notifications.',
    preview_mask: 'tok_••••••••••••',
    requires_reason: true,
    updated_at: '2026-06-27T09:45:00.000Z',
    can_reveal: true,
    can_manage: false,
    can_audit: false,
    payload: { token: 'demo-token-123456' },
    access_rules: {
      access: [{ access_type: 'user', user_id: 'demo-01' }],
      manage: [],
    },
  },
];

export const createDemoVaultSecret = (index: number, secretKind: GuildSecretKind = 'note'): DemoVaultSecret => ({
  id: `demo-vault-created-${Date.now().toString(36)}-${index}`,
  label: `Demo secret ${index}`,
  service_name: 'Demo',
  secret_kind: secretKind,
  illustration_url: null,
  service_url: '',
  login_identifier_hint: null,
  description: 'Session-only demo secret.',
  preview_mask: 'Session demo value',
  requires_reason: false,
  updated_at: new Date().toISOString(),
  can_reveal: true,
  can_manage: true,
  can_audit: true,
  payload: { value: 'This value only exists in the local demo session.' },
  access_rules: {
    access: [{ access_type: 'rank', min_rank_index: 0, max_rank_index: 4 }],
    manage: [{ access_type: 'rank', min_rank_index: 0, max_rank_index: 1 }],
  },
});

export const demoVaultMembers = [
  { user_id: 'demo-01', username: 'Nyx' },
  { user_id: 'demo-02', username: 'Vesper' },
  { user_id: 'demo-03', username: 'Kairo' },
  { user_id: 'demo-04', username: 'Mira' },
];

export const demoVaultRanks = [
  { rank_index: 0, rank_name: 'Guild Master' },
  { rank_index: 1, rank_name: 'Officer' },
  { rank_index: 2, rank_name: 'Raid Lead' },
  { rank_index: 3, rank_name: 'Raider' },
  { rank_index: 4, rank_name: 'Trial' },
];
