import { useFeatureFlagEnabled } from '@posthog/react';

import { getPostHogClient } from '@/lib/posthogClient';

export const KILL_SWITCH_FEATURE_FLAGS = {
  atlas: 'guildforce_atlas_enabled',
  vault: 'guildforce_vault_enabled',
  pollAi: 'guildforce_poll_ai_enabled',
  rosterSeasons: 'guildforce_roster_seasons_enabled',
} as const;

export type KillSwitchFeatureFlagKey =
  (typeof KILL_SWITCH_FEATURE_FLAGS)[keyof typeof KILL_SWITCH_FEATURE_FLAGS];

export const isKillSwitchFeatureEnabled = (
  flagKey: KillSwitchFeatureFlagKey,
  client = getPostHogClient(),
): boolean => {
  if (!client || typeof client.isFeatureEnabled !== 'function') return true;

  const enabled = client.isFeatureEnabled(flagKey);
  return enabled !== false;
};

export const useKillSwitchFeatureEnabled = (flagKey: KillSwitchFeatureFlagKey): boolean => {
  const enabled = useFeatureFlagEnabled(flagKey);
  return enabled !== false;
};
