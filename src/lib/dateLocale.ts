import type { Locale } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import type { Language } from '@/i18n/translations';

export const DATE_LOCALE_BY_LANGUAGE: Record<Language, Locale> = {
  en: enUS,
  fr,
};
