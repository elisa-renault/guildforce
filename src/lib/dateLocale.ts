import type { Locale } from 'date-fns';
import { de, enUS, fr, it, ko, ru, zhCN } from 'date-fns/locale';
import type { Language } from '@/i18n/translations';

export const DATE_LOCALE_BY_LANGUAGE: Record<Language, Locale> = {
  en: enUS,
  fr,
  de,
  it,
  ru,
  'zh-CN': zhCN,
  ko,
};
