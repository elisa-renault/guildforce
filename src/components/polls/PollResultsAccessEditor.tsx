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
  if (rule.audience_type === 'rank_range') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{language === 'fr' ? 'Rang minimum' : 'Minimum rank'}</Label>
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
          <Label className="text-xs text-muted-foreground">{language === 'fr' ? 'Rang maximum' : 'Maximum rank'}</Label>
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
          {language === 'fr' ? 'Utilisateur' : 'User'}
        </Label>
        <Select
          value={rule.user_id || ''}
          onValueChange={(value) => updateRule(index, { user_id: value })}
          disabled={!hasMembers}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder={language === 'fr' ? 'Sélectionner un membre' : 'Select a member'} />
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
  if (rule.target_type === 'section') {
    return (
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {language === 'fr' ? 'Section' : 'Section'}
        </Label>
        <Select
          value={rule.section_id || ''}
          onValueChange={(value) => updateRule(index, { section_id: value })}
          disabled={!hasSections}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder={language === 'fr' ? 'Sélectionner une section' : 'Select a section'} />
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
          {language === 'fr' ? 'Question' : 'Question'}
        </Label>
        <Select
          value={rule.question_id || ''}
          onValueChange={(value) => updateRule(index, { question_id: value })}
          disabled={!hasQuestions}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder={language === 'fr' ? 'Sélectionner une question' : 'Select a question'} />
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
          {language === 'fr' ? 'Type de question' : 'Question type'}
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
          <p className="text-sm font-medium">{language === 'fr' ? 'Visibilité des résultats' : 'Results visibility'}</p>
          <p className="text-xs text-muted-foreground">
            {language === 'fr'
              ? 'Choisissez une politique simple, puis ouvrez le mode expert uniquement pour les exceptions.'
              : 'Choose a simple policy first, then open expert mode only for granular exceptions.'}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {language === 'fr' ? 'Politique globale' : 'Global policy'}
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
            {language === 'fr' ? 'Résumé canonique' : 'Canonical summary'}
          </p>
          <p className="mt-1 text-sm text-foreground">{summary}</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {language === 'fr' ? 'Règles système' : 'System rules'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {language === 'fr'
              ? 'Les GM et les membres avec manage_polls voient toujours tous les résultats.'
              : 'Guild GMs and members with manage_polls always see all results.'}
          </p>
        </div>
      </div>

      <Collapsible open={expertOpen} onOpenChange={setExpertOpen} className="rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{language === 'fr' ? 'Exceptions avancées' : 'Advanced exceptions'}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'fr'
                  ? 'Ajustez l’audience, la zone et l’accès uniquement pour les cas spéciaux.'
                  : 'Adjust audience, zone, and access only for special cases.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {language === 'fr' ? 'Ajouter une exception' : 'Add exception'}
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
                {expertOpen
                  ? language === 'fr'
                    ? 'Fermer le mode expert'
                    : 'Close expert mode'
                  : language === 'fr'
                    ? 'Ouvrir le mode expert'
                    : 'Open expert mode'}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="space-y-4 border-t border-border/50 p-4">
          <div className="grid gap-3 rounded-lg border border-border/50 bg-card/30 p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {language === 'fr' ? 'Audience globale' : 'Global audience'}
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
                {language === 'fr' ? 'Accès par défaut' : 'Default access'}
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
              {language === 'fr'
                ? 'Aucune exception. Les résultats suivent uniquement la politique globale.'
                : 'No exception. Results follow the global policy only.'}
            </div>
          )}

          {config.rules.map((rule, index) => {
            const visibilityOptions = getVisibilityOptions(rule.target_type, rule, questions);

            return (
              <div key={`${rule.target_type}-${index}`} className="space-y-4 rounded-lg border border-border/50 bg-card/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {language === 'fr' ? `Exception ${index + 1}` : `Exception ${index + 1}`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {describeRule(rule, { language, members, sections, questions })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20"
                    aria-label={language === 'fr' ? `Supprimer l'exception ${index + 1}` : `Delete exception ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{language === 'fr' ? 'Qui' : 'Who'}</Label>
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
                    <Label className="text-xs text-muted-foreground">{language === 'fr' ? 'Zone' : 'Zone'}</Label>
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
                    <Label className="text-xs text-muted-foreground">{language === 'fr' ? 'Accès' : 'Access'}</Label>
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
