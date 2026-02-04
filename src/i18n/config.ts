export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it', 'ru', 'zh-CN', 'ko'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type BilingualContentLanguage = 'en' | 'fr';
export type BilingualValue<T> = Record<BilingualContentLanguage, T>;

export const FALLBACK_LANGUAGE: Language = 'en';

export const LANGUAGE_OPTIONS: ReadonlyArray<{ code: Language; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'ko', label: '한국어' },
];

export const INTL_LOCALE_BY_LANGUAGE: Record<Language, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  ru: 'ru-RU',
  'zh-CN': 'zh-CN',
  ko: 'ko-KR',
};

const LANGUAGE_ALIAS_BY_PREFIX: Array<{ prefix: string; language: Language }> = [
  { prefix: 'en', language: 'en' },
  { prefix: 'fr', language: 'fr' },
  { prefix: 'de', language: 'de' },
  { prefix: 'it', language: 'it' },
  { prefix: 'ru', language: 'ru' },
  { prefix: 'ko', language: 'ko' },
  { prefix: 'zh', language: 'zh-CN' },
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
  it: 'en',
  ru: 'en',
  'zh-CN': 'en',
  ko: 'en',
};

export const getBilingualContentLanguage = (language: Language): BilingualContentLanguage =>
  BILINGUAL_CONTENT_LANGUAGE_BY_LANGUAGE[language] || 'en';

export const getBilingualValue = <T>(language: Language, value: BilingualValue<T>): T =>
  value[getBilingualContentLanguage(language)];
