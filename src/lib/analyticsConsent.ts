import type { CookiePreferences } from '@/components/CookieBanner';

export const COOKIE_PREFERENCES_CHANGED_EVENT = 'guildforce-cookie-preferences-changed';

export type CookiePreferencesChangedDetail = {
  preferences: CookiePreferences;
};

export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const stored = window.localStorage.getItem('guildforce_cookie_preferences');
    if (!stored) return false;

    const preferences = JSON.parse(stored) as Partial<CookiePreferences>;
    return preferences.analytics === true;
  } catch {
    return false;
  }
};

export const dispatchCookiePreferencesChanged = (preferences: CookiePreferences) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<CookiePreferencesChangedDetail>(COOKIE_PREFERENCES_CHANGED_EVENT, {
      detail: { preferences },
    }),
  );
};

