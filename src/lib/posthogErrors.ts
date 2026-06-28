import type { PostHog } from 'posthog-js';

import { hasAnalyticsConsent } from '@/lib/analyticsConsent';
import log from '@/lib/logger';
import { getPostHogClient } from '@/lib/posthogClient';
import { getSafeCurrentLocationProperties } from '@/lib/posthogPrivacy';

type PostHogWithExceptions = PostHog & {
  captureException?: (error: unknown, properties?: Record<string, string>) => void;
  capture_exception?: (error: unknown, properties?: Record<string, string>) => void;
};

export const capturePostHogException = (
  error: unknown,
  properties: Record<string, string> = {},
) => {
  if (!hasAnalyticsConsent()) return;

  const posthog = getPostHogClient() as PostHogWithExceptions | null;
  if (!posthog || posthog.has_opted_out_capturing()) return;

  const safeProperties: Record<string, string> = {};
  for (const [key, value] of Object.entries({
    ...getSafeCurrentLocationProperties(),
    ...properties,
  })) {
    if (typeof value === 'string' && value.length > 0) {
      safeProperties[key] = value;
    }
  }

  try {
    if (typeof posthog.captureException === 'function') {
      posthog.captureException(error, safeProperties);
      return;
    }
    if (typeof posthog.capture_exception === 'function') {
      posthog.capture_exception(error, safeProperties);
    }
  } catch (captureError) {
    log.debug('capturePostHogException skipped:', captureError);
  }
};
