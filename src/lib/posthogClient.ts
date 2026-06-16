import posthog from 'posthog-js';

import type { PostHog } from 'posthog-js';

import { hasAnalyticsConsent } from '@/lib/analyticsConsent';
import { getPostHogConfig } from '@/lib/posthogConfig';

let initialized = false;

export const initializePostHog = (): PostHog | null => {
  const config = getPostHogConfig();

  if (!config.enabled || !config.projectToken) {
    return null;
  }

  if (!initialized) {
    posthog.init(config.projectToken, {
      api_host: config.host,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      opt_out_capturing_by_default: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      persistence: 'localStorage',
      loaded: (client) => {
        if (hasAnalyticsConsent()) {
          client.opt_in_capturing();
        } else {
          client.opt_out_capturing();
        }
      },
    });
    initialized = true;
  }

  return posthog;
};

export const getPostHogClient = (): PostHog | null => {
  if (!initialized) return null;
  return posthog;
};

export const isPostHogInitialized = (): boolean => initialized;

