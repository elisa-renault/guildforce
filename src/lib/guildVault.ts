export type GuildSecretKind = 'credential' | 'token' | 'note' | 'recovery_code';
export type GuildSecretCapability = 'metadata' | 'reveal' | 'manage' | 'audit';
export type GuildSecretAccessType = 'user' | 'rank';

export type GuildSecretPayload =
  | { username: string; password: string }
  | { token: string }
  | { value: string }
  | { codes: string[] };

export interface GuildSecretCapabilitySet {
  can_reveal: boolean;
  can_manage: boolean;
  can_audit: boolean;
}

export interface GuildSecretSummary extends GuildSecretCapabilitySet {
  id: string;
  label: string;
  service_name: string;
  secret_kind: GuildSecretKind;
  illustration_url: string | null;
  service_url: string | null;
  login_identifier_hint: string | null;
  description: string | null;
  preview_mask: string;
  requires_reason: boolean;
  updated_at: string;
}

export interface GuildSecretAccessRule {
  capability: GuildSecretCapability;
  access_type: GuildSecretAccessType;
  user_id?: string | null;
  min_rank_index?: number | null;
  max_rank_index?: number | null;
}

export type GuildSecretAccessRuleDraft = Omit<GuildSecretAccessRule, 'capability'>;

export type GuildSecretAccessRulesByCapability = Record<
  GuildSecretCapability,
  GuildSecretAccessRuleDraft[]
>;

export type GuildSecretAccessLevel = 'access' | 'manage';

export type GuildSecretAccessRulesCompact = Record<
  GuildSecretAccessLevel,
  GuildSecretAccessRuleDraft[]
>;

export interface GuildSecretAccessSummary {
  access: string[];
  manage: string[];
}

export interface GuildSecretAccessSummaryLabels {
  access: string;
  manage: string;
  ranks: string;
  members: string;
  globalOnly: string;
}

export interface GuildSecretAuditEvent {
  id: string;
  guild_id: string;
  secret_id: string;
  secret_label: string;
  actor_user_id: string | null;
  actor_username: string | null;
  action_type: string;
  action_context: Record<string, unknown>;
  created_at: string;
}

export interface GuildVaultCreateInput {
  guildId: string;
  label: string;
  illustrationUrl?: string | null;
  serviceUrl: string;
  secretKind: GuildSecretKind;
  credentialUsername: string;
  credentialPassword: string;
  genericValue: string;
  recoveryCodes: string;
  requiresReason: boolean;
  accessRules: GuildSecretAccessRulesCompact;
}

const SECRET_CAPABILITIES: GuildSecretCapability[] = ['metadata', 'reveal', 'manage', 'audit'];

function safeText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function sanitizeAccessRuleDraft(rule: GuildSecretAccessRuleDraft): GuildSecretAccessRuleDraft | null {
  if (rule.access_type === 'user') {
    const userId = typeof rule.user_id === 'string' ? rule.user_id.trim() : '';
    if (!userId) return null;

    return {
      access_type: 'user',
      user_id: userId,
    };
  }

  const maxRank = Number(rule.max_rank_index);
  if (!Number.isInteger(maxRank) || maxRank < 0) {
    return null;
  }

  const minRank = Number.isInteger(rule.min_rank_index) ? Number(rule.min_rank_index) : 0;

  return {
    access_type: 'rank',
    min_rank_index: minRank,
    max_rank_index: maxRank,
  };
}

function getAccessRuleKey(rule: GuildSecretAccessRuleDraft): string {
  if (rule.access_type === 'user') {
    return `user:${rule.user_id}`;
  }

  return `rank:${rule.min_rank_index ?? 0}:${rule.max_rank_index ?? 0}`;
}

function dedupeAccessRuleDrafts(rules: GuildSecretAccessRuleDraft[]): GuildSecretAccessRuleDraft[] {
  const uniqueRules = new Map<string, GuildSecretAccessRuleDraft>();

  rules.forEach((rule) => {
    const sanitized = sanitizeAccessRuleDraft(rule);
    if (!sanitized) return;
    uniqueRules.set(getAccessRuleKey(sanitized), sanitized);
  });

  return Array.from(uniqueRules.values());
}

function countUserRules(rules: GuildSecretAccessRuleDraft[]): number {
  return rules.filter((rule) => rule.access_type === 'user' && rule.user_id).length;
}

function collectRankIndices(rules: GuildSecretAccessRuleDraft[]): number[] {
  const indices = new Set<number>();

  rules.forEach((rule) => {
    if (rule.access_type !== 'rank') return;

    const min = Number.isInteger(rule.min_rank_index) ? Number(rule.min_rank_index) : 0;
    const max = Number.isInteger(rule.max_rank_index) ? Number(rule.max_rank_index) : min;
    const start = Math.min(min, max);
    const end = Math.max(min, max);

    for (let index = start; index <= end; index += 1) {
      indices.add(index);
    }
  });

  return Array.from(indices).sort((left, right) => left - right);
}

function formatRankSegments(rankIndices: number[]): string[] {
  if (rankIndices.length === 0) return [];

  const segments: string[] = [];
  let start = rankIndices[0];
  let previous = rankIndices[0];

  for (let index = 1; index < rankIndices.length; index += 1) {
    const current = rankIndices[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }

    segments.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = current;
    previous = current;
  }

  segments.push(start === previous ? `${start}` : `${start}-${previous}`);
  return segments;
}

export function createEmptyGuildSecretAccessRules(): GuildSecretAccessRulesByCapability {
  return {
    metadata: [],
    reveal: [],
    manage: [],
    audit: [],
  };
}

export function createEmptyGuildSecretAccessRulesCompact(): GuildSecretAccessRulesCompact {
  return {
    access: [],
    manage: [],
  };
}

export function groupGuildSecretAccessRules(
  rules: GuildSecretAccessRule[],
): GuildSecretAccessRulesByCapability {
  const grouped = createEmptyGuildSecretAccessRules();

  rules.forEach((rule) => {
    const capability = rule.capability;
    if (!SECRET_CAPABILITIES.includes(capability)) {
      return;
    }

    const sanitized = sanitizeAccessRuleDraft({
      access_type: rule.access_type,
      user_id: rule.user_id ?? null,
      min_rank_index: rule.min_rank_index ?? null,
      max_rank_index: rule.max_rank_index ?? null,
    });

    if (!sanitized) return;
    grouped[capability] = [...grouped[capability], sanitized];
  });

  return {
    metadata: dedupeAccessRuleDrafts(grouped.metadata),
    reveal: dedupeAccessRuleDrafts(grouped.reveal),
    manage: dedupeAccessRuleDrafts(grouped.manage),
    audit: dedupeAccessRuleDrafts(grouped.audit),
  };
}

export function flattenGuildSecretAccessRules(
  accessRules: GuildSecretAccessRulesByCapability,
): GuildSecretAccessRule[] {
  const metadataRules = dedupeAccessRuleDrafts([
    ...accessRules.metadata,
    ...accessRules.reveal,
  ]);

  const normalizedByCapability: GuildSecretAccessRulesByCapability = {
    metadata: metadataRules,
    reveal: dedupeAccessRuleDrafts(accessRules.reveal),
    manage: dedupeAccessRuleDrafts(accessRules.manage),
    audit: dedupeAccessRuleDrafts(accessRules.audit),
  };

  return SECRET_CAPABILITIES.flatMap((capability) =>
    normalizedByCapability[capability].map((rule) => ({
      capability,
      ...rule,
    })),
  );
}

export function groupCompactGuildSecretAccessRules(
  rules: GuildSecretAccessRule[],
): GuildSecretAccessRulesCompact {
  const grouped = groupGuildSecretAccessRules(rules);

  return {
    access: dedupeAccessRuleDrafts([...grouped.metadata, ...grouped.reveal]),
    manage: dedupeAccessRuleDrafts([...grouped.manage, ...grouped.audit]),
  };
}

export function flattenCompactGuildSecretAccessRules(
  accessRules: GuildSecretAccessRulesCompact,
): GuildSecretAccessRule[] {
  const accessRulesNormalized = dedupeAccessRuleDrafts(accessRules.access);
  const manageRulesNormalized = dedupeAccessRuleDrafts(accessRules.manage);

  return flattenGuildSecretAccessRules({
    metadata: accessRulesNormalized,
    reveal: accessRulesNormalized,
    manage: manageRulesNormalized,
    audit: manageRulesNormalized,
  });
}

export function summarizeCompactAccessRules(
  accessRules: GuildSecretAccessRulesCompact,
  labels: GuildSecretAccessSummaryLabels = {
    access: 'Access',
    manage: 'Manage',
    ranks: 'Ranks',
    members: 'Members',
    globalOnly: 'GM and guild-level permissions only',
  },
): GuildSecretAccessSummary {
  const summarizeLevel = (rules: GuildSecretAccessRuleDraft[], label: string) => {
    const parts: string[] = [];
    const rankSegments = formatRankSegments(collectRankIndices(rules));
    const userCount = countUserRules(rules);

    if (rankSegments.length > 0) {
      parts.push(`${label}: ${labels.ranks} ${rankSegments.join(', ')}`);
    }

    if (userCount > 0) {
      parts.push(`${label}: ${labels.members} ${userCount}`);
    }

    if (parts.length === 0) {
      parts.push(`${label}: ${labels.globalOnly}`);
    }

    return parts;
  };

  return {
    access: summarizeLevel(accessRules.access, labels.access),
    manage: summarizeLevel(accessRules.manage, labels.manage),
  };
}

export function buildGuildVaultCreateRequest({
  guildId,
  label,
  illustrationUrl,
  serviceUrl,
  secretKind,
  credentialUsername,
  credentialPassword,
  genericValue,
  recoveryCodes,
  requiresReason,
  accessRules,
}: GuildVaultCreateInput) {
  let payload: GuildSecretPayload;

  if (secretKind === 'credential') {
    payload = {
      username: credentialUsername,
      password: credentialPassword,
    };
  } else if (secretKind === 'token') {
    payload = { token: genericValue };
  } else if (secretKind === 'note') {
    payload = { value: genericValue };
  } else {
    payload = {
      codes: recoveryCodes
        .split('\n')
        .map((code) => code.trim())
        .filter(Boolean),
    };
  }

  return {
    guild_id: guildId,
    label,
    service_name: label,
    secret_kind: secretKind,
    illustration_url: typeof illustrationUrl === 'string' && illustrationUrl.trim() ? illustrationUrl.trim() : null,
    service_url: serviceUrl.trim() || null,
    login_identifier_hint: null,
    description: null,
    requires_reason: requiresReason,
    payload,
    access_rules: flattenCompactGuildSecretAccessRules(accessRules),
  };
}

export function formatSecretPayloadForClipboard(payload: GuildSecretPayload): string {
  if ('password' in payload) {
    return [`Username: ${payload.username}`, `Password: ${payload.password}`].join('\n');
  }

  if ('token' in payload) {
    return payload.token;
  }

  if ('value' in payload) {
    return payload.value;
  }

  return payload.codes.join('\n');
}

export function formatSecretPayloadForDisplay(payload: GuildSecretPayload): string[] {
  if ('password' in payload) {
    return [
      `Username: ${safeText(payload.username) || '-'}`,
      `Password: ${payload.password}`,
    ];
  }

  if ('token' in payload) {
    return [`Token: ${payload.token}`];
  }

  if ('value' in payload) {
    return [payload.value];
  }

  return payload.codes.map((code, index) => `Code ${index + 1}: ${code}`);
}
