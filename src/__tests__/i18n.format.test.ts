import { describe, expect, it } from 'vitest';

import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import {
  formatDateTimeInputPlaceholder,
  formatDateLocalized,
  formatDistanceFromNowLocalized,
  formatNumberLocalized,
  formatPluralMessage,
  interpolateMessage,
  parseDateTimeInputValue,
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

  it('formats date-time input placeholders with each app locale', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      const placeholder = formatDateTimeInputPlaceholder(language);

      expect(placeholder).toContain('YYYY');
      expect(placeholder).toContain('MM');
      expect(placeholder).toContain('DD');
      expect(placeholder).toContain('HH');
      expect(placeholder).toContain('mm');
      expect(placeholder).not.toContain('2026');
    }

    expect(formatDateTimeInputPlaceholder('en').indexOf('MM')).toBeLessThan(
      formatDateTimeInputPlaceholder('en').indexOf('DD'),
    );
    expect(formatDateTimeInputPlaceholder('ko').indexOf('YYYY')).toBeLessThan(
      formatDateTimeInputPlaceholder('ko').indexOf('MM'),
    );
  });

  it('parses date-time input values using locale date order', () => {
    const expectLocalDate = (value: Date | null) => {
      expect(value).not.toBeNull();
      expect(value?.getFullYear()).toBe(2026);
      expect(value?.getMonth()).toBe(5);
      expect(value?.getDate()).toBe(20);
      expect(value?.getHours()).toBe(21);
      expect(value?.getMinutes()).toBe(30);
    };

    expectLocalDate(parseDateTimeInputValue('06/20/2026, 21:30', 'en'));
    expectLocalDate(parseDateTimeInputValue('20/06/2026 21:30', 'fr'));
    expectLocalDate(parseDateTimeInputValue('2026. 06. 20. 21:30', 'ko'));
    expectLocalDate(parseDateTimeInputValue('2026/06/20 21:30', 'zh-TW'));

    expect(parseDateTimeInputValue('20/06/2026 21:30', 'en')).toBeNull();
    expect(parseDateTimeInputValue('2026. 02. 31. 21:30', 'ko')).toBeNull();
  });
});
