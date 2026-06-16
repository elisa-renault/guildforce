import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_POSTHOG_HOST, getPostHogConfig } from '@/lib/posthogConfig';

const setRuntimeEnv = (env: Record<string, string | undefined>) => {
  (window as Window & { __ENV?: Record<string, string | undefined> }).__ENV = env;
};

describe('posthog config', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', '');
    vi.stubEnv('VITE_POSTHOG_HOST', '');
    vi.stubEnv('VITE_POSTHOG_ENABLED', '');
  });

  afterEach(() => {
    delete (window as Window & { __ENV?: Record<string, string | undefined> }).__ENV;
    vi.unstubAllEnvs();
  });

  it('stays disabled without a project token', () => {
    setRuntimeEnv({});

    expect(getPostHogConfig()).toEqual({
      enabled: false,
      projectToken: undefined,
      host: DEFAULT_POSTHOG_HOST,
    });
  });

  it('uses Cloud EU as the default host when a token is present', () => {
    setRuntimeEnv({
      VITE_POSTHOG_PROJECT_TOKEN: 'ph_project_token',
    });

    expect(getPostHogConfig()).toEqual({
      enabled: true,
      projectToken: 'ph_project_token',
      host: 'https://eu.i.posthog.com',
    });
  });

  it('allows runtime opt-out even when a token exists', () => {
    setRuntimeEnv({
      VITE_POSTHOG_PROJECT_TOKEN: 'ph_project_token',
      VITE_POSTHOG_ENABLED: 'false',
    });

    expect(getPostHogConfig().enabled).toBe(false);
  });
});
