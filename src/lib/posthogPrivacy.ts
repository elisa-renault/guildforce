import type { CaptureResult } from 'posthog-js';

type MutableCaptureResult = CaptureResult & {
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
};

const POSTHOG_URL_KEYS = [
  '$current_url',
  '$session_entry_url',
  '$referrer',
  '$initial_current_url',
  '$initial_referrer',
  '$set.$current_url',
  '$set.$referrer',
  '$set_once.$initial_current_url',
  '$set_once.$initial_referrer',
] as const;

const POSTHOG_PATH_KEYS = [
  '$pathname',
  '$session_entry_pathname',
  '$initial_pathname',
  '$set.$pathname',
  '$set_once.$initial_pathname',
] as const;

const SENSITIVE_AUTH_QUERY_KEYS = new Set(['code', 'state', 'access_token', 'refresh_token', 'token']);

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

export const isSensitiveAuthUrl = (value: unknown): boolean => {
  const raw = asString(value);
  if (!raw) return false;

  try {
    const url = new URL(raw, typeof window === 'undefined' ? 'https://guildforce.app' : window.location.origin);
    if (!url.pathname.startsWith('/auth')) return false;

    return Array.from(SENSITIVE_AUTH_QUERY_KEYS).some((key) => url.searchParams.has(key));
  } catch {
    return raw.includes('/auth') && (raw.includes('code=') || raw.includes('state='));
  }
};

export const sanitizeUrlValue = (value: unknown): string | null => {
  const raw = asString(value);
  if (!raw) return null;

  try {
    const url = new URL(raw, typeof window === 'undefined' ? 'https://guildforce.app' : window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return raw.split('?')[0] || null;
  }
};

const sanitizePropertyBag = (properties: Record<string, unknown>) => {
  const sanitized = { ...properties };

  for (const key of POSTHOG_URL_KEYS) {
    const sanitizedUrl = sanitizeUrlValue(sanitized[key]);
    if (sanitizedUrl) {
      sanitized[key] = sanitizedUrl;
    } else {
      delete sanitized[key];
    }
  }

  for (const key of POSTHOG_PATH_KEYS) {
    const value = asString(sanitized[key]);
    if (value) {
      sanitized[key] = value.split('?')[0];
    }
  }

  for (const nestedKey of ['$set', '$set_once']) {
    const nested = sanitized[nestedKey];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      sanitized[nestedKey] = sanitizePropertyBag(nested as Record<string, unknown>);
    }
  }

  return sanitized;
};

export const getSafeCurrentLocationProperties = () => {
  if (typeof window === 'undefined') return {};

  return {
    url_host: window.location.host,
    url_path: window.location.pathname,
  };
};

export const sanitizePostHogCapture = (capture: CaptureResult | null): CaptureResult | null => {
  if (!capture) return capture;

  const output: MutableCaptureResult = {
    ...capture,
    properties: sanitizePropertyBag(capture.properties ?? {}),
  };

  if (capture.$set) {
    output.$set = sanitizePropertyBag(capture.$set);
  }

  if (capture.$set_once) {
    output.$set_once = sanitizePropertyBag(capture.$set_once);
  }

  return output;
};
