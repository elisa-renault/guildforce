import type {
  PollQuestionType,
  PollResultsAccessConfig,
  PollResultsAccessRule,
  PollResultsAudienceType,
  PollResultsBaseAudience,
  PollResultsTargetType,
  PollResultsVisibilityLevel,
} from '@/types/poll';

export interface ResultsAccessSectionOption {
  id: string;
  title: string;
}

export interface ResultsAccessQuestionOption {
  id: string;
  section_id: string | null;
  question_text: string;
  question_type: PollQuestionType;
}

export interface ResultsAccessMemberOption {
  user_id: string;
  username: string;
}

export interface ResultsAccessRankOption {
  rank_index: number;
  rank_name: string;
}

export type PollResultsVisibilityPreset =
  | 'everyone_full'
  | 'guild_members_non_text'
  | 'eligible_non_text'
  | 'managers_only'
  | 'custom';

export type QuickExceptionPreset =
  | 'mask_text'
  | 'open_section'
  | 'open_question'
  | 'grant_rank'
  | 'grant_user';

interface DescribeRuleContext {
  language: string;
  members?: ResultsAccessMemberOption[];
  ranks?: ResultsAccessRankOption[];
  sections?: ResultsAccessSectionOption[];
  questions?: ResultsAccessQuestionOption[];
}

interface QuickRuleContext {
  sections: ResultsAccessSectionOption[];
  questions: ResultsAccessQuestionOption[];
  members: ResultsAccessMemberOption[];
  ranks: ResultsAccessRankOption[];
}

const PRESET_RULE_NON_TEXT: PollResultsAccessRule = {
  audience_type: 'base_audience',
  visibility_level: 'none',
  target_type: 'question_type',
  question_type: 'text',
};

const PRESET_CONFIGS: Record<Exclude<PollResultsVisibilityPreset, 'custom'>, PollResultsAccessConfig> = {
  everyone_full: {
    base_audience: 'guild_members',
    base_visibility: 'full',
    rules: [],
  },
  guild_members_non_text: {
    base_audience: 'guild_members',
    base_visibility: 'full',
    rules: [PRESET_RULE_NON_TEXT],
  },
  eligible_non_text: {
    base_audience: 'eligible_respondents',
    base_visibility: 'full',
    rules: [PRESET_RULE_NON_TEXT],
  },
  managers_only: {
    base_audience: 'restricted',
    base_visibility: 'none',
    rules: [],
  },
};

const PRESET_LABELS: Record<string, Record<PollResultsVisibilityPreset, string>> = {
  en: {
    everyone_full: 'Everyone sees everything',
    guild_members_non_text: 'Guild members see non-text only',
    eligible_non_text: 'Eligible respondents see non-text only',
    managers_only: 'Results reserved for managers',
    custom: 'Custom configuration',
  },
  fr: {
    everyone_full: 'Tout le monde voit tout',
    guild_members_non_text: 'Les membres voient seulement le non-texte',
    eligible_non_text: 'Les répondants éligibles voient seulement le non-texte',
    managers_only: 'Résultats réservés aux gestionnaires',
    custom: 'Configuration personnalisée',
  },
  de: {
    everyone_full: 'Alle sehen alles',
    guild_members_non_text: 'Gildenmitglieder sehen nur Nicht-Text',
    eligible_non_text: 'Berechtigte Antwortende sehen nur Nicht-Text',
    managers_only: 'Ergebnisse nur für Manager',
    custom: 'Benutzerdefinierte Konfiguration',
  },
  es: {
    everyone_full: 'Todos ven todo',
    guild_members_non_text: 'Los miembros ven solo resultados sin texto',
    eligible_non_text: 'Los encuestados elegibles ven solo resultados sin texto',
    managers_only: 'Resultados reservados a gestores',
    custom: 'Configuración personalizada',
  },
  'pt-BR': {
    everyone_full: 'Todos veem tudo',
    guild_members_non_text: 'Membros veem apenas resultados sem texto',
    eligible_non_text: 'Respondentes elegíveis veem apenas resultados sem texto',
    managers_only: 'Resultados reservados para gestores',
    custom: 'Configuração personalizada',
  },
  it: {
    everyone_full: 'Tutti vedono tutto',
    guild_members_non_text: 'I membri vedono solo risultati non testuali',
    eligible_non_text: 'I rispondenti idonei vedono solo risultati non testuali',
    managers_only: 'Risultati riservati ai gestori',
    custom: 'Configurazione personalizzata',
  },
  ru: {
    everyone_full: 'Все видят всё',
    guild_members_non_text: 'Участники видят только результаты без текста',
    eligible_non_text: 'Допущенные респонденты видят только результаты без текста',
    managers_only: 'Результаты только для менеджеров',
    custom: 'Пользовательская конфигурация',
  },
  'zh-TW': {
    everyone_full: '所有人都能查看全部',
    guild_members_non_text: '公會成員只看非文字結果',
    eligible_non_text: '符合資格的回覆者只看非文字結果',
    managers_only: '結果僅限管理者',
    custom: '自訂設定',
  },
  ko: {
    everyone_full: '모두 모든 결과 보기',
    guild_members_non_text: '길드 멤버는 텍스트 제외 결과만 보기',
    eligible_non_text: '응답 대상자는 텍스트 제외 결과만 보기',
    managers_only: '결과는 관리자 전용',
    custom: '사용자 지정 설정',
  },
};

const BASE_AUDIENCE_LABELS: Record<string, Record<PollResultsBaseAudience, string>> = {
  en: {
    guild_members: 'Guild members',
    eligible_respondents: 'Eligible respondents',
    restricted: 'Managers only',
  },
  fr: {
    guild_members: 'Membres de guilde',
    eligible_respondents: 'Répondants éligibles',
    restricted: 'Réservé aux gestionnaires',
  },
  de: {
    guild_members: 'Gildenmitglieder',
    eligible_respondents: 'Berechtigte Antwortende',
    restricted: 'Nur Manager',
  },
  es: {
    guild_members: 'Miembros de la hermandad',
    eligible_respondents: 'Encuestados elegibles',
    restricted: 'Solo gestores',
  },
  'pt-BR': {
    guild_members: 'Membros da guilda',
    eligible_respondents: 'Respondentes elegíveis',
    restricted: 'Somente gestores',
  },
  it: {
    guild_members: 'Membri della gilda',
    eligible_respondents: 'Rispondenti idonei',
    restricted: 'Solo gestori',
  },
  ru: {
    guild_members: 'Участники гильдии',
    eligible_respondents: 'Допущенные респонденты',
    restricted: 'Только менеджеры',
  },
  'zh-TW': {
    guild_members: '公會成員',
    eligible_respondents: '符合資格的回覆者',
    restricted: '僅管理者',
  },
  ko: {
    guild_members: '길드 멤버',
    eligible_respondents: '응답 대상자',
    restricted: '관리자 전용',
  },
};

const VISIBILITY_LABELS: Record<string, Record<PollResultsVisibilityLevel, string>> = {
  en: {
    none: 'Hidden',
    non_text: 'Visible except free text',
    full: 'Fully visible',
  },
  fr: {
    none: 'Masqué',
    non_text: 'Visible sauf texte libre',
    full: 'Visible entièrement',
  },
  de: {
    none: 'Ausgeblendet',
    non_text: 'Sichtbar außer Freitext',
    full: 'Vollständig sichtbar',
  },
  es: {
    none: 'Oculto',
    non_text: 'Visible excepto texto libre',
    full: 'Totalmente visible',
  },
  'pt-BR': {
    none: 'Oculto',
    non_text: 'Visível exceto texto livre',
    full: 'Totalmente visível',
  },
  it: {
    none: 'Nascosto',
    non_text: 'Visibile tranne testo libero',
    full: 'Completamente visibile',
  },
  ru: {
    none: 'Скрыто',
    non_text: 'Видно, кроме свободного текста',
    full: 'Полностью видно',
  },
  'zh-TW': {
    none: '隱藏',
    non_text: '可見但不含自由文字',
    full: '完整可見',
  },
  ko: {
    none: '숨김',
    non_text: '자유 텍스트 제외 표시',
    full: '전체 표시',
  },
};

const AUDIENCE_TYPE_LABELS: Record<string, Record<PollResultsAudienceType, string>> = {
  en: {
    base_audience: 'Same audience as global policy',
    rank_range: 'Selected ranks',
    user: 'Specific user',
  },
  fr: {
    base_audience: 'Même audience que la politique globale',
    rank_range: 'Rangs sélectionnés',
    user: 'Utilisateur précis',
  },
  de: {
    base_audience: 'Gleiche Zielgruppe wie globale Richtlinie',
    rank_range: 'Ausgewählte Ränge',
    user: 'Bestimmter Benutzer',
  },
  es: {
    base_audience: 'Misma audiencia que la política global',
    rank_range: 'Rangos seleccionados',
    user: 'Usuario específico',
  },
  'pt-BR': {
    base_audience: 'Mesma audiência da política global',
    rank_range: 'Ranques selecionados',
    user: 'Usuário específico',
  },
  it: {
    base_audience: 'Stessa audience della policy globale',
    rank_range: 'Ranghi selezionati',
    user: 'Utente specifico',
  },
  ru: {
    base_audience: 'Та же аудитория, что и глобальная политика',
    rank_range: 'Выбранные ранги',
    user: 'Конкретный пользователь',
  },
  'zh-TW': {
    base_audience: '同全域政策對象',
    rank_range: '指定階級',
    user: '特定使用者',
  },
  ko: {
    base_audience: '전체 정책과 같은 대상',
    rank_range: '선택한 등급',
    user: '특정 사용자',
  },
};

const TARGET_TYPE_LABELS: Record<string, Record<PollResultsTargetType, string>> = {
  en: {
    poll: 'Entire poll',
    section: 'One section',
    question: 'One question',
    question_type: 'All questions of this type',
  },
  fr: {
    poll: 'Tout le sondage',
    section: 'Une section',
    question: 'Une question',
    question_type: 'Toutes les questions de ce type',
  },
  de: {
    poll: 'Gesamte Umfrage',
    section: 'Ein Abschnitt',
    question: 'Eine Frage',
    question_type: 'Alle Fragen dieses Typs',
  },
  es: {
    poll: 'Toda la encuesta',
    section: 'Una sección',
    question: 'Una pregunta',
    question_type: 'Todas las preguntas de este tipo',
  },
  'pt-BR': {
    poll: 'Toda a enquete',
    section: 'Uma seção',
    question: 'Uma pergunta',
    question_type: 'Todas as perguntas deste tipo',
  },
  it: {
    poll: 'Tutto il sondaggio',
    section: 'Una sezione',
    question: 'Una domanda',
    question_type: 'Tutte le domande di questo tipo',
  },
  ru: {
    poll: 'Весь опрос',
    section: 'Один раздел',
    question: 'Один вопрос',
    question_type: 'Все вопросы этого типа',
  },
  'zh-TW': {
    poll: '整份投票',
    section: '單一章節',
    question: '單一問題',
    question_type: '此類型的所有問題',
  },
  ko: {
    poll: '전체 투표',
    section: '한 섹션',
    question: '한 질문',
    question_type: '이 유형의 모든 질문',
  },
};

const QUESTION_TYPE_LABELS: Record<string, Record<PollQuestionType, string>> = {
  en: {
    single_choice: 'Single choice',
    multiple_choice: 'Multiple choice',
    text: 'Free text',
    rating: 'Rating',
    date: 'Date',
    time: 'Time',
    datetime: 'Date and time',
    ranking: 'Ranking',
    scale: 'Scale',
  },
  fr: {
    single_choice: 'Choix unique',
    multiple_choice: 'Choix multiple',
    text: 'Texte libre',
    rating: 'Note',
    date: 'Date',
    time: 'Heure',
    datetime: 'Date et heure',
    ranking: 'Classement',
    scale: 'Échelle',
  },
  de: {
    single_choice: 'Einzelauswahl',
    multiple_choice: 'Mehrfachauswahl',
    text: 'Freitext',
    rating: 'Bewertung',
    date: 'Datum',
    time: 'Zeit',
    datetime: 'Datum und Uhrzeit',
    ranking: 'Ranking',
    scale: 'Skala',
  },
  es: {
    single_choice: 'Selección única',
    multiple_choice: 'Selección múltiple',
    text: 'Texto libre',
    rating: 'Valoración',
    date: 'Fecha',
    time: 'Hora',
    datetime: 'Fecha y hora',
    ranking: 'Ranking',
    scale: 'Escala',
  },
  'pt-BR': {
    single_choice: 'Escolha única',
    multiple_choice: 'Escolha múltipla',
    text: 'Texto livre',
    rating: 'Avaliação',
    date: 'Data',
    time: 'Hora',
    datetime: 'Data e hora',
    ranking: 'Ranking',
    scale: 'Escala',
  },
  it: {
    single_choice: 'Scelta singola',
    multiple_choice: 'Scelta multipla',
    text: 'Testo libero',
    rating: 'Valutazione',
    date: 'Data',
    time: 'Ora',
    datetime: 'Data e ora',
    ranking: 'Ranking',
    scale: 'Scala',
  },
  ru: {
    single_choice: 'Один вариант',
    multiple_choice: 'Несколько вариантов',
    text: 'Свободный текст',
    rating: 'Оценка',
    date: 'Дата',
    time: 'Время',
    datetime: 'Дата и время',
    ranking: 'Рейтинг',
    scale: 'Шкала',
  },
  'zh-TW': {
    single_choice: '單選',
    multiple_choice: '複選',
    text: '自由文字',
    rating: '評分',
    date: '日期',
    time: '時間',
    datetime: '日期與時間',
    ranking: '排序',
    scale: '量表',
  },
  ko: {
    single_choice: '단일 선택',
    multiple_choice: '복수 선택',
    text: '자유 텍스트',
    rating: '평점',
    date: '날짜',
    time: '시간',
    datetime: '날짜 및 시간',
    ranking: '순위',
    scale: '척도',
  },
};

const CANONICAL_SUMMARIES: Record<string, Record<Exclude<PollResultsVisibilityPreset, 'custom'>, string>> = {
  en: {
    everyone_full: 'Guild members can see all results.',
    guild_members_non_text: 'Guild members can see all results except free-text answers.',
    eligible_non_text: 'Only eligible respondents can see non-text results.',
    managers_only: 'Only poll managers can see results.',
  },
  fr: {
    everyone_full: 'Les membres de guilde voient tous les résultats.',
    guild_members_non_text: 'Les membres de guilde voient tous les résultats sauf les réponses en texte libre.',
    eligible_non_text: 'Seuls les répondants éligibles voient les résultats non textuels.',
    managers_only: 'Seuls les gestionnaires du sondage voient les résultats.',
  },
  de: {
    everyone_full: 'Gildenmitglieder können alle Ergebnisse sehen.',
    guild_members_non_text: 'Gildenmitglieder können alle Ergebnisse außer Freitextantworten sehen.',
    eligible_non_text: 'Nur berechtigte Antwortende können Nicht-Text-Ergebnisse sehen.',
    managers_only: 'Nur Umfragemanager können Ergebnisse sehen.',
  },
  es: {
    everyone_full: 'Los miembros de la hermandad pueden ver todos los resultados.',
    guild_members_non_text: 'Los miembros de la hermandad pueden ver todos los resultados excepto respuestas de texto libre.',
    eligible_non_text: 'Solo los encuestados elegibles pueden ver resultados sin texto.',
    managers_only: 'Solo los gestores de la encuesta pueden ver resultados.',
  },
  'pt-BR': {
    everyone_full: 'Membros da guilda podem ver todos os resultados.',
    guild_members_non_text: 'Membros da guilda podem ver todos os resultados exceto respostas de texto livre.',
    eligible_non_text: 'Somente respondentes elegíveis podem ver resultados sem texto.',
    managers_only: 'Somente gestores da enquete podem ver os resultados.',
  },
  it: {
    everyone_full: 'I membri della gilda possono vedere tutti i risultati.',
    guild_members_non_text: 'I membri della gilda possono vedere tutti i risultati tranne le risposte a testo libero.',
    eligible_non_text: 'Solo i rispondenti idonei possono vedere i risultati non testuali.',
    managers_only: 'Solo i gestori del sondaggio possono vedere i risultati.',
  },
  ru: {
    everyone_full: 'Участники гильдии могут видеть все результаты.',
    guild_members_non_text: 'Участники гильдии могут видеть все результаты, кроме ответов свободным текстом.',
    eligible_non_text: 'Только допущенные респонденты могут видеть результаты без текста.',
    managers_only: 'Только менеджеры опроса могут видеть результаты.',
  },
  'zh-TW': {
    everyone_full: '公會成員可以查看所有結果。',
    guild_members_non_text: '公會成員可以查看所有結果，但不含自由文字答案。',
    eligible_non_text: '只有符合資格的回覆者可以查看非文字結果。',
    managers_only: '只有投票管理者可以查看結果。',
  },
  ko: {
    everyone_full: '길드 멤버는 모든 결과를 볼 수 있습니다.',
    guild_members_non_text: '길드 멤버는 자유 텍스트 답변을 제외한 모든 결과를 볼 수 있습니다.',
    eligible_non_text: '응답 대상자만 텍스트 제외 결과를 볼 수 있습니다.',
    managers_only: '투표 관리자만 결과를 볼 수 있습니다.',
  },
};

const PLURAL_VERBS: Record<
  string,
  Record<PollResultsVisibilityLevel, { singular: string; plural: string }>
> = {
  en: {
    none: { singular: 'is hidden', plural: 'are hidden' },
    non_text: { singular: 'is visible except free text', plural: 'are visible except free text' },
    full: { singular: 'is fully visible', plural: 'are fully visible' },
  },
  fr: {
    none: { singular: 'est masqué', plural: 'sont masqués' },
    non_text: { singular: 'est visible sauf texte libre', plural: 'sont visibles sauf texte libre' },
    full: { singular: 'est visible entièrement', plural: 'sont visibles entièrement' },
  },
  de: {
    none: { singular: 'ist ausgeblendet', plural: 'sind ausgeblendet' },
    non_text: { singular: 'ist außer Freitext sichtbar', plural: 'sind außer Freitext sichtbar' },
    full: { singular: 'ist vollständig sichtbar', plural: 'sind vollständig sichtbar' },
  },
  es: {
    none: { singular: 'está oculto', plural: 'están ocultas' },
    non_text: { singular: 'es visible excepto texto libre', plural: 'son visibles excepto texto libre' },
    full: { singular: 'es totalmente visible', plural: 'son totalmente visibles' },
  },
  'pt-BR': {
    none: { singular: 'fica oculto', plural: 'ficam ocultas' },
    non_text: { singular: 'fica visível exceto texto livre', plural: 'ficam visíveis exceto texto livre' },
    full: { singular: 'fica totalmente visível', plural: 'ficam totalmente visíveis' },
  },
  it: {
    none: { singular: 'è nascosto', plural: 'sono nascoste' },
    non_text: { singular: 'è visibile tranne testo libero', plural: 'sono visibili tranne testo libero' },
    full: { singular: 'è completamente visibile', plural: 'sono completamente visibili' },
  },
  ru: {
    none: { singular: 'скрыт', plural: 'скрыты' },
    non_text: { singular: 'виден, кроме свободного текста', plural: 'видны, кроме свободного текста' },
    full: { singular: 'полностью виден', plural: 'полностью видны' },
  },
  'zh-TW': {
    none: { singular: '已隱藏', plural: '已隱藏' },
    non_text: { singular: '可見，但不含自由文字', plural: '可見，但不含自由文字' },
    full: { singular: '完整可見', plural: '完整可見' },
  },
  ko: {
    none: { singular: '숨겨집니다', plural: '숨겨집니다' },
    non_text: { singular: '자유 텍스트를 제외하고 표시됩니다', plural: '자유 텍스트를 제외하고 표시됩니다' },
    full: { singular: '전체 표시됩니다', plural: '전체 표시됩니다' },
  },
};

type AudienceSubjectFormatter = (
  min: number,
  max: number,
  memberName: string | undefined,
) => string;

const AUDIENCE_SUBJECT_FORMATTERS: Record<
  string,
  Record<PollResultsAudienceType, AudienceSubjectFormatter>
> = {
  en: {
    base_audience: () => 'For the same audience as the global policy',
    rank_range: (min, max) => (min === max ? `For rank ${min}` : `For ranks ${min} to ${max}`),
    user: (_min, _max, memberName) => `For ${memberName || 'this user'}`,
  },
  fr: {
    base_audience: () => 'Pour la même audience que la politique globale',
    rank_range: (min, max) => (min === max ? `Pour le rang ${min}` : `Pour les rangs ${min} à ${max}`),
    user: (_min, _max, memberName) => `Pour ${memberName || 'cet utilisateur'}`,
  },
  de: {
    base_audience: () => 'Für die gleiche Zielgruppe wie die globale Richtlinie',
    rank_range: (min, max) => (min === max ? `Für Rang ${min}` : `Für Ränge ${min} bis ${max}`),
    user: (_min, _max, memberName) => `Für ${memberName || 'diesen Benutzer'}`,
  },
  es: {
    base_audience: () => 'Para la misma audiencia que la política global',
    rank_range: (min, max) => (min === max ? `Para el rango ${min}` : `Para los rangos ${min} a ${max}`),
    user: (_min, _max, memberName) => `Para ${memberName || 'este usuario'}`,
  },
  'pt-BR': {
    base_audience: () => 'Para a mesma audiência da política global',
    rank_range: (min, max) => (min === max ? `Para o ranque ${min}` : `Para os ranques ${min} a ${max}`),
    user: (_min, _max, memberName) => `Para ${memberName || 'este usuário'}`,
  },
  it: {
    base_audience: () => 'Per la stessa audience della policy globale',
    rank_range: (min, max) => (min === max ? `Per il rango ${min}` : `Per i ranghi da ${min} a ${max}`),
    user: (_min, _max, memberName) => `Per ${memberName || 'questo utente'}`,
  },
  ru: {
    base_audience: () => 'Для той же аудитории, что и глобальная политика',
    rank_range: (min, max) => (min === max ? `Для ранга ${min}` : `Для рангов ${min}-${max}`),
    user: (_min, _max, memberName) => `Для ${memberName || 'этого пользователя'}`,
  },
  'zh-TW': {
    base_audience: () => '對同全域政策的對象',
    rank_range: (min, max) => (min === max ? `對階級 ${min}` : `對階級 ${min} 到 ${max}`),
    user: (_min, _max, memberName) => `對 ${memberName || '此使用者'}`,
  },
  ko: {
    base_audience: () => '전체 정책과 같은 대상에 대해',
    rank_range: (min, max) => (min === max ? `등급 ${min}에 대해` : `등급 ${min}-${max}에 대해`),
    user: (_min, _max, memberName) => `${memberName || '이 사용자'}에 대해`,
  },
};

const POLL_TARGET_LABELS: Record<string, string> = {
  en: 'the whole poll',
  fr: 'tout le sondage',
  de: 'die gesamte Umfrage',
  es: 'toda la encuesta',
  'pt-BR': 'toda a enquete',
  it: 'tutto il sondaggio',
  ru: 'весь опрос',
  'zh-TW': '整份投票',
  ko: '전체 투표',
};

const UNKNOWN_LABELS: Record<string, { section: string; question: string }> = {
  en: { section: 'unknown', question: 'unknown' },
  fr: { section: 'inconnue', question: 'inconnue' },
  de: { section: 'unbekannt', question: 'unbekannt' },
  es: { section: 'desconocida', question: 'desconocida' },
  'pt-BR': { section: 'desconhecida', question: 'desconhecida' },
  it: { section: 'sconosciuta', question: 'sconosciuta' },
  ru: { section: 'неизвестно', question: 'неизвестно' },
  'zh-TW': { section: '未知', question: '未知' },
  ko: { section: '알 수 없음', question: '알 수 없음' },
};

const QUICK_PRESET_LABELS: Record<string, Record<QuickExceptionPreset, string>> = {
  en: {
    mask_text: 'Hide all free text',
    open_section: 'Open one section',
    open_question: 'Open one question',
    grant_rank: 'Grant access to a rank',
    grant_user: 'Grant access to a user',
  },
  fr: {
    mask_text: 'Masquer tout le texte libre',
    open_section: 'Ouvrir une section',
    open_question: 'Ouvrir une question',
    grant_rank: 'Accorder un accès à un rang',
    grant_user: 'Accorder un accès à un utilisateur',
  },
  de: {
    mask_text: 'Alle Freitexte ausblenden',
    open_section: 'Einen Abschnitt öffnen',
    open_question: 'Eine Frage öffnen',
    grant_rank: 'Zugriff für einen Rang erlauben',
    grant_user: 'Zugriff für einen Benutzer erlauben',
  },
  es: {
    mask_text: 'Ocultar todo el texto libre',
    open_section: 'Abrir una sección',
    open_question: 'Abrir una pregunta',
    grant_rank: 'Dar acceso a un rango',
    grant_user: 'Dar acceso a un usuario',
  },
  'pt-BR': {
    mask_text: 'Ocultar todo texto livre',
    open_section: 'Abrir uma seção',
    open_question: 'Abrir uma pergunta',
    grant_rank: 'Conceder acesso a um ranque',
    grant_user: 'Conceder acesso a um usuário',
  },
  it: {
    mask_text: 'Nascondi tutto il testo libero',
    open_section: 'Apri una sezione',
    open_question: 'Apri una domanda',
    grant_rank: 'Concedi accesso a un rango',
    grant_user: 'Concedi accesso a un utente',
  },
  ru: {
    mask_text: 'Скрыть весь свободный текст',
    open_section: 'Открыть один раздел',
    open_question: 'Открыть один вопрос',
    grant_rank: 'Дать доступ рангу',
    grant_user: 'Дать доступ пользователю',
  },
  'zh-TW': {
    mask_text: '隱藏所有自由文字',
    open_section: '開放一個章節',
    open_question: '開放一個問題',
    grant_rank: '授予階級存取權',
    grant_user: '授予使用者存取權',
  },
  ko: {
    mask_text: '모든 자유 텍스트 숨기기',
    open_section: '한 섹션 열기',
    open_question: '한 질문 열기',
    grant_rank: '등급에 접근 권한 부여',
    grant_user: '사용자에게 접근 권한 부여',
  },
};

const normalizeRule = (rule: PollResultsAccessRule) => {
  const normalized: Record<string, string | number | undefined> = {
    audience_type: rule.audience_type,
    visibility_level: rule.visibility_level,
    target_type: rule.target_type,
  };

  if (rule.audience_type === 'rank_range') {
    normalized.min_rank_index = rule.min_rank_index ?? 0;
    normalized.max_rank_index = rule.max_rank_index ?? rule.min_rank_index ?? 0;
  }

  if (rule.audience_type === 'user') {
    normalized.user_id = rule.user_id ?? '';
  }

  if (rule.target_type === 'section') {
    normalized.section_id = rule.section_id ?? '';
  }

  if (rule.target_type === 'question') {
    normalized.question_id = rule.question_id ?? '';
  }

  if (rule.target_type === 'question_type') {
    normalized.question_type = rule.question_type ?? '';
  }

  return normalized;
};

const sortRules = (rules: PollResultsAccessRule[]) =>
  [...rules]
    .map((rule) => normalizeRule(rule))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

const configsMatch = (left: PollResultsAccessConfig, right: PollResultsAccessConfig) => {
  if (left.base_audience !== right.base_audience || left.base_visibility !== right.base_visibility) {
    return false;
  }

  const leftRules = sortRules(left.rules);
  const rightRules = sortRules(right.rules);

  if (leftRules.length !== rightRules.length) {
    return false;
  }

  return leftRules.every((rule, index) => JSON.stringify(rule) === JSON.stringify(rightRules[index]));
};

const getPluralVerb = (level: PollResultsVisibilityLevel, plural: boolean, language: string) => {
  const verb = PLURAL_VERBS[language]?.[level] ?? PLURAL_VERBS.en[level];
  return plural ? verb.plural : verb.singular;
};

export const getVisibilityPreset = (config: PollResultsAccessConfig): PollResultsVisibilityPreset => {
  for (const [preset, presetConfig] of Object.entries(PRESET_CONFIGS) as Array<
    [Exclude<PollResultsVisibilityPreset, 'custom'>, PollResultsAccessConfig]
  >) {
    if (configsMatch(config, presetConfig)) {
      return preset;
    }
  }

  return 'custom';
};

export const buildConfigFromPreset = (preset: Exclude<PollResultsVisibilityPreset, 'custom'>): PollResultsAccessConfig => {
  const config = PRESET_CONFIGS[preset];
  return {
    base_audience: config.base_audience,
    base_visibility: config.base_visibility,
    rules: config.rules.map((rule) => ({ ...rule })),
  };
};

export const getPresetLabel = (preset: PollResultsVisibilityPreset, language: string) => {
  return PRESET_LABELS[language]?.[preset] ?? PRESET_LABELS.en[preset];
};

export const getBaseAudienceLabel = (value: PollResultsBaseAudience, language: string) => {
  return BASE_AUDIENCE_LABELS[language]?.[value] ?? BASE_AUDIENCE_LABELS.en[value];
};

export const getVisibilityLabel = (level: PollResultsVisibilityLevel, language: string) => {
  return VISIBILITY_LABELS[language]?.[level] ?? VISIBILITY_LABELS.en[level];
};

export const getAudienceTypeLabel = (type: PollResultsAudienceType, language: string) => {
  return AUDIENCE_TYPE_LABELS[language]?.[type] ?? AUDIENCE_TYPE_LABELS.en[type];
};

export const getTargetTypeLabel = (type: PollResultsTargetType, language: string) => {
  return TARGET_TYPE_LABELS[language]?.[type] ?? TARGET_TYPE_LABELS.en[type];
};

export const getQuestionTypeLabel = (value: PollQuestionType, language: string) => {
  return QUESTION_TYPE_LABELS[language]?.[value] ?? QUESTION_TYPE_LABELS.en[value];
};

export const getCanonicalSummary = (config: PollResultsAccessConfig, language: string) => {
  const preset = getVisibilityPreset(config);

  if (preset !== 'custom') {
    return CANONICAL_SUMMARIES[language]?.[preset] ?? CANONICAL_SUMMARIES.en[preset];
  }

  const ruleCount = config.rules.length;

  if (language === 'fr') {
    const audience = getBaseAudienceLabel(config.base_audience, language).toLowerCase();
    const visibility = getVisibilityLabel(config.base_visibility, language).toLowerCase();
    return `Configuration personnalisée : ${audience}, accès ${visibility}${ruleCount > 0 ? `, ${ruleCount} exception${ruleCount > 1 ? 's' : ''}` : ''}.`;
  }

  if (language === 'zh-TW') {
    return `自訂設定：${ruleCount} 個例外。`;
  }

  if (language === 'ko') {
    return `사용자 지정 설정: 예외 ${ruleCount}개.`;
  }

  if (language === 'ru') {
    return `Пользовательская конфигурация: ${ruleCount} исключ.`;
  }

  if (language === 'de') {
    return `Benutzerdefinierte Konfiguration mit ${ruleCount} Ausnahme${ruleCount === 1 ? '' : 'n'}.`;
  }

  if (language === 'es') {
    return `Configuración personalizada con ${ruleCount} excepción${ruleCount === 1 ? '' : 'es'}.`;
  }

  if (language === 'pt-BR') {
    return `Configuração personalizada com ${ruleCount} exceção${ruleCount === 1 ? '' : 'ões'}.`;
  }

  if (language === 'it') {
    return `Configurazione personalizzata con ${ruleCount} eccezion${ruleCount === 1 ? 'e' : 'i'}.`;
  }

  return `Custom configuration with ${ruleCount} override${ruleCount === 1 ? '' : 's'}.`;
};

const describeAudienceSubject = (
  rule: PollResultsAccessRule,
  language: string,
  members: ResultsAccessMemberOption[],
) => {
  const min = rule.min_rank_index ?? 0;
  const max = rule.max_rank_index ?? min;
  const member = members.find((item) => item.user_id === rule.user_id);
  const formatter =
    AUDIENCE_SUBJECT_FORMATTERS[language]?.[rule.audience_type] ??
    AUDIENCE_SUBJECT_FORMATTERS.en[rule.audience_type];
  return formatter(min, max, member?.username);
};

const describePollTarget = (language: string) => {
  return { label: POLL_TARGET_LABELS[language] ?? POLL_TARGET_LABELS.en, plural: false };
};

const describeSectionTarget = (
  rule: PollResultsAccessRule,
  language: string,
  sections: ResultsAccessSectionOption[],
) => {
  const section = sections.find((item) => item.id === rule.section_id);
  const unknown = UNKNOWN_LABELS[language]?.section ?? UNKNOWN_LABELS.en.section;

  if (language === 'zh-TW') return { label: `章節「${section?.title || unknown}」`, plural: false };

  const prefixByLanguage: Record<string, string> = {
    en: 'section',
    fr: 'la section',
    de: 'Abschnitt',
    es: 'la sección',
    'pt-BR': 'a seção',
    it: 'la sezione',
    ru: 'раздел',
    ko: '섹션',
  };

  return { label: `${prefixByLanguage[language] ?? prefixByLanguage.en} "${section?.title || unknown}"`, plural: false };
};

const describeQuestionTarget = (
  rule: PollResultsAccessRule,
  language: string,
  questions: ResultsAccessQuestionOption[],
) => {
  const question = questions.find((item) => item.id === rule.question_id);
  const unknown = UNKNOWN_LABELS[language]?.question ?? UNKNOWN_LABELS.en.question;

  if (language === 'zh-TW') return { label: `問題「${question?.question_text || unknown}」`, plural: false };

  const prefixByLanguage: Record<string, string> = {
    en: 'question',
    fr: 'la question',
    de: 'Frage',
    es: 'la pregunta',
    'pt-BR': 'a pergunta',
    it: 'la domanda',
    ru: 'вопрос',
    ko: '질문',
  };

  return { label: `${prefixByLanguage[language] ?? prefixByLanguage.en} "${question?.question_text || unknown}"`, plural: false };
};

const describeQuestionTypeTarget = (rule: PollResultsAccessRule, language: string) => {
  const questionType = getQuestionTypeLabel(rule.question_type || 'single_choice', language);

  if (language === 'zh-TW') return { label: `${questionType}問題`, plural: true };
  if (language === 'ko') return { label: `${questionType} 질문`, plural: true };
  if (language === 'ru') return { label: `вопросы типа ${questionType.toLowerCase()}`, plural: true };
  if (language === 'de') return { label: `Fragen vom Typ ${questionType.toLowerCase()}`, plural: true };
  if (language === 'es') return { label: `las preguntas de tipo ${questionType.toLowerCase()}`, plural: true };
  if (language === 'pt-BR') return { label: `perguntas do tipo ${questionType.toLowerCase()}`, plural: true };
  if (language === 'it') return { label: `le domande di tipo ${questionType.toLowerCase()}`, plural: true };
  return {
    label: language === 'fr' ? `les questions de type ${questionType.toLowerCase()}` : `${questionType.toLowerCase()} questions`,
    plural: true,
  };
};

const describeTargetSubject = (
  rule: PollResultsAccessRule,
  language: string,
  sections: ResultsAccessSectionOption[],
  questions: ResultsAccessQuestionOption[],
) => {
  if (rule.target_type === 'poll') {
    return describePollTarget(language);
  }

  if (rule.target_type === 'section') {
    return describeSectionTarget(rule, language, sections);
  }

  if (rule.target_type === 'question') {
    return describeQuestionTarget(rule, language, questions);
  }

  return describeQuestionTypeTarget(rule, language);
};

export const describeRule = (rule: PollResultsAccessRule, context: DescribeRuleContext) => {
  const { language, members = [], sections = [], questions = [] } = context;
  const audienceSubject = describeAudienceSubject(rule, language, members);
  const targetSubject = describeTargetSubject(rule, language, sections, questions);

  return `${audienceSubject}, ${targetSubject.label} ${getPluralVerb(rule.visibility_level, targetSubject.plural, language)}.`;
};

export const createQuickRule = (preset: QuickExceptionPreset, context: QuickRuleContext): PollResultsAccessRule => {
  if (preset === 'mask_text') {
    return { ...PRESET_RULE_NON_TEXT };
  }

  if (preset === 'open_section') {
    return {
      audience_type: 'base_audience',
      visibility_level: 'full',
      target_type: 'section',
      section_id: context.sections[0]?.id,
    };
  }

  if (preset === 'open_question') {
    return {
      audience_type: 'base_audience',
      visibility_level: 'full',
      target_type: 'question',
      question_id: context.questions[0]?.id,
    };
  }

  if (preset === 'grant_rank') {
    const rankIndex = context.ranks[0]?.rank_index ?? 0;
    return {
      audience_type: 'rank_range',
      visibility_level: 'full',
      target_type: 'poll',
      min_rank_index: rankIndex,
      max_rank_index: rankIndex,
    };
  }

  return {
    audience_type: 'user',
    visibility_level: 'full',
    target_type: 'poll',
    user_id: context.members[0]?.user_id,
  };
};

export const getQuickPresetLabel = (preset: QuickExceptionPreset, language: string) => {
  return QUICK_PRESET_LABELS[language]?.[preset] ?? QUICK_PRESET_LABELS.en[preset];
};

export const hasQuickPresetData = (preset: QuickExceptionPreset, context: QuickRuleContext) => {
  if (preset === 'open_section') return context.sections.length > 0;
  if (preset === 'open_question') return context.questions.length > 0;
  if (preset === 'grant_rank') return context.ranks.length > 0;
  if (preset === 'grant_user') return context.members.length > 0;
  return true;
};
