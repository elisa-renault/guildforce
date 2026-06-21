import { describe, expect, it } from 'vitest';

import { resolveRosterSeasonNameFromSlug } from '@/lib/wowSeasonName';

describe('resolveRosterSeasonNameFromSlug', () => {
  it('formats the current Midnight season slug', () => {
    expect(resolveRosterSeasonNameFromSlug('season-mn-1')).toBe('Midnight - Saison 1');
  });

  it('formats known future season numbers from the same expansion', () => {
    expect(resolveRosterSeasonNameFromSlug('season-mn-2')).toBe('Midnight - Saison 2');
  });

  it('falls back when the slug cannot be parsed safely', () => {
    expect(resolveRosterSeasonNameFromSlug('unknown')).toBe('Midnight - Saison 1');
  });
});
