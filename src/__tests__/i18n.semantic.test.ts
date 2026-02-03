import { describe, expect, it } from 'vitest';

import type { Translations } from '@/i18n/translations';

import { listSemanticKeys, resolveSemanticMessage } from '@/i18n/semantic';

const asTranslations = (auto: Record<string, string>): Translations =>
  ({ auto } as unknown as Translations);

describe('semantic i18n', () => {
  it('returns semantic FR copy when available', () => {
    const value = resolveSemanticMessage({
      key: 'admin.legal.edit_action',
      language: 'fr',
      translations: asTranslations({}),
    });

    expect(value).toBe('Modifier');
  });

  it('uses legacy auto compatibility when locale semantic copy is missing', () => {
    const value = resolveSemanticMessage({
      key: 'admin.documentation.title',
      language: 'de',
      translations: asTranslations({
        components_admin_AdminDocumentation_405: 'Dokumentation (legacy)',
      }),
    });

    expect(value).toBe('Dokumentation (legacy)');
  });

  it('falls back to EN semantic copy when no compatibility key is available', () => {
    const value = resolveSemanticMessage({
      key: 'admin.patch.required_en_title',
      language: 'de',
      translations: asTranslations({}),
    });

    expect(value).toBe('An English title is required.');
  });

  it('exposes semantic keys for migration checks', () => {
    expect(listSemanticKeys()).toContain('admin.legal.saved');
    expect(listSemanticKeys()).toContain('admin.documentation.search_placeholder');
  });
});
