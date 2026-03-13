import { describe, expect, it } from 'vitest';

import { getGuildPath, toSlug } from '@/lib/guildSlug';

describe('guildSlug', () => {
  it('slugifies ASCII names', () => {
    expect(toSlug('Howling Fjord')).toBe('howling-fjord');
    expect(toSlug('EU')).toBe('eu');
  });

  it('removes diacritics for Latin names', () => {
    expect(toSlug('Exode')).toBe('exode');
    expect(toSlug('Hero al pull')).toBe('hero-al-pull');
  });

  it('normalizes apostrophes in realm-style names', () => {
    expect(toSlug("Pozzo dell'Eternità")).toBe('pozzo-delleternita');
    expect(toSlug('Pozzo dell’Eternità')).toBe('pozzo-delleternita');
  });

  it('keeps non-Latin letters so slugs do not become empty', () => {
    expect(toSlug('У беляша')).toBe('у-беляша');
    expect(getGuildPath('EU', 'Howling Fjord', 'У беляша')).toBe('/guild/eu/howling-fjord/у-беляша');
  });
});
