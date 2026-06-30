import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GuildSettingsSurface } from '@/components/settings';
import { demoGuild } from '@/demo/demoRoster';
import { translationsEn } from '@/i18n/translations.en';
import { getVisibleGuildSettingsSections } from '@/lib/guildSettingsSections';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { ...translationsEn, lang: 'en' },
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'demo-viewer' },
  }),
}));

vi.mock('@/lib/featureFlags', () => ({
  KILL_SWITCH_FEATURE_FLAGS: {
    atlas: 'atlas',
    vault: 'vault',
  },
  useKillSwitchFeatureEnabled: () => true,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    configurable: true,
  });
});

describe('GuildSettingsSurface', () => {
  it('renders the shared settings shell and GM sections without backend reads', () => {
    render(
      <MemoryRouter>
        <GuildSettingsSurface
          guild={demoGuild}
          guildId={null}
          basePath="/demo"
          isGM
          hasSettingsPermission
          hasVaultAccess
          activeSection="profile"
          visibleSections={getVisibleGuildSettingsSections({
            gm: true,
            wishes: true,
            rosters: true,
            activity: true,
          })}
          contextLabel="Profile"
          onSectionChange={vi.fn()}
        >
          <div>Local settings content</div>
        </GuildSettingsSurface>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Astral Vanguard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Permissions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rosters').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Activity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Battle.net').length).toBeGreaterThan(0);
    expect(screen.getByText('Local settings content')).toBeInTheDocument();
  });
});
