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
