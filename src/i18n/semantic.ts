import type { Language } from '@/i18n/config';
import type { Translations } from '@/i18n/translations';

const EN_SEMANTIC_MESSAGES = {
  'admin.documentation.title': 'Documentation',
  'admin.documentation.subtitle': 'Everything you need to understand and operate Guildforce.',
  'admin.documentation.search_placeholder': 'Search in documentation...',
  'admin.documentation.no_results': 'No documentation result for this query.',

  'admin.legal.saved': 'Page saved successfully.',
  'admin.legal.toggle_preview': 'Preview',
  'admin.legal.toggle_edit': 'Edit',
  'admin.legal.field_title': 'Title',
  'admin.legal.field_content': 'Content',
  'admin.legal.markdown_placeholder': 'Write legal page content in Markdown...',
  'admin.legal.list_help': 'Manage public legal pages. Each page can have multiple language versions with EN fallback.',
  'admin.legal.edit_action': 'Edit',
  'admin.legal.required_en_fr': 'EN and FR legal versions are required.',

  'admin.patch.version_placeholder': '1.2.3',
  'admin.patch.title_placeholder.fr': 'Titre de la version',
  'admin.patch.title_placeholder.en': 'Version title',
  'admin.patch.content_placeholder.fr': 'Decrivez les changements...',
  'admin.patch.content_placeholder.en': 'Describe the changes...',
  'admin.patch.required_en_title': 'An English title is required.',
} as const;

const FR_SEMANTIC_MESSAGES: Record<keyof typeof EN_SEMANTIC_MESSAGES, string> = {
  'admin.documentation.title': 'Documentation',
  'admin.documentation.subtitle': 'Tout ce qu\'il faut pour comprendre et exploiter Guildforce.',
  'admin.documentation.search_placeholder': 'Rechercher dans la documentation...',
  'admin.documentation.no_results': 'Aucun resultat de documentation pour cette recherche.',

  'admin.legal.saved': 'Page enregistree avec succes.',
  'admin.legal.toggle_preview': 'Apercu',
  'admin.legal.toggle_edit': 'Modifier',
  'admin.legal.field_title': 'Titre',
  'admin.legal.field_content': 'Contenu',
  'admin.legal.markdown_placeholder': 'Ecrivez le contenu legal en Markdown...',
  'admin.legal.list_help': 'Gerez les pages legales publiques. Chaque page peut avoir plusieurs versions linguistiques avec fallback EN.',
  'admin.legal.edit_action': 'Modifier',
  'admin.legal.required_en_fr': 'Les versions legales EN et FR sont obligatoires.',

  'admin.patch.version_placeholder': '1.2.3',
  'admin.patch.title_placeholder.fr': 'Titre de la version',
  'admin.patch.title_placeholder.en': 'Version title',
  'admin.patch.content_placeholder.fr': 'Decrivez les changements...',
  'admin.patch.content_placeholder.en': 'Describe the changes...',
  'admin.patch.required_en_title': 'Un titre anglais est obligatoire.',
};

export type SemanticKey = keyof typeof EN_SEMANTIC_MESSAGES;

const SEMANTIC_MESSAGES_BY_LANGUAGE: Record<Language, Partial<Record<SemanticKey, string>>> = {
  en: EN_SEMANTIC_MESSAGES,
  fr: FR_SEMANTIC_MESSAGES,
  de: {},
  it: {},
  ru: {},
  'zh-CN': {},
  ko: {},
};

const LEGACY_AUTO_KEY_BY_SEMANTIC_KEY: Partial<Record<SemanticKey, string>> = {
  'admin.documentation.title': 'components_admin_AdminDocumentation_405',
  'admin.documentation.subtitle': 'components_admin_AdminDocumentation_408',
  'admin.documentation.search_placeholder': 'components_admin_AdminDocumentation_419',
  'admin.documentation.no_results': 'components_admin_AdminDocumentation_475',

  'admin.legal.saved': 'components_admin_LegalPagesEditor_93',
  'admin.legal.toggle_preview': 'components_admin_LegalPagesEditor_137_2',
  'admin.legal.toggle_edit': 'components_admin_LegalPagesEditor_137',
  'admin.legal.field_title': 'components_admin_LegalPagesEditor_217',
  'admin.legal.field_content': 'components_admin_LegalPagesEditor_234',
  'admin.legal.markdown_placeholder': 'components_admin_LegalPagesEditor_244',
  'admin.legal.list_help': 'components_admin_LegalPagesEditor_259',
  'admin.legal.edit_action': 'components_admin_LegalPagesEditor_287',

  'admin.patch.version_placeholder': 'components_admin_PatchNotesEditor_version_placeholder',
  'admin.patch.title_placeholder.fr': 'components_admin_PatchNotesEditor_title_fr_placeholder',
  'admin.patch.title_placeholder.en': 'components_admin_PatchNotesEditor_title_en_placeholder',
  'admin.patch.content_placeholder.fr': 'components_admin_PatchNotesEditor_content_fr_placeholder',
  'admin.patch.content_placeholder.en': 'components_admin_PatchNotesEditor_content_en_placeholder',
};

interface ResolveSemanticMessageOptions {
  key: SemanticKey;
  language: Language;
  translations: Translations;
  fallback?: string;
}

export const resolveSemanticMessage = ({
  key,
  language,
  translations,
  fallback,
}: ResolveSemanticMessageOptions): string => {
  const byLanguage = SEMANTIC_MESSAGES_BY_LANGUAGE[language]?.[key];
  if (byLanguage) return byLanguage;

  const legacyAutoKey = LEGACY_AUTO_KEY_BY_SEMANTIC_KEY[key];
  if (legacyAutoKey) {
    const legacyValue = translations.auto?.[legacyAutoKey];
    if (legacyValue) return legacyValue;
  }

  const fallbackEn = EN_SEMANTIC_MESSAGES[key];
  if (fallbackEn) return fallbackEn;

  return fallback ?? key;
};

export const listSemanticKeys = (): ReadonlyArray<SemanticKey> =>
  Object.keys(EN_SEMANTIC_MESSAGES) as SemanticKey[];

export const getLegacyAutoKeyBySemanticKey = (): Readonly<Partial<Record<SemanticKey, string>>> =>
  LEGACY_AUTO_KEY_BY_SEMANTIC_KEY;
