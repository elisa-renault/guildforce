const readRuntimeEnv = (key: string): string | undefined => {
  const fromImportMeta = import.meta.env?.[key as keyof ImportMetaEnv];
  if (typeof fromImportMeta === 'string' && fromImportMeta.trim().length > 0) {
    return fromImportMeta.trim();
  }

  const fromWindow =
    typeof window !== 'undefined'
      ? (window as Window & { __ENV?: Record<string, string | undefined> }).__ENV?.[key]
      : undefined;

  if (typeof fromWindow === 'string' && fromWindow.trim().length > 0) {
    return fromWindow.trim();
  }

  return undefined;
};

const truthyValues = new Set(['1', 'true', 'yes', 'on']);
const falsyValues = new Set(['0', 'false', 'no', 'off']);

export interface PostHogRuntimeConfig {
  enabled: boolean;
  projectToken?: string;
  host: string;
}

export const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

export const getPostHogConfig = (): PostHogRuntimeConfig => {
  const projectToken = readRuntimeEnv('VITE_POSTHOG_PROJECT_TOKEN');
  const host = readRuntimeEnv('VITE_POSTHOG_HOST') ?? DEFAULT_POSTHOG_HOST;
  const enabledValue = readRuntimeEnv('VITE_POSTHOG_ENABLED');
  const normalizedEnabled = enabledValue?.toLowerCase();

  const requestedEnabled =
    normalizedEnabled === undefined
      ? true
      : truthyValues.has(normalizedEnabled) || !falsyValues.has(normalizedEnabled);
  const enabled = Boolean(projectToken) && requestedEnabled;

  return {
    enabled,
    projectToken,
    host,
  };
};
