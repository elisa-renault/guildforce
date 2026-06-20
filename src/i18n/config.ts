export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es', 'pt-BR', 'it', 'ru', 'zh-TW', 'ko'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type BilingualContentLanguage = 'en' | 'fr';
export type BilingualValue<T> = Record<BilingualContentLanguage, T>;

export const FALLBACK_LANGUAGE: Language = 'en';

export const LANGUAGE_OPTIONS: ReadonlyArray<{ code: Language; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Fran\u00e7ais' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Espa\u00f1ol' },
  { code: 'pt-BR', label: 'Portugu\u00eas (Brasil)' },
  { code: 'it', label: 'Italiano' },
  { code: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  { code: 'zh-TW', label: '\u4e2d\u6587\uff08\u7e41\u9ad4\uff09' },
  { code: 'ko', label: '\ud55c\uad6d\uc5b4' },
];

export const LANGUAGE_FLAG_BY_CODE: Readonly<Record<Language, string>> = {
  en: '🇺🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
  'pt-BR': '🇧🇷',
  it: '🇮🇹',
  ru: '🇷🇺',
  'zh-TW': '🇹🇼',
  ko: '🇰🇷',
};

export const getLanguageDisplayLabel = (language: Language): string => {
  const option = LANGUAGE_OPTIONS.find((entry) => entry.code === language);
  const label = option?.label || language;
  const flag = LANGUAGE_FLAG_BY_CODE[language];
  return flag ? `${flag} ${label}` : label;
};

export const INTL_LOCALE_BY_LANGUAGE: Record<Language, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  it: 'it-IT',
  ru: 'ru-RU',
  'zh-TW': 'zh-TW',
  ko: 'ko-KR',
};

const LANGUAGE_ALIAS_BY_PREFIX: Array<{ prefix: string; language: Language }> = [
  { prefix: 'en', language: 'en' },
  { prefix: 'fr', language: 'fr' },
  { prefix: 'de', language: 'de' },
  { prefix: 'es', language: 'es' },
  { prefix: 'pt', language: 'pt-BR' },
  { prefix: 'it', language: 'it' },
  { prefix: 'ru', language: 'ru' },
  { prefix: 'ko', language: 'ko' },
  { prefix: 'zh-tw', language: 'zh-TW' },
  { prefix: 'zh-hant', language: 'zh-TW' },
  { prefix: 'zh-hk', language: 'zh-TW' },
  { prefix: 'zh-mo', language: 'zh-TW' },
  { prefix: 'zh', language: 'zh-TW' },
];

export const resolveLanguage = (candidate: string | null | undefined): Language => {
  if (!candidate) return FALLBACK_LANGUAGE;

  const normalized = candidate.trim().replace(/_/g, '-').toLowerCase();
  if (!normalized) return FALLBACK_LANGUAGE;

  for (const { prefix, language } of LANGUAGE_ALIAS_BY_PREFIX) {
    if (normalized === prefix || normalized.startsWith(`${prefix}-`)) {
      return language;
    }
  }

  return FALLBACK_LANGUAGE;
};

export const isSupportedLanguage = (value: string): value is Language =>
  SUPPORTED_LANGUAGES.includes(value as Language);

export const detectLanguageFromNavigator = (browserLanguage: string): Language =>
  resolveLanguage(browserLanguage);

export const getIntlLocale = (language: Language): string =>
  INTL_LOCALE_BY_LANGUAGE[language] || INTL_LOCALE_BY_LANGUAGE[FALLBACK_LANGUAGE];

const BILINGUAL_CONTENT_LANGUAGE_BY_LANGUAGE: Record<Language, BilingualContentLanguage> = {
  en: 'en',
  fr: 'fr',
  de: 'en',
  es: 'en',
  'pt-BR': 'en',
  it: 'en',
  ru: 'en',
  'zh-TW': 'en',
  ko: 'en',
};

export const getBilingualContentLanguage = (language: Language): BilingualContentLanguage =>
  BILINGUAL_CONTENT_LANGUAGE_BY_LANGUAGE[language] || 'en';

export const getBilingualValue = <T>(language: Language, value: BilingualValue<T>): T =>
  value[getBilingualContentLanguage(language)];
