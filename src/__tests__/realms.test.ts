import { describe, expect, it } from 'vitest';

import { formatRealmDisplayName } from '@/lib/realms';

describe('formatRealmDisplayName', () => {
  it('formats known French realm display names from lowercase names or slugs', () => {
    expect(formatRealmDisplayName('archimonde', 'archimonde')).toBe('Archimonde');
    expect(formatRealmDisplayName(null, 'les-clairvoyants')).toBe('Les Clairvoyants');
    expect(formatRealmDisplayName(null, 'confrerie-du-thorium')).toBe('Confrérie du Thorium');
    expect(formatRealmDisplayName(null, 'kaelthas')).toBe("Kael'Thas");
  });

  it('falls back to title casing unknown realm names', () => {
    expect(formatRealmDisplayName('example realm', 'example-realm')).toBe('Example Realm');
  });
});
