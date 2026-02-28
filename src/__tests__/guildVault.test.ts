import { describe, expect, it } from 'vitest';

import { getVisibleGuildSettingsSections } from '@/lib/guildSettingsSections';
import {
  buildGuildVaultCreateRequest,
  createEmptyGuildSecretAccessRules,
  createEmptyGuildSecretAccessRulesCompact,
  flattenCompactGuildSecretAccessRules,
  flattenGuildSecretAccessRules,
  formatSecretPayloadForClipboard,
  formatSecretPayloadForDisplay,
  groupCompactGuildSecretAccessRules,
  groupGuildSecretAccessRules,
  summarizeCompactAccessRules,
} from '@/lib/guildVault';

describe('guild vault helpers', () => {
  it('formats credential payloads for clipboard and display', () => {
    const payload = { username: 'raidbots@example.com', password: 'super-secret' } as const;

    expect(formatSecretPayloadForClipboard(payload)).toBe(
      'Username: raidbots@example.com\nPassword: super-secret',
    );
    expect(formatSecretPayloadForDisplay(payload)).toEqual([
      'Username: raidbots@example.com',
      'Password: super-secret',
    ]);
  });

  it('formats recovery codes as one-per-line content', () => {
    const payload = { codes: ['ABC-123', 'XYZ-999'] } as const;

    expect(formatSecretPayloadForClipboard(payload)).toBe('ABC-123\nXYZ-999');
    expect(formatSecretPayloadForDisplay(payload)).toEqual([
      'Code 1: ABC-123',
      'Code 2: XYZ-999',
    ]);
  });

  it('builds a credential request with label-driven service metadata', () => {
    const accessRules = createEmptyGuildSecretAccessRulesCompact();
    accessRules.access = [
      { access_type: 'rank', min_rank_index: 0, max_rank_index: 2 },
      { access_type: 'user', user_id: 'user-2' },
    ];
    accessRules.manage = [{ access_type: 'user', user_id: 'user-1' }];

    expect(
      buildGuildVaultCreateRequest({
        guildId: 'guild-1',
        label: 'Raidbots premium',
        illustrationUrl: 'https://cdn.example.test/vault/raidbots.png',
        serviceUrl: ' https://www.raidbots.com ',
        secretKind: 'credential',
        credentialUsername: 'guild@example.com',
        credentialPassword: 'shared-password',
        genericValue: '',
        recoveryCodes: '',
        requiresReason: true,
        accessRules,
      }),
    ).toEqual({
      guild_id: 'guild-1',
      label: 'Raidbots premium',
      service_name: 'Raidbots premium',
      secret_kind: 'credential',
      illustration_url: 'https://cdn.example.test/vault/raidbots.png',
      service_url: 'https://www.raidbots.com',
      login_identifier_hint: null,
      description: null,
      requires_reason: true,
      payload: { username: 'guild@example.com', password: 'shared-password' },
      access_rules: [
        { capability: 'metadata', access_type: 'rank', min_rank_index: 0, max_rank_index: 2 },
        { capability: 'metadata', access_type: 'user', user_id: 'user-2' },
        { capability: 'reveal', access_type: 'rank', min_rank_index: 0, max_rank_index: 2 },
        { capability: 'reveal', access_type: 'user', user_id: 'user-2' },
        { capability: 'manage', access_type: 'user', user_id: 'user-1' },
        { capability: 'audit', access_type: 'user', user_id: 'user-1' },
      ],
    });
  });

  it('maps token, note, and recovery-code payloads from the simplified form model', () => {
    expect(
      buildGuildVaultCreateRequest({
        guildId: 'guild-2',
        label: 'WCL token',
        illustrationUrl: null,
        serviceUrl: '',
        secretKind: 'token',
        credentialUsername: '',
        credentialPassword: '',
        genericValue: 'abc123',
        recoveryCodes: '',
        requiresReason: false,
        accessRules: createEmptyGuildSecretAccessRulesCompact(),
      }).payload,
    ).toEqual({
      token: 'abc123',
    });

    expect(
      buildGuildVaultCreateRequest({
        guildId: 'guild-2b',
        label: 'Officers note',
        illustrationUrl: null,
        serviceUrl: '',
        secretKind: 'note',
        credentialUsername: '',
        credentialPassword: '',
        genericValue: 'Read before reset',
        recoveryCodes: '',
        requiresReason: false,
        accessRules: createEmptyGuildSecretAccessRulesCompact(),
      }).payload,
    ).toEqual({
      value: 'Read before reset',
    });

    expect(
      buildGuildVaultCreateRequest({
        guildId: 'guild-3',
        label: 'Backup codes',
        illustrationUrl: null,
        serviceUrl: 'https://accounts.google.com',
        secretKind: 'recovery_code',
        credentialUsername: '',
        credentialPassword: '',
        genericValue: '',
        recoveryCodes: ' AAA \n\nBBB\n  CCC  ',
        requiresReason: false,
        accessRules: createEmptyGuildSecretAccessRulesCompact(),
      }).payload,
    ).toEqual({
      codes: ['AAA', 'BBB', 'CCC'],
    });
  });

  it('expands compact access rules into matching reveal+metadata and manage+audit rules', () => {
    const compact = createEmptyGuildSecretAccessRulesCompact();
    compact.access = [{ access_type: 'user', user_id: 'viewer-1' }];
    compact.manage = [{ access_type: 'rank', min_rank_index: 0, max_rank_index: 1 }];

    expect(flattenCompactGuildSecretAccessRules(compact)).toEqual([
      { capability: 'metadata', access_type: 'user', user_id: 'viewer-1' },
      { capability: 'reveal', access_type: 'user', user_id: 'viewer-1' },
      { capability: 'manage', access_type: 'rank', min_rank_index: 0, max_rank_index: 1 },
      { capability: 'audit', access_type: 'rank', min_rank_index: 0, max_rank_index: 1 },
    ]);
  });

  it('groups stored rules into the compact editor state', () => {
    expect(
      groupCompactGuildSecretAccessRules([
        { capability: 'metadata', access_type: 'user', user_id: 'viewer-1' },
        { capability: 'reveal', access_type: 'user', user_id: 'viewer-1' },
        { capability: 'audit', access_type: 'user', user_id: 'manager-1' },
      ]),
    ).toEqual({
      access: [{ access_type: 'user', user_id: 'viewer-1' }],
      manage: [{ access_type: 'user', user_id: 'manager-1' }],
    });
  });

  it('summarizes compact access rules for collapsed display', () => {
    const compact = createEmptyGuildSecretAccessRulesCompact();
    compact.access = [
      { access_type: 'rank', min_rank_index: 0, max_rank_index: 0 },
      { access_type: 'rank', min_rank_index: 1, max_rank_index: 1 },
      { access_type: 'rank', min_rank_index: 2, max_rank_index: 2 },
      { access_type: 'rank', min_rank_index: 5, max_rank_index: 5 },
      { access_type: 'user', user_id: 'viewer-1' },
      { access_type: 'user', user_id: 'viewer-2' },
    ];

    expect(summarizeCompactAccessRules(compact)).toEqual({
      access: ['Access: Ranks 0-2, 5', 'Access: Members 2'],
      manage: ['Manage: GM and guild-level permissions only'],
    });

    expect(
      summarizeCompactAccessRules(compact, {
        access: 'Accès',
        manage: 'Gestion',
        ranks: 'Rangs',
        members: 'Membres',
        globalOnly: 'GM seulement',
      }),
    ).toEqual({
      access: ['Accès: Rangs 0-2, 5', 'Accès: Membres 2'],
      manage: ['Gestion: GM seulement'],
    });
  });

  it('normalizes access rules so reveal access also grants metadata visibility', () => {
    const grouped = createEmptyGuildSecretAccessRules();
    grouped.metadata = [{ access_type: 'user', user_id: 'user-1' }];
    grouped.reveal = [
      { access_type: 'rank', min_rank_index: 0, max_rank_index: 3 },
      { access_type: 'user', user_id: 'user-2' },
    ];
    grouped.audit = [{ access_type: 'user', user_id: 'auditor-1' }];

    expect(flattenGuildSecretAccessRules(grouped)).toEqual([
      { capability: 'metadata', access_type: 'user', user_id: 'user-1' },
      { capability: 'metadata', access_type: 'rank', min_rank_index: 0, max_rank_index: 3 },
      { capability: 'metadata', access_type: 'user', user_id: 'user-2' },
      { capability: 'reveal', access_type: 'rank', min_rank_index: 0, max_rank_index: 3 },
      { capability: 'reveal', access_type: 'user', user_id: 'user-2' },
      { capability: 'audit', access_type: 'user', user_id: 'auditor-1' },
    ]);
  });

  it('groups stored rules back by capability for the editor state', () => {
    expect(
      groupGuildSecretAccessRules([
        { capability: 'metadata', access_type: 'user', user_id: 'user-1' },
        { capability: 'metadata', access_type: 'user', user_id: 'user-1' },
        { capability: 'manage', access_type: 'rank', min_rank_index: 0, max_rank_index: 1 },
      ]),
    ).toEqual({
      metadata: [{ access_type: 'user', user_id: 'user-1' }],
      reveal: [],
      manage: [{ access_type: 'rank', min_rank_index: 0, max_rank_index: 1 }],
      audit: [],
    });
  });
});

describe('guild settings section visibility', () => {
  it('keeps the vault out of settings sections and still exposes delegated admin sections', () => {
    expect(
      getVisibleGuildSettingsSections({
        gm: true,
        rosters: false,
        activity: false,
      }),
    ).toEqual(['profile', 'permissions', 'rosters', 'activity', 'battlenet']);

    expect(
      getVisibleGuildSettingsSections({
        gm: false,
        rosters: true,
        activity: false,
      }),
    ).toEqual(['mypermissions', 'rosters']);

    expect(
      getVisibleGuildSettingsSections({
        gm: false,
        rosters: false,
        activity: true,
      }),
    ).toEqual(['mypermissions', 'activity']);

    expect(
      getVisibleGuildSettingsSections({
        gm: false,
        rosters: false,
        activity: false,
      }),
    ).toEqual([]);
  });
});
