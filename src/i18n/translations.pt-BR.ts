import { translationsEn } from './translations.en';
import { createLocaleTranslations } from './createLocaleTranslations';
import type { Translations } from './translations';

// Placeholder locale pack for progressive rollout; currently falls back to EN copy.
export const translationsPtBr: Translations = createLocaleTranslations(translationsEn, {});
