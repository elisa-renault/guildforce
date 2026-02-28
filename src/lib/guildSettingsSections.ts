export type SettingsSection =
  | 'profile'
  | 'permissions'
  | 'rosters'
  | 'activity'
  | 'battlenet'
  | 'mypermissions'
  // Kept temporarily for legacy query-string compatibility on /settings?section=vault.
  | 'vault';

interface VisibleGuildSettingsArgs {
  gm: boolean;
  rosters: boolean;
  activity: boolean;
}

export function getVisibleGuildSettingsSections({
  gm,
  rosters,
  activity,
}: VisibleGuildSettingsArgs): SettingsSection[] {
  if (gm) {
    return ['profile', 'permissions', 'rosters', 'activity', 'battlenet'];
  }

  const sections: SettingsSection[] = [];
  if (rosters || activity) {
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
