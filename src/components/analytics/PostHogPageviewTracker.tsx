import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { COOKIE_PREFERENCES_CHANGED_EVENT, hasAnalyticsConsent } from '@/lib/analyticsConsent';
import { getPostHogClient } from '@/lib/posthogClient';

const getPageviewProperties = (pathname: string) => {
  if (typeof window === 'undefined') {
    return {
      $pathname: pathname,
      url_path: pathname,
    };
  }

  return {
    $current_url: `${window.location.origin}${pathname}`,
    $pathname: pathname,
    url_host: window.location.host,
    url_path: pathname,
  };
};

export const PostHogPageviewTracker = () => {
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    const capturePageview = () => {
      const posthog = getPostHogClient();
      if (!posthog || !hasAnalyticsConsent() || posthog.has_opted_out_capturing()) return;

      posthog.capture('$pageview', getPageviewProperties(pathname));
    };

    capturePageview();

    window.addEventListener(COOKIE_PREFERENCES_CHANGED_EVENT, capturePageview);
    return () => window.removeEventListener(COOKIE_PREFERENCES_CHANGED_EVENT, capturePageview);
  }, [pathname]);

  return null;
};
