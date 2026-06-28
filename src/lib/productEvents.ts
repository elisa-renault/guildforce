import type { Database, Json } from '@/integrations/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { hasAnalyticsConsent } from '@/lib/analyticsConsent';
import log from '@/lib/logger';
import { getPostHogClient } from '@/lib/posthogClient';
import { getSafeCurrentLocationProperties } from '@/lib/posthogPrivacy';
import { safeStorage } from '@/lib/safeStorage';

export type ProductEventName =
  | 'app_session_started'
  | 'first_login'
  | 'wish_created'
  | 'poll_voted'
  | 'guild_member_invited'
  | 'activated_first_action';

export type SupabaseProductEventName = Exclude<ProductEventName, 'app_session_started'>;

export type ProductEventFeatureArea =
  | 'auth'
  | 'wishes'
  | 'polls'
  | 'guild'
  | 'rosters'
  | 'admin';

interface ProductEventProperties {
  source?: string | null;
  feature_area?: ProductEventFeatureArea | null;
  guild_id?: string | null;
  roster_id?: string | null;
  poll_id?: string | null;
  url_host?: string | null;
  url_path?: string | null;
}

interface TrackProductEventOptions {
  guildId?: string | null;
  rosterId?: string | null;
  pollId?: string | null;
  source?: string | null;
  featureArea?: ProductEventFeatureArea | null;
  occurredAt?: string | null;
}

const POSTHOG_ONCE_EVENT_NAMES = new Set<ProductEventName>(['first_login', 'app_session_started']);
const SUPABASE_ONCE_EVENT_NAMES = new Set<SupabaseProductEventName>(['activated_first_action']);

const stableHash = (value: string, seed: number): string => {
  let hash = seed;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const stableCaptureUuid = (eventName: ProductEventName, dedupeKey: string): string => {
  const input = `${eventName}:${dedupeKey}`;
  const hex = [
    stableHash(input, 2166136261),
    stableHash(input, 2166136261 ^ 0x9e3779b9),
    stableHash(input, 2166136261 ^ 0x85ebca6b),
    stableHash(input, 2166136261 ^ 0xc2b2ae35),
  ].join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

const getOnceEventStorageKey = (
  eventName: ProductEventName,
  distinctId: string,
  sessionId?: string | null,
): string | null => {
  if (!POSTHOG_ONCE_EVENT_NAMES.has(eventName)) return null;

  const scope = eventName === 'app_session_started'
    ? `${distinctId}_${sessionId || 'unknown-session'}`
    : distinctId;

  return `guildforce_posthog_once_${eventName}_${scope}`;
};

const hasCapturedOnceEvent = (
  eventName: ProductEventName,
  distinctId: string,
  sessionId?: string | null,
): boolean => {
  const key = getOnceEventStorageKey(eventName, distinctId, sessionId);
  if (!key) return false;

  return safeStorage.get('local', key) === 'true';
};

const markOnceEventCaptured = (
  eventName: ProductEventName,
  distinctId: string,
  sessionId?: string | null,
) => {
  const key = getOnceEventStorageKey(eventName, distinctId, sessionId);
  if (!key) return;

  safeStorage.set('local', key, 'true');
};

const getSupabaseOnceEventStorageKey = (eventName: SupabaseProductEventName): string | null => {
  if (!SUPABASE_ONCE_EVENT_NAMES.has(eventName)) return null;
  return `guildforce_product_once_${eventName}`;
};

const hasTrackedSupabaseOnceEvent = (eventName: SupabaseProductEventName): boolean => {
  const key = getSupabaseOnceEventStorageKey(eventName);
  if (!key) return false;

  return safeStorage.get('local', key) === 'true';
};

const markSupabaseOnceEventTracked = (eventName: SupabaseProductEventName) => {
  const key = getSupabaseOnceEventStorageKey(eventName);
  if (!key) return;

  safeStorage.set('local', key, 'true');
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
  const sessionId = typeof posthog.get_session_id === 'function' ? posthog.get_session_id() : null;
  const dedupeKey = eventName === 'app_session_started'
    ? `${distinctId}:${sessionId || 'unknown-session'}`
    : distinctId;

  if (hasCapturedOnceEvent(eventName, distinctId, sessionId)) return;

  const eventProperties: Record<string, string | Record<string, string>> = {};
  const safeLocationProperties = getSafeCurrentLocationProperties();

  for (const [key, value] of Object.entries({ ...safeLocationProperties, ...properties })) {
    if (typeof value === 'string' && value.length > 0) {
      eventProperties[key] = value;
    }
  }

  if (properties.guild_id) {
    eventProperties.$groups = { guild: properties.guild_id };
  }

  try {
    const captureOptions = POSTHOG_ONCE_EVENT_NAMES.has(eventName)
      ? { uuid: stableCaptureUuid(eventName, dedupeKey) }
      : undefined;
    posthog.capture(eventName, eventProperties, captureOptions);
    markOnceEventCaptured(eventName, distinctId, sessionId);
  } catch (error) {
    log.debug('capturePostHogProductEvent skipped:', error);
  }
};

export const trackProductEvent = async (
  supabase: SupabaseClient<Database>,
  eventName: SupabaseProductEventName,
  options: TrackProductEventOptions = {},
) => {
  if (hasTrackedSupabaseOnceEvent(eventName)) return;

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
  if (!error) {
    markSupabaseOnceEventTracked(eventName);
  }
};
