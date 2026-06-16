import type { Database, Json } from '@/integrations/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { hasAnalyticsConsent } from '@/lib/analyticsConsent';
import log from '@/lib/logger';
import { getPostHogClient } from '@/lib/posthogClient';

export type ProductEventName =
  | 'app_session_started'
  | 'first_login'
  | 'wish_created'
  | 'poll_voted'
  | 'forum_post_created'
  | 'guild_member_invited'
  | 'activated_first_action';

export type SupabaseProductEventName = Exclude<ProductEventName, 'app_session_started'>;

export type ProductEventFeatureArea =
  | 'auth'
  | 'wishes'
  | 'polls'
  | 'forum'
  | 'guild'
  | 'rosters'
  | 'admin';

interface ProductEventProperties {
  source?: string | null;
  feature_area?: ProductEventFeatureArea | null;
  guild_id?: string | null;
  roster_id?: string | null;
  poll_id?: string | null;
}

interface TrackProductEventOptions {
  guildId?: string | null;
  rosterId?: string | null;
  pollId?: string | null;
  source?: string | null;
  featureArea?: ProductEventFeatureArea | null;
  occurredAt?: string | null;
}

const POSTHOG_ONCE_EVENT_NAMES = new Set<ProductEventName>(['first_login']);

const getOnceEventStorageKey = (eventName: ProductEventName, distinctId: string): string | null => {
  if (!POSTHOG_ONCE_EVENT_NAMES.has(eventName)) return null;

  return `guildforce_posthog_once_${eventName}_${distinctId}`;
};

const hasCapturedOnceEvent = (eventName: ProductEventName, distinctId: string): boolean => {
  const key = getOnceEventStorageKey(eventName, distinctId);
  if (!key || typeof window === 'undefined') return false;

  return window.localStorage.getItem(key) === 'true';
};

const markOnceEventCaptured = (eventName: ProductEventName, distinctId: string) => {
  const key = getOnceEventStorageKey(eventName, distinctId);
  if (!key || typeof window === 'undefined') return;

  window.localStorage.setItem(key, 'true');
};

const toProductEventProperties = (options: TrackProductEventOptions): ProductEventProperties => {
  const properties: ProductEventProperties = {};

  if (options.source) properties.source = options.source;
  if (options.featureArea) properties.feature_area = options.featureArea;
  if (options.guildId) properties.guild_id = options.guildId;
  if (options.rosterId) properties.roster_id = options.rosterId;
  if (options.pollId) properties.poll_id = options.pollId;

  return properties;
};

const toSupabaseEventContext = (properties: ProductEventProperties): Json => {
  const context: Record<string, string> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string' && value.length > 0) {
      context[key] = value;
    }
  }

  return context;
};

export const capturePostHogProductEvent = (
  eventName: ProductEventName,
  properties: ProductEventProperties = {},
) => {
  if (!hasAnalyticsConsent()) return;

  const posthog = getPostHogClient();
  if (!posthog || posthog.has_opted_out_capturing()) return;

  const distinctId = posthog.get_distinct_id();
  if (hasCapturedOnceEvent(eventName, distinctId)) return;

  const eventProperties: Record<string, string | Record<string, string>> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string' && value.length > 0) {
      eventProperties[key] = value;
    }
  }

  if (properties.guild_id) {
    eventProperties.$groups = { guild: properties.guild_id };
  }

  try {
    posthog.capture(eventName, eventProperties);
    markOnceEventCaptured(eventName, distinctId);
  } catch (error) {
    log.debug('capturePostHogProductEvent skipped:', error);
  }
};

export const trackProductEvent = async (
  supabase: SupabaseClient<Database>,
  eventName: SupabaseProductEventName,
  options: TrackProductEventOptions = {},
) => {
  const properties = toProductEventProperties(options);

  const { error } = await supabase.rpc('track_product_event', {
    p_event_name: eventName,
    p_guild_id: options.guildId ?? null,
    p_event_source: options.source ?? null,
    p_event_context: toSupabaseEventContext(properties),
    p_occurred_at: options.occurredAt ?? null,
  });

  if (error) {
    log.debug('trackProductEvent skipped:', error.message);
  }

  capturePostHogProductEvent(eventName, properties);
};
