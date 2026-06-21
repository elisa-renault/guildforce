import { describe, expect, it } from 'vitest';

import { getPostHogPersonLabel } from '@/lib/posthogPersonLabel';

describe('getPostHogPersonLabel', () => {
  it('returns the same deterministic label for the same user id', () => {
    const userId = '458b4d4e-b7f7-470d-97db-d7ae4ae9a9b3';

    expect(getPostHogPersonLabel(userId)).toBe('Cobalt Cipher 458b4d');
    expect(getPostHogPersonLabel(userId)).toBe(getPostHogPersonLabel(userId));
  });

  it('can produce different initials for different user ids', () => {
    const firstLabel = getPostHogPersonLabel('user-1');
    const secondLabel = getPostHogPersonLabel('user-2');

    expect(firstLabel).toBe('Quartz Keystone user1');
    expect(secondLabel).toBe('Amber Lantern user2');
    expect(firstLabel.charAt(0)).not.toBe(secondLabel.charAt(0));
  });

  it('does not expose a full dashed uuid or profile data', () => {
    const userId = '458b4d4e-b7f7-470d-97db-d7ae4ae9a9b3';
    const label = getPostHogPersonLabel(userId);

    expect(label).not.toContain(userId);
    expect(label).not.toContain('-');
    expect(label).not.toContain('BattleTag');
    expect(label).not.toContain('email');
    expect(label).not.toContain('username');
  });
});
