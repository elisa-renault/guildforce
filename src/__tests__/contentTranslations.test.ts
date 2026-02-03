import { describe, expect, it } from 'vitest';
import {
  collectPersistedTranslations,
  selectContentTranslation,
  toEditableTranslationMap,
} from '@/lib/contentTranslations';

describe('contentTranslations', () => {
  it('selects the exact language when available', () => {
    const selected = selectContentTranslation(
      [
        { language: 'en', title: 'Hello', content: 'World' },
        { language: 'de', title: 'Hallo', content: 'Welt' },
      ],
      'de',
    );

    expect(selected.title).toBe('Hallo');
  });

  it('falls back to english when requested language is missing', () => {
    const selected = selectContentTranslation(
      [
        { language: 'en', title: 'Hello', content: 'World' },
        { language: 'fr', title: 'Bonjour', content: 'Monde' },
      ],
      'ko',
    );

    expect(selected.title).toBe('Hello');
  });

  it('builds editable map with fallback seeds and existence flags', () => {
    const map = toEditableTranslationMap([
      { language: 'en', title: 'Hello', content: 'World' },
      { language: 'fr', title: 'Bonjour', content: 'Monde' },
    ]);

    expect(map.en.exists).toBe(true);
    expect(map.fr.exists).toBe(true);
    expect(map.de.exists).toBe(false);
    expect(map.de.title).toBe('Hello');
  });

  it('collects required and explicit translations only', () => {
    const map = toEditableTranslationMap([{ language: 'en', title: 'Hello', content: 'World' }]);

    map.de = { title: 'Hallo', content: 'Welt', exists: true };

    const rows = collectPersistedTranslations(map, ['en']);
    const languages = rows.map((row) => row.language).sort();

    expect(languages).toEqual(['de', 'en']);
  });
});
