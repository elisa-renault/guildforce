import {
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getBilingualContentLanguage,
  resolveLanguage,
  type Language,
} from '@/i18n/config';

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

const normalizeContentValue = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

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
    const bilingualFallback = byLanguage.get(getBilingualContentLanguage(language));
    const seed =
      exact ||
      bilingualFallback ||
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

export const isTranslationMissingOrUntranslated = (
  translations: ContentTranslation[],
  targetLanguage: Language,
  sourceLanguages: Language[] = ['en', 'fr'],
): boolean => {
  const byLanguage = getLanguageMap(translations);
  const target = byLanguage.get(targetLanguage);
  if (!target) return true;

  const normalizedTitle = normalizeContentValue(target.title);
  const normalizedContent = normalizeContentValue(target.content);
  if (!normalizedTitle || !normalizedContent) return true;

  for (const sourceLanguage of sourceLanguages) {
    if (sourceLanguage === targetLanguage) continue;

    const source = byLanguage.get(sourceLanguage);
    if (!source) continue;

    if (normalizedContent === normalizeContentValue(source.content)) {
      return true;
    }
  }

  return false;
};
