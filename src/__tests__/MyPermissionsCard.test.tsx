import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MyPermissionsCard } from '@/components/permissions/MyPermissionsCard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      permissions: {
        manageWishes: 'Manage wishes',
        manageWishesDesc: 'Review and manage wishes',
        managePolls: 'Manage polls',
        managePollsDesc: 'Create and edit polls',
        manageRosters: 'Manage rosters',
        manageRostersDesc: 'Create and edit rosters',
        viewActivityLog: 'View activity',
        viewActivityLogDesc: 'Read the activity log',
        manageVault: 'Manage vault',
        manageVaultDesc: 'Manage vault entries',
        viewVaultAudit: 'View vault audit',
        viewVaultAuditDesc: 'Read vault audit events',
        manageAtlas: 'Manage Atlas',
        manageAtlasDesc: 'Create and edit Atlas documents',
        myPermissions: 'My permissions',
        guildMaster: 'Guild master',
        guildMasterDesc: 'Full guild control',
        noPermissions: 'No delegated permissions',
        grantedByGm: 'Granted by GM',
        vaultAccess: 'Vault access',
        vaultAccessDesc: 'Can reveal at least one vault entry',
      },
    },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn((name: string, args: { p_permission?: string }) => {
      if (name === 'has_guild_permission') {
        return Promise.resolve({ data: args.p_permission === 'manage_wishes', error: null });
      }

      if (name === 'has_any_guild_secret_access') {
        return Promise.resolve({ data: false, error: null });
      }

      return Promise.resolve({ data: null, error: null });
    }),
  },
}));

describe('MyPermissionsCard', () => {
  it('renders resolved effective permissions after all RPC checks complete', async () => {
    render(<MyPermissionsCard guildId="guild-1" isGM={false} />);

    expect(await screen.findByText('Manage wishes')).toBeInTheDocument();
    expect(screen.getByText('Review and manage wishes')).toBeInTheDocument();
    expect(screen.queryByText('No delegated permissions')).not.toBeInTheDocument();
  });
});
