import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadTranslations } from '@/i18n/translations';
import { translationsDe } from '@/i18n/translations.de';
import { translationsEn } from '@/i18n/translations.en';
import { translationsFr } from '@/i18n/translations.fr';
import { translationsIt } from '@/i18n/translations.it';
import { translationsKo } from '@/i18n/translations.ko';
import { translationsRu } from '@/i18n/translations.ru';
import { translationsZhCn } from '@/i18n/translations.zh-CN';

describe('i18n translations loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads FR translations explicitly', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const value = await loadTranslations('fr');
    expect(value.common.loading).toBe(translationsFr.common.loading);
  });

  it('loads all configured locale packs', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const deValue = await loadTranslations('de');
    const itValue = await loadTranslations('it');
    const ruValue = await loadTranslations('ru');
    const zhValue = await loadTranslations('zh-CN');
    const koValue = await loadTranslations('ko');

    expect(deValue).toBe(translationsDe);
    expect(itValue).toBe(translationsIt);
    expect(ruValue).toBe(translationsRu);
    expect(zhValue).toBe(translationsZhCn);
    expect(koValue).toBe(translationsKo);
    expect(deValue).toBe(translationsEn);
  });
});
