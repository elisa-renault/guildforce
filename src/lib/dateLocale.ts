import type { Locale } from 'date-fns';
import { de, enUS, es, fr, it, ko, ptBR, ru, zhCN } from 'date-fns/locale';
import type { Language } from '@/i18n/translations';

export const DATE_LOCALE_BY_LANGUAGE: Record<Language, Locale> = {
  en: enUS,
  fr,
  de,
  es,
  'pt-BR': ptBR,
  it,
  ru,
  'zh-CN': zhCN,
  ko,
};
