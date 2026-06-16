import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PostHogConsentSync } from '@/components/analytics/PostHogConsentSync';
import { COOKIE_PREFERENCES_CHANGED_EVENT, hasAnalyticsConsent } from '@/lib/analyticsConsent';
import { getPostHogClient } from '@/lib/posthogClient';

vi.mock('@/lib/analyticsConsent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analyticsConsent')>();
  return {
    ...actual,
    hasAnalyticsConsent: vi.fn(),
  };
});

vi.mock('@/lib/posthogClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/posthogClient')>();

  return {
    ...actual,
    getPostHogClient: vi.fn(),
  };
});

const mockedHasAnalyticsConsent = vi.mocked(hasAnalyticsConsent);
const mockedGetPostHogClient = vi.mocked(getPostHogClient);

const createPostHogMock = (initialOptedOut = true) => {
  let optedOut = initialOptedOut;

  return {
    has_opted_out_capturing: vi.fn(() => optedOut),
    opt_in_capturing: vi.fn(() => {
      optedOut = false;
    }),
    opt_out_capturing: vi.fn(() => {
      optedOut = true;
    }),
    reset: vi.fn(),
  };
};

describe('PostHogConsentSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps capture off by default and reacts immediately to cookie preference changes', async () => {
    const posthog = createPostHogMock();
    mockedHasAnalyticsConsent.mockReturnValue(false);
    mockedGetPostHogClient.mockReturnValue(posthog as unknown as ReturnType<typeof getPostHogClient>);

    render(<PostHogConsentSync />);

    await waitFor(() => {
      expect(posthog.reset).toHaveBeenCalledTimes(1);
    });
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled();

    window.dispatchEvent(
      new CustomEvent(COOKIE_PREFERENCES_CHANGED_EVENT, {
        detail: {
          preferences: { essential: true, analytics: true, marketing: false },
        },
      }),
    );

    await waitFor(() => expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1));

    window.dispatchEvent(
      new CustomEvent(COOKIE_PREFERENCES_CHANGED_EVENT, {
        detail: {
          preferences: { essential: true, analytics: true, marketing: false },
        },
      }),
    );

    await waitFor(() => expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1));

    window.dispatchEvent(
      new CustomEvent(COOKIE_PREFERENCES_CHANGED_EVENT, {
        detail: {
          preferences: { essential: true, analytics: false, marketing: false },
        },
      }),
    );

    await waitFor(() => {
      expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
      expect(posthog.reset).toHaveBeenCalledTimes(2);
    });
  });
});
