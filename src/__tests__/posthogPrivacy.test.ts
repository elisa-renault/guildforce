import { describe, expect, it } from 'vitest';

import {
  isSensitiveAuthUrl,
  sanitizePostHogCapture,
  sanitizeUrlValue,
} from '@/lib/posthogPrivacy';

describe('posthog privacy sanitization', () => {
  it('detects auth callback URLs with OAuth query values', () => {
    expect(isSensitiveAuthUrl('https://guildforce.app/auth?code=secret-code&state=raw-state')).toBe(true);
    expect(isSensitiveAuthUrl('https://guildforce.app/guilds?code=not-oauth')).toBe(false);
  });

  it('removes query strings from URL values', () => {
    expect(sanitizeUrlValue('https://guildforce.app/auth?code=secret-code&state=raw-state')).toBe('https://guildforce.app/auth');
  });

  it('sanitizes automatic PostHog URL properties before send', () => {
    const sanitized = sanitizePostHogCapture({
      uuid: 'event-1',
      event: '$identify',
      properties: {
        $current_url: 'https://guildforce.app/auth?code=secret-code&state=raw-state',
        $pathname: '/auth?code=secret-code',
        $set: {
          $current_url: 'https://guildforce.app/auth?code=secret-code&state=raw-state',
        },
        $set_once: {
          $initial_current_url: 'https://guildforce.app/auth?code=secret-code&state=raw-state',
        },
        safe: 'value',
      },
      $set: {
        $current_url: 'https://guildforce.app/auth?code=secret-code&state=raw-state',
      },
      $set_once: {
        $initial_current_url: 'https://guildforce.app/auth?code=secret-code&state=raw-state',
      },
    });

    expect(sanitized?.properties).toEqual({
      $current_url: 'https://guildforce.app/auth',
      $pathname: '/auth',
      $set: {
        $current_url: 'https://guildforce.app/auth',
      },
      $set_once: {
        $initial_current_url: 'https://guildforce.app/auth',
      },
      safe: 'value',
    });
    expect(sanitized?.$set?.$current_url).toBe('https://guildforce.app/auth');
    expect(sanitized?.$set_once?.$initial_current_url).toBe('https://guildforce.app/auth');
  });
});
