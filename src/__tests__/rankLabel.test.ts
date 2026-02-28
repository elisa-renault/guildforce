import { describe, expect, it } from 'vitest';

import { formatRankLabel } from '@/lib/rankLabel';

describe('formatRankLabel', () => {
  it('returns the custom label when provided', () => {
    expect(
      formatRankLabel({
        rankName: 'Rank 1',
        rankIndex: 1,
        rankLabel: 'Rank {{index}}',
        customLabel: 'Officer',
      }),
    ).toBe('Officer');
  });

  it('falls back to the existing formatting logic when no custom label is set', () => {
    expect(
      formatRankLabel({
        rankName: 'Rank 3',
        rankIndex: 3,
        rankLabel: 'Rank {{index}}',
      }),
    ).toBe('Rank 3');
  });
});
