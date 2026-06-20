import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PostHogPageviewTracker } from '@/components/analytics/PostHogPageviewTracker';
import { COOKIE_PREFERENCES_CHANGED_EVENT, hasAnalyticsConsent } from '@/lib/analyticsConsent';
import { getPostHogClient } from '@/lib/posthogClient';

vi.mock('@/lib/analyticsConsent', () => ({
  COOKIE_PREFERENCES_CHANGED_EVENT: 'guildforce-cookie-preferences-changed',
  hasAnalyticsConsent: vi.fn(),
}));

vi.mock('@/lib/posthogClient', () => ({
  getPostHogClient: vi.fn(),
}));

const mockedHasAnalyticsConsent = vi.mocked(hasAnalyticsConsent);
const mockedGetPostHogClient = vi.mocked(getPostHogClient);

const createPostHogMock = (optedOut = false) => ({
  capture: vi.fn(),
  has_opted_out_capturing: vi.fn(() => optedOut),
});

const renderTracker = (initialEntry = '/guilds?invite=secret') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PostHogPageviewTracker />
      <Routes>
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PostHogPageviewTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHasAnalyticsConsent.mockReturnValue(true);
  });

  it('captures a consented pageview with sanitized route properties', async () => {
    const posthog = createPostHogMock();
    mockedGetPostHogClient.mockReturnValue(posthog as unknown as ReturnType<typeof getPostHogClient>);

    renderTracker();

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'http://localhost:3000/guilds',
        $pathname: '/guilds',
        url_host: 'localhost:3000',
        url_path: '/guilds',
      });
    });
  });

  it('waits until analytics consent is enabled', async () => {
    const posthog = createPostHogMock();
    mockedHasAnalyticsConsent.mockReturnValue(false);
    mockedGetPostHogClient.mockReturnValue(posthog as unknown as ReturnType<typeof getPostHogClient>);

    renderTracker('/forum');

    expect(posthog.capture).not.toHaveBeenCalled();

    mockedHasAnalyticsConsent.mockReturnValue(true);
    window.dispatchEvent(
      new CustomEvent(COOKIE_PREFERENCES_CHANGED_EVENT, {
        detail: {
          preferences: { essential: true, analytics: true, marketing: false },
        },
      }),
    );

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('$pageview', expect.objectContaining({ $pathname: '/forum' }));
    });
  });
});
