import { describe, expect, it } from 'vitest';

import {
  formatDateLocalized,
  formatDistanceFromNowLocalized,
  formatNumberLocalized,
  formatPluralMessage,
  interpolateMessage,
} from '@/i18n/format';

describe('i18n format helpers', () => {
  it('interpolates {{double}} and {single} placeholders', () => {
    const value = interpolateMessage('Hello {{name}} from {guild}.', {
      name: 'Elisa',
      guild: 'Guildforce',
    });

    expect(value).toBe('Hello Elisa from Guildforce.');
  });

  it('formats plural message with language-aware rule', () => {
    const one = formatPluralMessage({
      language: 'en',
      count: 1,
      forms: { one: '{{count}} user', other: '{{count}} users' },
    });
    const many = formatPluralMessage({
      language: 'en',
      count: 2,
      forms: { one: '{{count}} user', other: '{{count}} users' },
    });

    expect(one).toBe('1 user');
    expect(many).toBe('2 users');
  });

  it('formats localized date, number, and relative distance', () => {
    const date = formatDateLocalized('2026-02-04T12:00:00.000Z', 'en', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const number = formatNumberLocalized(12345.67, 'en', {
      maximumFractionDigits: 2,
    });
    const distance = formatDistanceFromNowLocalized(Date.now() - 60_000, 'en', true);

    expect(date).toContain('2026');
    expect(number.length).toBeGreaterThan(0);
    expect(distance.length).toBeGreaterThan(0);
  });
});
