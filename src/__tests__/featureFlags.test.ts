import { describe, expect, it, vi } from 'vitest';

import { KILL_SWITCH_FEATURE_FLAGS, isKillSwitchFeatureEnabled } from '@/lib/featureFlags';

vi.mock('@posthog/react', () => ({
  useFeatureFlagEnabled: vi.fn(),
}));

describe('feature flag kill switches', () => {
  it('defaults enabled when PostHog is unavailable', () => {
    expect(isKillSwitchFeatureEnabled(KILL_SWITCH_FEATURE_FLAGS.atlas, null)).toBe(true);
  });

  it('defaults enabled while a flag has not resolved', () => {
    const client = {
      isFeatureEnabled: vi.fn(() => undefined),
    };

    expect(isKillSwitchFeatureEnabled(KILL_SWITCH_FEATURE_FLAGS.vault, client as never)).toBe(true);
  });

  it('disables a feature only when PostHog explicitly returns false', () => {
    const client = {
      isFeatureEnabled: vi.fn(() => false),
    };

    expect(isKillSwitchFeatureEnabled(KILL_SWITCH_FEATURE_FLAGS.pollAi, client as never)).toBe(false);
  });
});
