import { useEffect } from 'react';

import {
  COOKIE_PREFERENCES_CHANGED_EVENT,
  type CookiePreferencesChangedDetail,
  hasAnalyticsConsent,
} from '@/lib/analyticsConsent';
import { getPostHogClient } from '@/lib/posthogClient';

export const PostHogConsentSync = () => {
  useEffect(() => {
    const syncConsent = (analyticsAllowed: boolean) => {
      const posthog = getPostHogClient();
      if (!posthog) return;

      if (analyticsAllowed) {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
        posthog.reset();
      }
    };

    syncConsent(hasAnalyticsConsent());

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<CookiePreferencesChangedDetail>;
      syncConsent(customEvent.detail.preferences.analytics);
    };

    window.addEventListener(COOKIE_PREFERENCES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(COOKIE_PREFERENCES_CHANGED_EVENT, handler);
  }, []);

  return null;
};

