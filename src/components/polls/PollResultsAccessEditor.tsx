import {
  ChevronDown,
  ChevronRight,
  Eye,
  Filter,
  Plus,
  Shield,
  Trash2,
  UserCircle,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import type {
  PollQuestionType,
  PollResultsAccessConfig,
  PollResultsAccessRule,
  PollResultsAudienceType,
  PollResultsBaseAudience,
  PollResultsTargetType,
  PollResultsVisibilityLevel,
} from '@/types/poll';

import {
  buildConfigFromPreset,
  createQuickRule,
  describeRule,
  getAudienceTypeLabel,
  getBaseAudienceLabel,
  getCanonicalSummary,
  getPresetLabel,
  getQuestionTypeLabel,
  getQuickPresetLabel,
  getTargetTypeLabel,
  getVisibilityLabel,
  getVisibilityPreset,
  hasQuickPresetData,
  type PollResultsVisibilityPreset,
  type QuickExceptionPreset,
  type ResultsAccessMemberOption,
  type ResultsAccessQuestionOption,
  type ResultsAccessRankOption,
  type ResultsAccessSectionOption,
} from '@/components/polls/pollResultsAccessUx';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

export type ResultsAccessRule = PollResultsAccessRule;
export type ResultsAccessConfig = PollResultsAccessConfig;

interface PollResultsAccessEditorProps {
  config: ResultsAccessConfig;
  members: ResultsAccessMemberOption[];
  ranks: ResultsAccessRankOption[];
  sections: ResultsAccessSectionOption[];
  questions: ResultsAccessQuestionOption[];
  onChange: (config: ResultsAccessConfig) => void;
}

const BASE_AUDIENCES: PollResultsBaseAudience[] = ['guild_members', 'eligible_respondents', 'restricted'];
const BASE_VISIBILITIES: PollResultsVisibilityLevel[] = ['none', 'non_text', 'full'];
const TARGET_TYPES: PollResultsTargetType[] = ['poll', 'section', 'question', 'question_type'];
const AUDIENCE_TYPES: PollResultsAudienceType[] = ['base_audience', 'rank_range', 'user'];
const ALL_QUESTION_TYPES: PollQuestionType[] = ['single_choice', 'multiple_choice', 'text', 'rating', 'date', 'time', 'datetime', 'ranking', 'scale'];
const QUICK_PRESETS: QuickExceptionPreset[] = ['mask_text', 'open_section', 'open_question', 'grant_rank', 'grant_user'];
const GLOBAL_PRESETS: PollResultsVisibilityPreset[] = [
  'everyone_full',
  'guild_members_non_text',
  'eligible_non_text',
  'managers_only',
  'custom',
];

const RESULTS_ACCESS_COPY = {
  en: {
    minRank: 'Minimum rank',
    maxRank: 'Maximum rank',
    user: 'User',
    selectMember: 'Select a member',
    section: 'Section',
    selectSection: 'Select a section',
    question: 'Question',
    selectQuestion: 'Select a question',
    questionType: 'Question type',
    title: 'Results visibility',
    description: 'Choose a simple policy first, then open expert mode only for granular exceptions.',
    globalPolicy: 'Global policy',
    canonicalSummary: 'Canonical summary',
    systemRules: 'System rules',
    systemRulesText: 'Guild GMs and members with manage_polls always see all results.',
    advancedExceptions: 'Advanced exceptions',
    advancedDescription: 'Adjust audience, zone, and access only for special cases.',
    addException: 'Add exception',
    closeExpertMode: 'Close expert mode',
    openExpertMode: 'Open expert mode',
    globalAudience: 'Global audience',
    defaultAccess: 'Default access',
    noException: 'No exception. Results follow the global policy only.',
    exception: 'Exception',
    deleteException: 'Delete exception',
    who: 'Who',
    zone: 'Zone',
    access: 'Access',
  },
  fr: {
    minRank: 'Rang minimum',
    maxRank: 'Rang maximum',
    user: 'Utilisateur',
    selectMember: 'Sélectionner un membre',
    section: 'Section',
    selectSection: 'Sélectionner une section',
    question: 'Question',
    selectQuestion: 'Sélectionner une question',
    questionType: 'Type de question',
    title: 'Visibilité des résultats',
    description: 'Choisissez une politique simple, puis ouvrez le mode expert uniquement pour les exceptions.',
    globalPolicy: 'Politique globale',
    canonicalSummary: 'Résumé canonique',
    systemRules: 'Règles système',
    systemRulesText: 'Les GM et les membres avec manage_polls voient toujours tous les résultats.',
    advancedExceptions: 'Exceptions avancées',
    advancedDescription: 'Ajustez l’audience, la zone et l’accès uniquement pour les cas spéciaux.',
    addException: 'Ajouter une exception',
    closeExpertMode: 'Fermer le mode expert',
    openExpertMode: 'Ouvrir le mode expert',
    globalAudience: 'Audience globale',
    defaultAccess: 'Accès par défaut',
    noException: 'Aucune exception. Les résultats suivent uniquement la politique globale.',
    exception: 'Exception',
    deleteException: "Supprimer l'exception",
    who: 'Qui',
    zone: 'Zone',
    access: 'Accès',
  },
  de: {
    minRank: 'Mindestrang',
    maxRank: 'Maximaler Rang',
    user: 'Benutzer',
    selectMember: 'Mitglied auswählen',
    section: 'Abschnitt',
    selectSection: 'Abschnitt auswählen',
    question: 'Frage',
    selectQuestion: 'Frage auswählen',
    questionType: 'Fragetyp',
    title: 'Sichtbarkeit der Ergebnisse',
    description: 'Wähle zuerst eine einfache Richtlinie und öffne den Expertenmodus nur für granulare Ausnahmen.',
    globalPolicy: 'Globale Richtlinie',
    canonicalSummary: 'Kanonische Zusammenfassung',
    systemRules: 'Systemregeln',
    systemRulesText: 'Gilden-GMs und Mitglieder mit manage_polls sehen immer alle Ergebnisse.',
    advancedExceptions: 'Erweiterte Ausnahmen',
    advancedDescription: 'Passe Zielgruppe, Bereich und Zugriff nur für Sonderfälle an.',
    addException: 'Ausnahme hinzufügen',
    closeExpertMode: 'Expertenmodus schließen',
    openExpertMode: 'Expertenmodus öffnen',
    globalAudience: 'Globale Zielgruppe',
    defaultAccess: 'Standardzugriff',
    noException: 'Keine Ausnahme. Ergebnisse folgen nur der globalen Richtlinie.',
    exception: 'Ausnahme',
    deleteException: 'Ausnahme löschen',
    who: 'Wer',
    zone: 'Bereich',
    access: 'Zugriff',
  },
  es: {
    minRank: 'Rango mínimo',
    maxRank: 'Rango máximo',
    user: 'Usuario',
    selectMember: 'Seleccionar miembro',
    section: 'Sección',
    selectSection: 'Seleccionar sección',
    question: 'Pregunta',
    selectQuestion: 'Seleccionar pregunta',
    questionType: 'Tipo de pregunta',
    title: 'Visibilidad de resultados',
    description: 'Elige primero una política simple y abre el modo experto solo para excepciones granulares.',
    globalPolicy: 'Política global',
    canonicalSummary: 'Resumen canónico',
    systemRules: 'Reglas del sistema',
    systemRulesText: 'Los GM de hermandad y miembros con manage_polls siempre ven todos los resultados.',
    advancedExceptions: 'Excepciones avanzadas',
    advancedDescription: 'Ajusta audiencia, zona y acceso solo para casos especiales.',
    addException: 'Añadir excepción',
    closeExpertMode: 'Cerrar modo experto',
    openExpertMode: 'Abrir modo experto',
    globalAudience: 'Audiencia global',
    defaultAccess: 'Acceso predeterminado',
    noException: 'Sin excepciones. Los resultados solo siguen la política global.',
    exception: 'Excepción',
    deleteException: 'Eliminar excepción',
    who: 'Quién',
    zone: 'Zona',
    access: 'Acceso',
  },
  'pt-BR': {
    minRank: 'Ranque mínimo',
    maxRank: 'Ranque máximo',
    user: 'Usuário',
    selectMember: 'Selecionar membro',
    section: 'Seção',
    selectSection: 'Selecionar seção',
    question: 'Pergunta',
    selectQuestion: 'Selecionar pergunta',
    questionType: 'Tipo de pergunta',
    title: 'Visibilidade dos resultados',
    description: 'Escolha primeiro uma política simples e abra o modo especialista só para exceções granulares.',
    globalPolicy: 'Política global',
    canonicalSummary: 'Resumo canônico',
    systemRules: 'Regras do sistema',
    systemRulesText: 'GMs da guilda e membros com manage_polls sempre veem todos os resultados.',
    advancedExceptions: 'Exceções avançadas',
    advancedDescription: 'Ajuste audiência, área e acesso apenas para casos especiais.',
    addException: 'Adicionar exceção',
    closeExpertMode: 'Fechar modo especialista',
    openExpertMode: 'Abrir modo especialista',
    globalAudience: 'Audiência global',
    defaultAccess: 'Acesso padrão',
    noException: 'Nenhuma exceção. Os resultados seguem apenas a política global.',
    exception: 'Exceção',
    deleteException: 'Excluir exceção',
    who: 'Quem',
    zone: 'Área',
    access: 'Acesso',
  },
  it: {
    minRank: 'Rango minimo',
    maxRank: 'Rango massimo',
    user: 'Utente',
    selectMember: 'Seleziona membro',
    section: 'Sezione',
    selectSection: 'Seleziona sezione',
    question: 'Domanda',
    selectQuestion: 'Seleziona domanda',
    questionType: 'Tipo di domanda',
    title: 'Visibilità risultati',
    description: 'Scegli prima una policy semplice, poi apri la modalità esperto solo per eccezioni granulari.',
    globalPolicy: 'Policy globale',
    canonicalSummary: 'Riepilogo canonico',
    systemRules: 'Regole di sistema',
    systemRulesText: 'I GM di gilda e i membri con manage_polls vedono sempre tutti i risultati.',
    advancedExceptions: 'Eccezioni avanzate',
    advancedDescription: 'Regola audience, zona e accesso solo per casi speciali.',
    addException: 'Aggiungi eccezione',
    closeExpertMode: 'Chiudi modalità esperto',
    openExpertMode: 'Apri modalità esperto',
    globalAudience: 'Audience globale',
    defaultAccess: 'Accesso predefinito',
    noException: 'Nessuna eccezione. I risultati seguono solo la policy globale.',
    exception: 'Eccezione',
    deleteException: 'Elimina eccezione',
    who: 'Chi',
    zone: 'Zona',
    access: 'Accesso',
  },
  ru: {
    minRank: 'Минимальный ранг',
    maxRank: 'Максимальный ранг',
    user: 'Пользователь',
    selectMember: 'Выберите участника',
    section: 'Раздел',
    selectSection: 'Выберите раздел',
    question: 'Вопрос',
    selectQuestion: 'Выберите вопрос',
    questionType: 'Тип вопроса',
    title: 'Видимость результатов',
    description: 'Сначала выберите простую политику, а экспертный режим открывайте только для точных исключений.',
    globalPolicy: 'Глобальная политика',
    canonicalSummary: 'Каноническая сводка',
    systemRules: 'Системные правила',
    systemRulesText: 'ГМы гильдии и участники с manage_polls всегда видят все результаты.',
    advancedExceptions: 'Расширенные исключения',
    advancedDescription: 'Настраивайте аудиторию, область и доступ только для особых случаев.',
    addException: 'Добавить исключение',
    closeExpertMode: 'Закрыть экспертный режим',
    openExpertMode: 'Открыть экспертный режим',
    globalAudience: 'Глобальная аудитория',
    defaultAccess: 'Доступ по умолчанию',
    noException: 'Исключений нет. Результаты следуют только глобальной политике.',
    exception: 'Исключение',
    deleteException: 'Удалить исключение',
    who: 'Кто',
    zone: 'Область',
    access: 'Доступ',
  },
  'zh-TW': {
    minRank: '最低階級',
    maxRank: '最高階級',
    user: '使用者',
    selectMember: '選擇成員',
    section: '章節',
    selectSection: '選擇章節',
    question: '問題',
    selectQuestion: '選擇問題',
    questionType: '問題類型',
    title: '結果可見性',
    description: '先選擇簡單政策；只有需要細部例外時再開啟專家模式。',
    globalPolicy: '全域政策',
    canonicalSummary: '標準摘要',
    systemRules: '系統規則',
    systemRulesText: '公會會長與擁有 manage_polls 權限的成員永遠可以查看所有結果。',
    advancedExceptions: '進階例外',
    advancedDescription: '只針對特殊情況調整對象、範圍與存取權。',
    addException: '新增例外',
    closeExpertMode: '關閉專家模式',
    openExpertMode: '開啟專家模式',
    globalAudience: '全域對象',
    defaultAccess: '預設存取',
    noException: '沒有例外。結果只依全域政策顯示。',
    exception: '例外',
    deleteException: '刪除例外',
    who: '對象',
    zone: '範圍',
    access: '存取',
  },
  ko: {
    minRank: '최소 등급',
    maxRank: '최대 등급',
    user: '사용자',
    selectMember: '멤버 선택',
    section: '섹션',
    selectSection: '섹션 선택',
    question: '질문',
    selectQuestion: '질문 선택',
    questionType: '질문 유형',
    title: '결과 공개 범위',
    description: '먼저 간단한 정책을 선택하고, 세부 예외가 필요할 때만 전문가 모드를 여세요.',
    globalPolicy: '전체 정책',
    canonicalSummary: '표준 요약',
    systemRules: '시스템 규칙',
    systemRulesText: '길드 GM과 manage_polls 권한이 있는 멤버는 항상 모든 결과를 볼 수 있습니다.',
    advancedExceptions: '고급 예외',
    advancedDescription: '특수한 경우에만 대상, 범위, 접근 권한을 조정하세요.',
    addException: '예외 추가',
    closeExpertMode: '전문가 모드 닫기',
    openExpertMode: '전문가 모드 열기',
    globalAudience: '전체 대상',
    defaultAccess: '기본 접근',
    noException: '예외가 없습니다. 결과는 전체 정책만 따릅니다.',
    exception: '예외',
    deleteException: '예외 삭제',
    who: '대상',
    zone: '범위',
    access: '접근',
  },
} as const;

const getResultsAccessCopy = (language: string) =>
  RESULTS_ACCESS_COPY[language as keyof typeof RESULTS_ACCESS_COPY] ?? RESULTS_ACCESS_COPY.en;

const normalizeAudienceScope = (rule: ResultsAccessRule) => {
  const nextRule = { ...rule };

  if (nextRule.audience_type === 'base_audience') {
    nextRule.user_id = undefined;
    nextRule.min_rank_index = undefined;
    nextRule.max_rank_index = undefined;
    return nextRule;
  }

  if (nextRule.audience_type === 'rank_range') {
    nextRule.user_id = undefined;
    if (nextRule.min_rank_index === undefined) nextRule.min_rank_index = 0;
    if (nextRule.max_rank_index === undefined) nextRule.max_rank_index = nextRule.min_rank_index;
    return nextRule;
  }

  nextRule.min_rank_index = undefined;
  nextRule.max_rank_index = undefined;
  return nextRule;
};

const normalizeTargetScope = (rule: ResultsAccessRule) => {
  const nextRule = { ...rule };

  if (nextRule.target_type === 'poll') {
    nextRule.section_id = undefined;
    nextRule.question_id = undefined;
    nextRule.question_type = undefined;
    return nextRule;
  }

  if (nextRule.target_type === 'section') {
    nextRule.question_id = undefined;
    nextRule.question_type = undefined;
    return nextRule;
  }

  if (nextRule.target_type === 'question') {
    nextRule.section_id = undefined;
    nextRule.question_type = undefined;
    return nextRule;
  }

  nextRule.section_id = undefined;
  nextRule.question_id = undefined;
  return nextRule;
};

const normalizeQuestionVisibility = (rule: ResultsAccessRule, questions: ResultsAccessQuestionOption[]) => {
  const nextRule = { ...rule };

  if (nextRule.target_type === 'question' && nextRule.question_id) {
    const question = questions.find((item) => item.id === nextRule.question_id);
    if (question?.question_type === 'text' && nextRule.visibility_level === 'non_text') {
      nextRule.visibility_level = 'none';
    }
    if (question && question.question_type !== 'text' && nextRule.visibility_level === 'non_text') {
      nextRule.visibility_level = 'full';
    }
  }

  if (nextRule.target_type === 'question_type' && nextRule.question_type) {
    if (nextRule.question_type === 'text' && nextRule.visibility_level === 'non_text') {
      nextRule.visibility_level = 'none';
    }
    if (nextRule.question_type !== 'text' && nextRule.visibility_level === 'non_text') {
      nextRule.visibility_level = 'full';
    }
  }

  return nextRule;
};

const clampRule = (rule: ResultsAccessRule, questions: ResultsAccessQuestionOption[]): ResultsAccessRule => {
  return normalizeQuestionVisibility(normalizeTargetScope(normalizeAudienceScope(rule)), questions);
};

const getVisibilityOptions = (
  targetType: PollResultsTargetType,
  rule: ResultsAccessRule,
  questions: ResultsAccessQuestionOption[],
): PollResultsVisibilityLevel[] => {
  if (targetType === 'poll' || targetType === 'section') {
    return ['none', 'non_text', 'full'];
  }

  if (targetType === 'question') {
    const question = questions.find((item) => item.id === rule.question_id);
    if (!question) return ['none', 'full'];
    return ['none', 'full'];
  }

  return rule.question_type === 'text' ? ['none', 'full'] : ['none', 'full'];
};

interface RuleEditorSharedProps {
  language: string;
  rule: ResultsAccessRule;
  index: number;
  updateRule: (index: number, updates: Partial<ResultsAccessRule>) => void;
}

interface RuleAudienceScopeFieldsProps extends RuleEditorSharedProps {
  members: ResultsAccessMemberOption[];
  sortedRanks: ResultsAccessRankOption[];
  hasMembers: boolean;
}

const RuleAudienceScopeFields = ({
  language,
  rule,
  index,
  updateRule,
  members,
  sortedRanks,
  hasMembers,
}: RuleAudienceScopeFieldsProps) => {
  const copy = getResultsAccessCopy(language);

  if (rule.audience_type === 'rank_range') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{copy.minRank}</Label>
          <Select
            value={String(rule.min_rank_index ?? 0)}
            onValueChange={(value) => updateRule(index, { min_rank_index: Number(value) })}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {sortedRanks.map((rank) => (
                <SelectItem key={`min-${rank.rank_index}`} value={String(rank.rank_index)}>
                  #{rank.rank_index} - {rank.rank_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{copy.maxRank}</Label>
          <Select
            value={String(rule.max_rank_index ?? rule.min_rank_index ?? 0)}
            onValueChange={(value) => updateRule(index, { max_rank_index: Number(value) })}
          >
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {sortedRanks.map((rank) => (
                <SelectItem key={`max-${rank.rank_index}`} value={String(rank.rank_index)}>
                  #{rank.rank_index} - {rank.rank_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (rule.audience_type === 'user') {
    return (
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserCircle className="h-3.5 w-3.5" />
          {copy.user}
        </Label>
        <Select
          value={rule.user_id || ''}
          onValueChange={(value) => updateRule(index, { user_id: value })}
          disabled={!hasMembers}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder={copy.selectMember} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
};

interface RuleTargetScopeFieldsProps extends RuleEditorSharedProps {
  sections: ResultsAccessSectionOption[];
  questions: ResultsAccessQuestionOption[];
  hasSections: boolean;
  hasQuestions: boolean;
}

const RuleTargetScopeFields = ({
  language,
  rule,
  index,
  updateRule,
  sections,
  questions,
  hasSections,
  hasQuestions,
}: RuleTargetScopeFieldsProps) => {
  const copy = getResultsAccessCopy(language);

  if (rule.target_type === 'section') {
    return (
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {copy.section}
        </Label>
        <Select
          value={rule.section_id || ''}
          onValueChange={(value) => updateRule(index, { section_id: value })}
          disabled={!hasSections}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder={copy.selectSection} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (rule.target_type === 'question') {
    return (
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {copy.question}
        </Label>
        <Select
          value={rule.question_id || ''}
          onValueChange={(value) => updateRule(index, { question_id: value })}
          disabled={!hasQuestions}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder={copy.selectQuestion} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {questions.map((question) => (
              <SelectItem key={question.id} value={question.id}>
                {question.question_text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (rule.target_type === 'question_type') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          {copy.questionType}
        </Label>
        <Select
          value={rule.question_type || 'single_choice'}
          onValueChange={(value) => updateRule(index, { question_type: value as PollQuestionType })}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {ALL_QUESTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {getQuestionTypeLabel(type, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
};

export const PollResultsAccessEditor = ({
  config,
  members,
  ranks,
  sections,
  questions,
  onChange,
}: PollResultsAccessEditorProps) => {
  const { language } = useLanguage();
  const copy = getResultsAccessCopy(language);
  const [expertOpen, setExpertOpen] = useState(false);
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const hasMembers = members.length > 0;
  const hasSections = sections.length > 0;
  const hasQuestions = questions.length > 0;
  const visibilityPreset = getVisibilityPreset(config);
  const summary = getCanonicalSummary(config, language);
  const quickContext = { members, ranks: sortedRanks, sections, questions };

  const updateConfig = (next: Partial<ResultsAccessConfig>) => {
    onChange({ ...config, ...next });
  };

  const updateRule = (index: number, updates: Partial<ResultsAccessRule>) => {
    const updated = [...config.rules];
    updated[index] = clampRule({ ...updated[index], ...updates }, questions);
    updateConfig({ rules: updated });
  };

  const addRule = (rule?: ResultsAccessRule) => {
    const defaultRule: ResultsAccessRule = rule || {
      audience_type: 'base_audience',
      visibility_level: 'none',
      target_type: 'question_type',
      question_type: 'text',
    };
    updateConfig({ rules: [...config.rules, clampRule(defaultRule, questions)] });
    setExpertOpen(true);
  };

  const removeRule = (index: number) => {
    updateConfig({ rules: config.rules.filter((_, i) => i !== index) });
  };

  const applyPreset = (preset: PollResultsVisibilityPreset) => {
    if (preset === 'custom') return;
    onChange(buildConfigFromPreset(preset));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{copy.title}</p>
          <p className="text-xs text-muted-foreground">{copy.description}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {copy.globalPolicy}
          </Label>
          <Select value={visibilityPreset} onValueChange={(value) => applyPreset(value as PollResultsVisibilityPreset)}>
            <SelectTrigger className="bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {GLOBAL_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {getPresetLabel(preset, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-primary/20 bg-card/60 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {copy.canonicalSummary}
          </p>
          <p className="mt-1 text-sm text-foreground">{summary}</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {copy.systemRules}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.systemRulesText}</p>
        </div>
      </div>

      <Collapsible open={expertOpen} onOpenChange={setExpertOpen} className="rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{copy.advancedExceptions}</p>
              <p className="text-xs text-muted-foreground">{copy.advancedDescription}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {copy.addException}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {QUICK_PRESETS.map((preset) => (
                  <DropdownMenuItem
                    key={preset}
                    disabled={!hasQuickPresetData(preset, quickContext)}
                    onClick={() => addRule(createQuickRule(preset, quickContext))}
                  >
                    {getQuickPresetLabel(preset, language)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                {expertOpen ? <ChevronDown className="mr-1 h-4 w-4" /> : <ChevronRight className="mr-1 h-4 w-4" />}
                {expertOpen ? copy.closeExpertMode : copy.openExpertMode}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="space-y-4 border-t border-border/50 p-4">
          <div className="grid gap-3 rounded-lg border border-border/50 bg-card/30 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {copy.globalAudience}
              </Label>
              <Select
                value={config.base_audience}
                onValueChange={(value) => updateConfig({ base_audience: value as PollResultsBaseAudience })}
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {BASE_AUDIENCES.map((audience) => (
                    <SelectItem key={audience} value={audience}>
                      {getBaseAudienceLabel(audience, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {copy.defaultAccess}
              </Label>
              <Select
                value={config.base_visibility}
                onValueChange={(value) => updateConfig({ base_visibility: value as PollResultsVisibilityLevel })}
              >
                <SelectTrigger className="bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {BASE_VISIBILITIES.map((level) => (
                    <SelectItem key={level} value={level}>
                      {getVisibilityLabel(level, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {config.rules.length === 0 && (
            <div className="rounded-lg border border-border/50 bg-card/40 px-3 py-3 text-sm text-muted-foreground">
              {copy.noException}
            </div>
          )}

          {config.rules.map((rule, index) => {
            const visibilityOptions = getVisibilityOptions(rule.target_type, rule, questions);

            return (
              <div key={`${rule.target_type}-${index}`} className="space-y-4 rounded-lg border border-border/50 bg-card/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {copy.exception} {index + 1}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {describeRule(rule, { language, members, sections, questions })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20"
                    aria-label={`${copy.deleteException} ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{copy.who}</Label>
                    <Select
                      value={rule.audience_type}
                      onValueChange={(value) => updateRule(index, { audience_type: value as PollResultsAudienceType })}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {AUDIENCE_TYPES.map((audienceType) => (
                          <SelectItem key={audienceType} value={audienceType}>
                            {getAudienceTypeLabel(audienceType, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{copy.zone}</Label>
                    <Select
                      value={rule.target_type}
                      onValueChange={(value) => updateRule(index, { target_type: value as PollResultsTargetType })}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {TARGET_TYPES.map((targetType) => (
                          <SelectItem key={targetType} value={targetType}>
                            {getTargetTypeLabel(targetType, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{copy.access}</Label>
                    <Select
                      value={rule.visibility_level}
                      onValueChange={(value) => updateRule(index, { visibility_level: value as PollResultsVisibilityLevel })}
                    >
                      <SelectTrigger className="bg-card border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {visibilityOptions.map((level) => (
                          <SelectItem key={level} value={level}>
                            {getVisibilityLabel(level, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <RuleAudienceScopeFields
                  language={language}
                  rule={rule}
                  index={index}
                  updateRule={updateRule}
                  members={members}
                  sortedRanks={sortedRanks}
                  hasMembers={hasMembers}
                />

                <RuleTargetScopeFields
                  language={language}
                  rule={rule}
                  index={index}
                  updateRule={updateRule}
                  sections={sections}
                  questions={questions}
                  hasSections={hasSections}
                  hasQuestions={hasQuestions}
                />
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
