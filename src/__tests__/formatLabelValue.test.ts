import { describe, expect, it } from 'vitest';

import { formatLabelValue } from '@/i18n/format';

describe('formatLabelValue', () => {
  it('adds a space before the colon in French', () => {
    expect(formatLabelValue('Tri', 'Total décroissant', 'fr')).toBe('Tri : Total décroissant');
  });

  it('keeps the compact colon in English', () => {
    expect(formatLabelValue('Sort', 'Total descending', 'en')).toBe('Sort: Total descending');
  });
});
