import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hasAnalyticsConsent } from '@/lib/analyticsConsent';
import { getPostHogClient } from '@/lib/posthogClient';
import { capturePostHogException } from '@/lib/posthogErrors';

vi.mock('@/lib/analyticsConsent', () => ({
  hasAnalyticsConsent: vi.fn(),
}));

vi.mock('@/lib/posthogClient', () => ({
  getPostHogClient: vi.fn(),
}));

const mockedHasAnalyticsConsent = vi.mocked(hasAnalyticsConsent);
const mockedGetPostHogClient = vi.mocked(getPostHogClient);

describe('PostHog error capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasAnalyticsConsent.mockReturnValue(false);
    mockedGetPostHogClient.mockReturnValue(null);
  });

  it('does not capture exceptions without analytics consent', () => {
    const posthog = {
      captureException: vi.fn(),
      has_opted_out_capturing: vi.fn(() => false),
    };
    mockedGetPostHogClient.mockReturnValue(posthog as never);

    capturePostHogException(new Error('boom'), { source: 'test' });

    expect(posthog.captureException).not.toHaveBeenCalled();
  });

  it('captures exceptions with safe properties when consent is enabled', () => {
    const posthog = {
      captureException: vi.fn(),
      has_opted_out_capturing: vi.fn(() => false),
    };
    mockedHasAnalyticsConsent.mockReturnValue(true);
    mockedGetPostHogClient.mockReturnValue(posthog as never);
    const error = new Error('boom');

    capturePostHogException(error, { source: 'react_error_boundary', feature_area: 'app' });

    expect(posthog.captureException).toHaveBeenCalledWith(error, {
      url_host: window.location.host,
      url_path: window.location.pathname,
      source: 'react_error_boundary',
      feature_area: 'app',
    });
  });
});
