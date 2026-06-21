import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import {
  COOKIE_PREFERENCES_CHANGED_EVENT,
  type CookiePreferencesChangedDetail,
  hasAnalyticsConsent,
} from '@/lib/analyticsConsent';
import { getPostHogClient } from '@/lib/posthogClient';
import { getPostHogPersonLabel } from '@/lib/posthogPersonLabel';
import { capturePostHogProductEvent } from '@/lib/productEvents';

export const PostHogAuthSync = () => {
  const { user, profile, loading, isImpersonating } = useAuth();
  const [analyticsAllowed, setAnalyticsAllowed] = useState(() => hasAnalyticsConsent());
  const identifiedUserIdRef = useRef<string | null>(null);
  const sessionTrackedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<CookiePreferencesChangedDetail>;
      setAnalyticsAllowed(customEvent.detail.preferences.analytics);
    };

    window.addEventListener(COOKIE_PREFERENCES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(COOKIE_PREFERENCES_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    const posthog = getPostHogClient();
    if (!posthog || loading) return;

    if (!analyticsAllowed || !user || isImpersonating) {
      if (identifiedUserIdRef.current) {
        posthog.reset();
        identifiedUserIdRef.current = null;
        sessionTrackedForUserRef.current = null;
      }
      return;
    }

    if (identifiedUserIdRef.current !== user.id) {
      const personLabel = getPostHogPersonLabel(user.id);

      posthog.identify(user.id, {
        name: personLabel,
        guildforce_user_label: personLabel,
        preferred_language: profile?.preferred_language ?? null,
        has_battlenet: Boolean(profile?.battlenet_id),
        is_impersonating: false,
      });
      identifiedUserIdRef.current = user.id;
    }

    if (sessionTrackedForUserRef.current !== user.id) {
      capturePostHogProductEvent('app_session_started', {
        source: 'auth_context',
        feature_area: 'auth',
      });
      sessionTrackedForUserRef.current = user.id;
    }
  }, [analyticsAllowed, isImpersonating, loading, profile?.battlenet_id, profile?.preferred_language, user]);

  return null;
};
