import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/integrations/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { hasAnalyticsConsent } from '@/lib/analyticsConsent';
import { getPostHogClient } from '@/lib/posthogClient';
import { capturePostHogProductEvent, trackProductEvent } from '@/lib/productEvents';

vi.mock('@/lib/analyticsConsent', () => ({
  hasAnalyticsConsent: vi.fn(),
}));

vi.mock('@/lib/posthogClient', () => ({
  getPostHogClient: vi.fn(),
}));

const mockedHasAnalyticsConsent = vi.mocked(hasAnalyticsConsent);
const mockedGetPostHogClient = vi.mocked(getPostHogClient);

const createPostHogMock = () => ({
  capture: vi.fn(),
  get_distinct_id: vi.fn(() => 'distinct-user-1'),
  has_opted_out_capturing: vi.fn(() => false),
});

describe('product event analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockedHasAnalyticsConsent.mockReturnValue(false);
    mockedGetPostHogClient.mockReturnValue(null);
  });

  it('does not capture PostHog events without analytics consent', () => {
    const posthog = createPostHogMock();
    mockedGetPostHogClient.mockReturnValue(posthog as unknown as ReturnType<typeof getPostHogClient>);

    capturePostHogProductEvent('wish_created', {
      source: 'test',
      feature_area: 'wishes',
    });

    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('captures only approved PostHog properties and adds guild groups', () => {
    const posthog = createPostHogMock();
    mockedHasAnalyticsConsent.mockReturnValue(true);
    mockedGetPostHogClient.mockReturnValue(posthog as unknown as ReturnType<typeof getPostHogClient>);

    capturePostHogProductEvent('poll_voted', {
      source: 'poll_widget',
      feature_area: 'polls',
      guild_id: 'guild-1',
      poll_id: 'poll-1',
    });

    expect(posthog.capture).toHaveBeenCalledWith('poll_voted', {
      source: 'poll_widget',
      feature_area: 'polls',
      guild_id: 'guild-1',
      poll_id: 'poll-1',
      $groups: { guild: 'guild-1' },
    });
  });

  it('sends a filtered safe context to the Supabase RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const supabase = { rpc } as unknown as SupabaseClient<Database>;

    await trackProductEvent(supabase, 'activated_first_action', {
      source: 'wishes_page',
      featureArea: 'wishes',
      guildId: '00000000-0000-0000-0000-000000000001',
      rosterId: '00000000-0000-0000-0000-000000000002',
      pollId: '00000000-0000-0000-0000-000000000003',
    });

    expect(rpc).toHaveBeenCalledWith('track_product_event', {
      p_event_name: 'activated_first_action',
      p_guild_id: '00000000-0000-0000-0000-000000000001',
      p_event_source: 'wishes_page',
      p_event_context: {
        source: 'wishes_page',
        feature_area: 'wishes',
        guild_id: '00000000-0000-0000-0000-000000000001',
        roster_id: '00000000-0000-0000-0000-000000000002',
        poll_id: '00000000-0000-0000-0000-000000000003',
      },
      p_occurred_at: null,
    });
  });
});
