import posthog from 'posthog-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initializePostHog } from '@/lib/posthogClient';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
  },
}));

vi.mock('@/lib/analyticsConsent', () => ({
  hasAnalyticsConsent: vi.fn(() => false),
}));

describe('posthog client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', 'ph_project_token');
    vi.stubEnv('VITE_POSTHOG_HOST', '');
    vi.stubEnv('VITE_POSTHOG_ENABLED', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    delete (window as Window & { __ENV?: Record<string, string | undefined> }).__ENV;
  });

  it('initializes PostHog with SPA pageview tracking and privacy safeguards', async () => {
    const { initializePostHog: freshInitializePostHog } = await import('@/lib/posthogClient');

    freshInitializePostHog();

    expect(posthog.init).toHaveBeenCalledWith(
      'ph_project_token',
      expect.objectContaining({
        api_host: 'https://eu.i.posthog.com',
        autocapture: false,
        defaults: '2026-01-30',
        capture_pageview: 'history_change',
        capture_pageleave: 'if_capture_pageview',
        disable_session_recording: true,
        before_send: expect.any(Function),
        opt_out_capturing_by_default: true,
      }),
    );
  });

  it('stays disabled without a project token', () => {
    vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', '');

    expect(initializePostHog()).toBeNull();
    expect(posthog.init).not.toHaveBeenCalled();
  });
});
