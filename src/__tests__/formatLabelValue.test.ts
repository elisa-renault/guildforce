import { describe, expect, it } from 'vitest';

import { formatLabelValue } from '@/i18n/format';

describe('formatLabelValue', () => {
  it('uses a narrow no-break space before the colon in French', () => {
    expect(formatLabelValue('Tri', 'Total décroissant', 'fr')).toBe('Tri\u202f: Total décroissant');
  });

  it('keeps the compact colon in English', () => {
    expect(formatLabelValue('Sort', 'Total descending', 'en')).toBe('Sort: Total descending');
  });

  it('uses fullwidth punctuation in Traditional Chinese', () => {
    expect(formatLabelValue('操作者', 'Elsia', 'zh-TW')).toBe('操作者\uff1aElsia');
  });
});
