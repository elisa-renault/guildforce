export type SettingsSection =
  | 'profile'
  | 'permissions'
  | 'rosters'
  | 'activity'
  | 'battlenet'
  | 'mypermissions'
  // Kept temporarily for legacy query-string compatibility on /settings?section=vault.
  | 'vault';

export const guildSettingsSectionLabelKeys = {
  profile: 'settings.sidebar.section.profile',
  permissions: 'settings.sidebar.section.permissions',
  mypermissions: 'settings.sidebar.section.mypermissions',
  rosters: 'settings.sidebar.section.rosters',
  activity: 'settings.sidebar.section.activity',
  battlenet: 'settings.sidebar.section.battlenet',
  vault: 'settings.sidebar.section.profile',
} as const satisfies Record<SettingsSection, string>;

interface VisibleGuildSettingsArgs {
  gm: boolean;
  wishes?: boolean;
  rosters: boolean;
  activity: boolean;
}

export function getVisibleGuildSettingsSections({
  gm,
  wishes = false,
  rosters,
  activity,
}: VisibleGuildSettingsArgs): SettingsSection[] {
  if (gm) {
    return ['profile', 'permissions', 'rosters', 'activity', 'battlenet'];
  }

  const sections: SettingsSection[] = [];
  if (wishes || rosters || activity) {
    sections.push('mypermissions');
  }
  if (rosters) {
    sections.push('rosters');
  }
  if (activity) {
    sections.push('activity');
  }

  return sections;
}
