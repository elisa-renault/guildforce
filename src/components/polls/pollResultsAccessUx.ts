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
  if (language === 'fr') {
    if (level === 'none') return plural ? 'sont masqués' : 'est masqué';
    if (level === 'non_text') return plural ? 'sont visibles sauf texte libre' : 'est visible sauf texte libre';
    return plural ? 'sont visibles entièrement' : 'est visible entièrement';
  }

  if (level === 'none') return plural ? 'are hidden' : 'is hidden';
  if (level === 'non_text') return plural ? 'are visible except free text' : 'is visible except free text';
  return plural ? 'are fully visible' : 'is fully visible';
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
  if (language === 'fr') {
    if (preset === 'everyone_full') return 'Tout le monde voit tout';
    if (preset === 'guild_members_non_text') return 'Les membres voient seulement le non-texte';
    if (preset === 'eligible_non_text') return 'Les répondants éligibles voient seulement le non-texte';
    if (preset === 'managers_only') return 'Résultats réservés aux gestionnaires';
    return 'Configuration personnalisée';
  }

  if (preset === 'everyone_full') return 'Everyone sees everything';
  if (preset === 'guild_members_non_text') return 'Guild members see non-text only';
  if (preset === 'eligible_non_text') return 'Eligible respondents see non-text only';
  if (preset === 'managers_only') return 'Results reserved for managers';
  return 'Custom configuration';
};

export const getBaseAudienceLabel = (value: PollResultsBaseAudience, language: string) => {
  if (language === 'fr') {
    if (value === 'guild_members') return 'Membres de guilde';
    if (value === 'eligible_respondents') return 'Répondants éligibles';
    return 'Réservé aux gestionnaires';
  }

  if (value === 'guild_members') return 'Guild members';
  if (value === 'eligible_respondents') return 'Eligible respondents';
  return 'Managers only';
};

export const getVisibilityLabel = (level: PollResultsVisibilityLevel, language: string) => {
  if (language === 'fr') {
    if (level === 'none') return 'Masqué';
    if (level === 'non_text') return 'Visible sauf texte libre';
    return 'Visible entièrement';
  }

  if (level === 'none') return 'Hidden';
  if (level === 'non_text') return 'Visible except free text';
  return 'Fully visible';
};

export const getAudienceTypeLabel = (type: PollResultsAudienceType, language: string) => {
  if (language === 'fr') {
    if (type === 'base_audience') return 'Même audience que la politique globale';
    if (type === 'rank_range') return 'Rangs sélectionnés';
    return 'Utilisateur précis';
  }

  if (type === 'base_audience') return 'Same audience as global policy';
  if (type === 'rank_range') return 'Selected ranks';
  return 'Specific user';
};

export const getTargetTypeLabel = (type: PollResultsTargetType, language: string) => {
  if (language === 'fr') {
    if (type === 'poll') return 'Tout le sondage';
    if (type === 'section') return 'Une section';
    if (type === 'question') return 'Une question';
    return 'Toutes les questions de ce type';
  }

  if (type === 'poll') return 'Entire poll';
  if (type === 'section') return 'One section';
  if (type === 'question') return 'One question';
  return 'All questions of this type';
};

export const getQuestionTypeLabel = (value: PollQuestionType, language: string) => {
  if (language === 'fr') {
    if (value === 'single_choice') return 'Choix unique';
    if (value === 'multiple_choice') return 'Choix multiple';
    if (value === 'text') return 'Texte libre';
    if (value === 'rating') return 'Note';
    if (value === 'date') return 'Date';
    if (value === 'time') return 'Heure';
    if (value === 'datetime') return 'Date et heure';
    if (value === 'ranking') return 'Classement';
    return 'Échelle';
  }

  if (value === 'single_choice') return 'Single choice';
  if (value === 'multiple_choice') return 'Multiple choice';
  if (value === 'text') return 'Free text';
  if (value === 'rating') return 'Rating';
  if (value === 'date') return 'Date';
  if (value === 'time') return 'Time';
  if (value === 'datetime') return 'Date and time';
  if (value === 'ranking') return 'Ranking';
  return 'Scale';
};

export const getCanonicalSummary = (config: PollResultsAccessConfig, language: string) => {
  const preset = getVisibilityPreset(config);

  if (language === 'fr') {
    if (preset === 'everyone_full') return 'Les membres de guilde voient tous les résultats.';
    if (preset === 'guild_members_non_text') return 'Les membres de guilde voient tous les résultats sauf les réponses en texte libre.';
    if (preset === 'eligible_non_text') return 'Seuls les répondants éligibles voient les résultats non textuels.';
    if (preset === 'managers_only') return 'Seuls les gestionnaires du sondage voient les résultats.';

    const ruleCount = config.rules.length;
    const audience = getBaseAudienceLabel(config.base_audience, language).toLowerCase();
    const visibility = getVisibilityLabel(config.base_visibility, language).toLowerCase();
    return `Configuration personnalisée : ${audience}, accès ${visibility}${ruleCount > 0 ? `, ${ruleCount} exception${ruleCount > 1 ? 's' : ''}` : ''}.`;
  }

  if (preset === 'everyone_full') return 'Guild members can see all results.';
  if (preset === 'guild_members_non_text') return 'Guild members can see all results except free-text answers.';
  if (preset === 'eligible_non_text') return 'Only eligible respondents can see non-text results.';
  if (preset === 'managers_only') return 'Only poll managers can see results.';

  const ruleCount = config.rules.length;
  return `Custom configuration with ${ruleCount} override${ruleCount === 1 ? '' : 's'}.`;
};

export const describeRule = (rule: PollResultsAccessRule, context: DescribeRuleContext) => {
  const { language, members = [], sections = [], questions = [] } = context;

  const audienceSubject = (() => {
    if (language === 'fr') {
      if (rule.audience_type === 'base_audience') return 'Pour la même audience que la politique globale';
      if (rule.audience_type === 'rank_range') {
        const min = rule.min_rank_index ?? 0;
        const max = rule.max_rank_index ?? min;
        if (min === max) return `Pour le rang ${min}`;
        return `Pour les rangs ${min} à ${max}`;
      }
      const member = members.find((item) => item.user_id === rule.user_id);
      return `Pour ${member?.username || 'cet utilisateur'}`;
    }

    if (rule.audience_type === 'base_audience') return 'For the same audience as the global policy';
    if (rule.audience_type === 'rank_range') {
      const min = rule.min_rank_index ?? 0;
      const max = rule.max_rank_index ?? min;
      return min === max ? `For rank ${min}` : `For ranks ${min} to ${max}`;
    }
    const member = members.find((item) => item.user_id === rule.user_id);
    return `For ${member?.username || 'this user'}`;
  })();

  const targetSubject = (() => {
    if (rule.target_type === 'poll') {
      return { label: language === 'fr' ? 'tout le sondage' : 'the whole poll', plural: false };
    }

    if (rule.target_type === 'section') {
      const section = sections.find((item) => item.id === rule.section_id);
      return {
        label: language === 'fr' ? `la section "${section?.title || 'inconnue'}"` : `section "${section?.title || 'unknown'}"`,
        plural: false,
      };
    }

    if (rule.target_type === 'question') {
      const question = questions.find((item) => item.id === rule.question_id);
      return {
        label:
          language === 'fr'
            ? `la question "${question?.question_text || 'inconnue'}"`
            : `question "${question?.question_text || 'unknown'}"`,
        plural: false,
      };
    }

    return {
      label:
        language === 'fr'
          ? `les questions de type ${getQuestionTypeLabel(rule.question_type || 'single_choice', language).toLowerCase()}`
          : `${getQuestionTypeLabel(rule.question_type || 'single_choice', language).toLowerCase()} questions`,
      plural: true,
    };
  })();

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
  if (language === 'fr') {
    if (preset === 'mask_text') return 'Masquer tout le texte libre';
    if (preset === 'open_section') return 'Ouvrir une section';
    if (preset === 'open_question') return 'Ouvrir une question';
    if (preset === 'grant_rank') return 'Accorder un accès à un rang';
    return 'Accorder un accès à un utilisateur';
  }

  if (preset === 'mask_text') return 'Hide all free text';
  if (preset === 'open_section') return 'Open one section';
  if (preset === 'open_question') return 'Open one question';
  if (preset === 'grant_rank') return 'Grant access to a rank';
  return 'Grant access to a user';
};

export const hasQuickPresetData = (preset: QuickExceptionPreset, context: QuickRuleContext) => {
  if (preset === 'open_section') return context.sections.length > 0;
  if (preset === 'open_question') return context.questions.length > 0;
  if (preset === 'grant_rank') return context.ranks.length > 0;
  if (preset === 'grant_user') return context.members.length > 0;
  return true;
};
