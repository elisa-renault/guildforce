import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PostHogAuthSync } from '@/components/analytics/PostHogAuthSync';
import { useAuth } from '@/contexts/AuthContext';
import { COOKIE_PREFERENCES_CHANGED_EVENT, hasAnalyticsConsent } from '@/lib/analyticsConsent';
import { getPostHogClient } from '@/lib/posthogClient';
import { capturePostHogProductEvent } from '@/lib/productEvents';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/analyticsConsent', () => ({
  COOKIE_PREFERENCES_CHANGED_EVENT: 'guildforce-cookie-preferences-changed',
  hasAnalyticsConsent: vi.fn(),
}));

vi.mock('@/lib/productEvents', () => ({
  capturePostHogProductEvent: vi.fn(),
}));

vi.mock('@/lib/posthogClient', () => ({
  getPostHogClient: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedHasAnalyticsConsent = vi.mocked(hasAnalyticsConsent);
const mockedCapturePostHogProductEvent = vi.mocked(capturePostHogProductEvent);
const mockedGetPostHogClient = vi.mocked(getPostHogClient);

const createPostHogMock = () => ({
  identify: vi.fn(),
  reset: vi.fn(),
});

describe('PostHogAuthSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasAnalyticsConsent.mockReturnValue(true);
  });

  it('identifies the authenticated user once and tracks one app session event', async () => {
    const posthog = createPostHogMock();
    const authState = {
      user: { id: 'user-1' },
      profile: { preferred_language: 'fr', battlenet_id: 'bnet-1' },
      loading: false,
      isImpersonating: false,
    };

    mockedGetPostHogClient.mockReturnValue(posthog as unknown as ReturnType<typeof getPostHogClient>);
    mockedUseAuth.mockReturnValue(authState as ReturnType<typeof useAuth>);

    const { rerender } = render(<PostHogAuthSync />);
    rerender(<PostHogAuthSync />);

    await waitFor(() => {
      expect(posthog.identify).toHaveBeenCalledTimes(1);
      expect(posthog.identify).toHaveBeenCalledWith('user-1', {
        preferred_language: 'fr',
        has_battlenet: true,
        is_impersonating: false,
      });
      expect(mockedCapturePostHogProductEvent).toHaveBeenCalledTimes(1);
      expect(mockedCapturePostHogProductEvent).toHaveBeenCalledWith('app_session_started', {
        source: 'auth_context',
        feature_area: 'auth',
      });
    });
  });

  it('resets identity when an identified admin enters impersonation', async () => {
    const posthog = createPostHogMock();
    const authState = {
      user: { id: 'user-1' },
      profile: { preferred_language: 'en', battlenet_id: null },
      loading: false,
      isImpersonating: false,
    };

    mockedGetPostHogClient.mockReturnValue(posthog as unknown as ReturnType<typeof getPostHogClient>);
    mockedUseAuth.mockReturnValue(authState as ReturnType<typeof useAuth>);

    const { rerender } = render(<PostHogAuthSync />);

    await waitFor(() => expect(posthog.identify).toHaveBeenCalledTimes(1));

    mockedUseAuth.mockReturnValue({
      ...authState,
      isImpersonating: true,
    } as ReturnType<typeof useAuth>);
    rerender(<PostHogAuthSync />);

    await waitFor(() => expect(posthog.reset).toHaveBeenCalledTimes(1));
  });

  it('identifies a signed-in user when analytics consent is enabled later', async () => {
    const posthog = createPostHogMock();
    const authState = {
      user: { id: 'user-2' },
      profile: { preferred_language: 'fr', battlenet_id: null },
      loading: false,
      isImpersonating: false,
    };

    mockedHasAnalyticsConsent.mockReturnValue(false);
    mockedGetPostHogClient.mockReturnValue(posthog as unknown as ReturnType<typeof getPostHogClient>);
    mockedUseAuth.mockReturnValue(authState as ReturnType<typeof useAuth>);

    render(<PostHogAuthSync />);

    expect(posthog.identify).not.toHaveBeenCalled();

    window.dispatchEvent(
      new CustomEvent(COOKIE_PREFERENCES_CHANGED_EVENT, {
        detail: {
          preferences: { essential: true, analytics: true, marketing: false },
        },
      }),
    );

    await waitFor(() => {
      expect(posthog.identify).toHaveBeenCalledWith('user-2', {
        preferred_language: 'fr',
        has_battlenet: false,
        is_impersonating: false,
      });
      expect(mockedCapturePostHogProductEvent).toHaveBeenCalledWith('app_session_started', {
        source: 'auth_context',
        feature_area: 'auth',
      });
    });
  });
});
