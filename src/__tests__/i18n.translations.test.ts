import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadTranslations } from '@/i18n/translations';
import { translationsEn } from '@/i18n/translations.en';
import { translationsFr } from '@/i18n/translations.fr';

describe('i18n translations loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads FR translations explicitly', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const value = await loadTranslations('fr');
    expect(value.common.loading).toBe(translationsFr.common.loading);
  });

  it('falls back to EN translations for non-FR locales', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const deValue = await loadTranslations('de');
    const zhValue = await loadTranslations('zh-CN');

    expect(deValue).toBe(translationsEn);
    expect(zhValue).toBe(translationsEn);
  });
});
