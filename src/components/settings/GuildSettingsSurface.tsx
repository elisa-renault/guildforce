import { GuildSettingsSidebar } from './GuildSettingsSidebar';
import type { SettingsSection } from '@/lib/guildSettingsSections';
import type { ReactNode } from 'react';

import { GuildWorkspaceShell } from '@/components/guild';
import { PageContainer } from '@/components/layout/PageContainer';

interface GuildSettingsSurfaceGuild {
  id?: string | null;
  name: string;
  server: string;
  region: string;
  faction?: string | null;
  avatar_url?: string | null;
}

export interface GuildSettingsSurfaceProps {
  guild: GuildSettingsSurfaceGuild;
  guildId: string | null;
  basePath: string;
  isGM: boolean;
  hasSettingsPermission: boolean;
  hasVaultAccess: boolean;
  activeSection: SettingsSection;
  visibleSections: SettingsSection[];
  contextLabel: string;
  onSectionChange: (section: SettingsSection) => void;
  children: ReactNode;
}

export const GuildSettingsSurface = ({
  guild,
  guildId,
  basePath,
  isGM,
  hasSettingsPermission,
  hasVaultAccess,
  activeSection,
  visibleSections,
  contextLabel,
  onSectionChange,
  children,
}: GuildSettingsSurfaceProps) => (
  <GuildWorkspaceShell
    guild={guild}
    guildId={guildId}
    basePath={basePath}
    isGM={isGM}
    hasSettingsPermission={hasSettingsPermission}
    hasVaultAccess={hasVaultAccess}
    activeTab="settings"
    context={{ status: contextLabel }}
  >
    <div className="relative z-10 min-w-0 md:grid md:h-[calc(100dvh-7rem-var(--global-nav-extra-offset,0px))] md:min-h-0 md:grid-cols-[16rem_minmax(0,1fr)] md:overflow-hidden lg:h-[calc(100dvh-3.5rem-var(--global-nav-extra-offset,0px))]">
      <GuildSettingsSidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        visibleSections={visibleSections}
      />

      <main className="min-w-0 md:min-h-0 md:overflow-y-auto">
        <PageContainer width="workspace" className="py-4 md:py-5">
          {children}
        </PageContainer>
      </main>
    </div>
  </GuildWorkspaceShell>
);
