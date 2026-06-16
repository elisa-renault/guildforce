import { useEffect } from 'react';

import {
  COOKIE_PREFERENCES_CHANGED_EVENT,
  type CookiePreferencesChangedDetail,
  hasAnalyticsConsent,
} from '@/lib/analyticsConsent';
import { getPostHogClient, syncPostHogConsentState } from '@/lib/posthogClient';

export const PostHogConsentSync = () => {
  useEffect(() => {
    const syncConsent = (analyticsAllowed: boolean) => {
      const posthog = getPostHogClient();
      if (!posthog) return;

      syncPostHogConsentState(posthog, analyticsAllowed);
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
