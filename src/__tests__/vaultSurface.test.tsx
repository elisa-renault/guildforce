import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GuildVaultSurface } from '@/components/settings';
import { demoVaultMembers, demoVaultRanks, demoVaultSecrets } from '@/demo/demoWorkspace';
import { translationsEn } from '@/i18n/translations.en';
import { flattenCompactGuildSecretAccessRules, type GuildSecretAccessRule } from '@/lib/guildVault';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { ...translationsEn, lang: 'en' },
  }),
}));

describe('GuildVaultSurface', () => {
  it('renders vault secrets and reveals a local payload without Supabase', async () => {
    const revealableSecret = demoVaultSecrets.find((secret) => secret.id === 'demo-vault-raid-note');

    render(
      <GuildVaultSurface
        guildId="demo-guild"
        canManageVault
        officerRankThreshold={2}
        secrets={demoVaultSecrets}
        loading={false}
        mutating={false}
        members={demoVaultMembers}
        ranks={demoVaultRanks}
        createSecret={vi.fn()}
        updateSecret={vi.fn()}
        rotateSecret={vi.fn()}
        archiveSecret={vi.fn()}
        revealSecret={async (secretId) => {
          const secret = demoVaultSecrets.find((item) => item.id === secretId);
          if (!secret) throw new Error('missing secret');
          return {
            payload: secret.payload,
            expires_client_at: new Date(Date.now() + 60_000).toISOString(),
          };
        }}
        loadSecretAccessRules={async (secretId) => {
          const secret = demoVaultSecrets.find((item) => item.id === secretId);
          return secret ? flattenCompactGuildSecretAccessRules(secret.access_rules) : [];
        }}
        saveSecretAccessRules={async (_secretId: string, _rules: GuildSecretAccessRule[]) => undefined}
        uploadIllustration={async () => ({ filePath: null, publicUrl: 'https://guildforce.local/demo.png' })}
      />,
    );

    expect(screen.getByRole('heading', { name: /vault/i })).toBeTruthy();
    expect(screen.getByText('Raid note template')).toBeTruthy();

    const revealButtons = screen.getAllByRole('button', { name: /reveal/i });
    fireEvent.click(revealButtons[demoVaultSecrets.indexOf(revealableSecret!)]);

    expect(await screen.findByText('Bench reason, comp goal, cooldown owner, and next review date.')).toBeTruthy();
  });
});
