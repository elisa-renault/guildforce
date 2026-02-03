import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, resolveLanguage, type Language } from '@/i18n/config';

export interface ContentTranslation {
  language: string;
  title: string;
  content: string;
}

export interface EditableContentTranslation {
  title: string;
  content: string;
  exists: boolean;
}

export type EditableContentTranslationMap = Record<Language, EditableContentTranslation>;

const getLanguageMap = (translations: ContentTranslation[]): Map<Language, ContentTranslation> => {
  const byLanguage = new Map<Language, ContentTranslation>();

  for (const translation of translations) {
    const language = resolveLanguage(translation.language);
    if (!byLanguage.has(language)) {
      byLanguage.set(language, translation);
    }
  }

  return byLanguage;
};

export const selectContentTranslation = (
  translations: ContentTranslation[],
  language: Language,
): ContentTranslation => {
  const byLanguage = getLanguageMap(translations);

  const exact = byLanguage.get(language);
  if (exact) return exact;

  const fallback =
    byLanguage.get(FALLBACK_LANGUAGE) ||
    byLanguage.get('fr') ||
    translations[0];

  return fallback || { language: FALLBACK_LANGUAGE, title: '', content: '' };
};

export const toEditableTranslationMap = (
  translations: ContentTranslation[],
): EditableContentTranslationMap => {
  const byLanguage = getLanguageMap(translations);
  const fallback =
    byLanguage.get(FALLBACK_LANGUAGE) ||
    byLanguage.get('fr') ||
    translations[0] ||
    { language: FALLBACK_LANGUAGE, title: '', content: '' };

  const map = {} as EditableContentTranslationMap;

  for (const language of SUPPORTED_LANGUAGES) {
    const exact = byLanguage.get(language);
    const seed =
      exact ||
      (language === 'fr' ? byLanguage.get('fr') : byLanguage.get(FALLBACK_LANGUAGE)) ||
      fallback;

    map[language] = {
      title: seed?.title || '',
      content: seed?.content || '',
      exists: Boolean(exact),
    };
  }

  return map;
};

export const collectPersistedTranslations = (
  map: EditableContentTranslationMap,
  requiredLanguages: Language[] = [],
): Array<{ language: Language; title: string; content: string }> => {
  const required = new Set<Language>(requiredLanguages);

  return SUPPORTED_LANGUAGES
    .filter((language) => required.has(language) || map[language].exists)
    .map((language) => ({
      language,
      title: map[language].title.trim(),
      content: map[language].content,
    }))
    .filter(({ title, content }) => title.length > 0 || content.length > 0);
};
