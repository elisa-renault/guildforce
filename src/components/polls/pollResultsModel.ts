import { clampScaleValue, formatScaleValue, getScaleConfig, getScaleSteps, roundToStep } from '@/lib/pollScale';
import {
  OTHER_OPTION_VALUE,
  type GuildPoll,
  type GuildPollQuestion,
  type GuildPollResponse,
  type GuildPollSection,
  type PollQuestionAnalysisIntent,
  type PollQuestionType,
  type PollResultsCohortRedactionReason,
  type ResponseValue,
} from '@/types/poll';

export const UNSECTIONED_SECTION_ID = '__unsectioned__';

type VisibleUser = NonNullable<GuildPollResponse['user']>;

export type PollResultsDisplayMode = 'percentage' | 'count';
export type PollResultsSortMode = 'original' | 'consensus' | 'divisive' | 'responses';
export type PollResultsTypeFilter = 'all' | 'text-only' | PollQuestionType;
export type PollResultsTone = 'strong' | 'mixed' | 'review' | 'informative';
export type PollResultsDispersion = 'aligned' | 'mixed' | 'split';

export interface PollResultsChoiceStat {
  value: string;
  label: string;
  count: number;
  percentage: number;
  users: VisibleUser[];
  otherTexts: string[];
}

export interface PollResultsRatingRow {
  value: number;
  count: number;
  percentage: number;
}

export interface PollResultsScaleRow {
  value: number;
  label: string;
  count: number;
  percentage: number;
}

export interface PollResultsRankingRow {
  option: string;
  averageScore: number;
  count: number;
  positions: number[];
  scorePercentage: number;
}

export interface PollResultsTextEntry {
  id: string;
  value: string;
  user?: VisibleUser;
}

export type PollQuestionTakeaway =
  | { kind: 'leader'; label: string; leaderPercentage: number; marginPercentage: number | null }
  | { kind: 'selection'; label: string; count: number; total: number }
  | { kind: 'average'; average: number; max: number; min: number; dispersion: PollResultsDispersion }
  | { kind: 'text'; count: number };

export interface PollQuestionResultModel {
  id: string;
  anchorId: string;
  question: GuildPollQuestion;
  sectionId: string;
  responseCount: number;
  originalOrder: number;
  tone: PollResultsTone;
  consensusScore: number;
  divisiveScore: number;
  isLowConsensus: boolean;
  isDiscrete: boolean;
  resolvedAnalysisIntent: PollQuestionAnalysisIntent;
  isConsensusEligible: boolean;
  isCohortRedacted: boolean;
  cohortRedactionReason?: PollResultsCohortRedactionReason | null;
  takeaway: PollQuestionTakeaway;
  choiceStats?: PollResultsChoiceStat[];
  ratingRows?: PollResultsRatingRow[];
  ratingAverage?: number;
  scaleRows?: PollResultsScaleRow[];
  scaleAverage?: number;
  scaleMin?: number;
  scaleMax?: number;
  scaleStep?: number;
  scaleDisplay?: 'stars' | 'slider';
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  rankingRows?: PollResultsRankingRow[];
  textEntries?: PollResultsTextEntry[];
}

export interface PollResultsSectionModel {
  id: string;
  title: string;
  description: string | null;
  isUnsectioned: boolean;
  questionCount: number;
  flaggedCount: number;
  responseCount: number;
}

export interface PollResultsSummaryQuestion {
  id: string;
  anchorId: string;
  questionText: string;
  score: number;
}

export interface PollResultsModel {
  respondentCount: number;
  questionCount: number;
  sectionCount: number;
  sections: PollResultsSectionModel[];
  questions: PollQuestionResultModel[];
  strongestConsensusQuestion: PollResultsSummaryQuestion | null;
  mostDivisiveQuestion: PollResultsSummaryQuestion | null;
}

export interface PollResultsViewOptions {
  sectionId: string;
  type: PollResultsTypeFilter;
  tone: 'all' | PollResultsTone;
  sort: PollResultsSortMode;
}

const isChoiceResponse = (value: ResponseValue): value is Extract<ResponseValue, { type: 'single_choice' | 'multiple_choice' }> =>
  value.type === 'single_choice' || value.type === 'multiple_choice';

const getSortedQuestions = (poll: GuildPoll) =>
  [...(poll.questions || [])].sort((a, b) => a.display_order - b.display_order);

const getRespondentCount = (poll: GuildPoll, questions: GuildPollQuestion[]) => {
  if (typeof poll.response_count === 'number') {
    return poll.response_count;
  }

  return new Set(
    questions.flatMap((question) => (question.responses || []).map((response) => response.user_id)),
  ).size;
};

const getChoiceStats = (question: GuildPollQuestion): PollResultsChoiceStat[] => {
  const respondents = question.responses || [];
  const total = respondents.length;
  const stats = new Map<string, PollResultsChoiceStat>();

  question.options.forEach((option) => {
    stats.set(option, {
      value: option,
      label: option,
      count: 0,
      percentage: 0,
      users: [],
      otherTexts: [],
    });
  });

  if (question.allow_other) {
    stats.set(OTHER_OPTION_VALUE, {
      value: OTHER_OPTION_VALUE,
      label: OTHER_OPTION_VALUE,
      count: 0,
      percentage: 0,
      users: [],
      otherTexts: [],
    });
  }

  respondents.forEach((response) => {
    const value = response.response_value as ResponseValue;
    if (!isChoiceResponse(value)) return;

    const selectedValues = value.type === 'single_choice' ? [value.value] : value.values;
    selectedValues.forEach((selectedValue) => {
      const current = stats.get(selectedValue);
      if (!current) return;
      current.count += 1;
      if (response.user) {
        current.users.push(response.user);
      }
      if (selectedValue === OTHER_OPTION_VALUE && value.other_text) {
        current.otherTexts.push(value.other_text);
      }
    });
  });

  return Array.from(stats.values())
    .map((entry) => ({
      ...entry,
      percentage: total > 0 ? (entry.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const getDateTimeStats = (question: GuildPollQuestion): PollResultsChoiceStat[] => {
  const total = question.responses?.length || 0;
  const stats = new Map<string, PollResultsChoiceStat>();

  (question.responses || []).forEach((response) => {
    const value = response.response_value as ResponseValue;
    let key: string | null = null;
    if (question.question_type === 'date' && value.type === 'date') key = value.value;
    if (question.question_type === 'time' && value.type === 'time') key = value.value;
    if (question.question_type === 'datetime' && value.type === 'datetime') key = value.value;
    if (!key) return;

    const current = stats.get(key) || {
      value: key,
      label: key,
      count: 0,
      percentage: 0,
      users: [],
      otherTexts: [],
    };
    current.count += 1;
    if (response.user) {
      current.users.push(response.user);
    }
    stats.set(key, current);
  });

  return Array.from(stats.values())
    .map((entry) => ({
      ...entry,
      percentage: total > 0 ? (entry.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

const getRatingStats = (question: GuildPollQuestion) => {
  const values = (question.responses || [])
    .map((response) => {
      const value = response.response_value as ResponseValue;
      return value.type === 'rating' ? value.value : null;
    })
    .filter((value): value is number => typeof value === 'number');

  const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const rows = [5, 4, 3, 2, 1].map((rating) => {
    const count = values.filter((value) => Math.round(value) === rating).length;
    return {
      value: rating,
      count,
      percentage: values.length > 0 ? (count / values.length) * 100 : 0,
    };
  });

  return { average, rows, values };
};

const getScaleStats = (question: GuildPollQuestion) => {
  const config = getScaleConfig(question.scale_config);
  const values = (question.responses || [])
    .map((response) => {
      const value = response.response_value as ResponseValue;
      return value.type === 'scale' ? value.value : null;
    })
    .filter((value): value is number => typeof value === 'number' && value >= config.min && value <= config.max);

  const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const distribution = new Map<string, number>();
  const steps = getScaleSteps(config.min, config.max, config.step);
  steps.forEach((value) => {
    distribution.set(formatScaleValue(value, config.step), 0);
  });

  values.forEach((value) => {
    const rounded = roundToStep(value, config.step, config.min);
    const key = formatScaleValue(rounded, config.step);
    distribution.set(key, (distribution.get(key) || 0) + 1);
  });

  const rows = steps
    .slice()
    .sort((a, b) => b - a)
    .map((value) => {
      const label = formatScaleValue(value, config.step);
      const count = distribution.get(label) || 0;
      return {
        value,
        label,
        count,
        percentage: values.length > 0 ? (count / values.length) * 100 : 0,
      };
    });

  return { average, values, config, rows };
};

const getRankingStats = (question: GuildPollQuestion): PollResultsRankingRow[] => {
  const scores: Record<string, { totalScore: number; count: number; positions: number[] }> = {};
  const options = question.options || [];

  options.forEach((option) => {
    scores[option] = {
      totalScore: 0,
      count: 0,
      positions: Array(options.length).fill(0),
    };
  });

  (question.responses || []).forEach((response) => {
    const value = response.response_value as ResponseValue;
    if (value.type !== 'ranking') return;

    value.values.forEach((item, position) => {
      if (!scores[item]) return;
      scores[item].totalScore += options.length - position;
      scores[item].count += 1;
      scores[item].positions[position] += 1;
    });
  });

  const maxScore = Math.max(1, options.length);

  return Object.entries(scores)
    .map(([option, score]) => ({
      option,
      averageScore: score.count > 0 ? score.totalScore / score.count : 0,
      count: score.count,
      positions: score.positions,
      scorePercentage: score.count > 0 ? ((score.totalScore / score.count) / maxScore) * 100 : 0,
    }))
    .sort((a, b) => b.averageScore - a.averageScore || a.option.localeCompare(b.option));
};

const getTextEntries = (question: GuildPollQuestion): PollResultsTextEntry[] =>
  (question.responses || [])
    .map((response) => {
      const value = response.response_value as ResponseValue;
      if (value.type !== 'text') return null;
      const trimmed = value.value.trim();
      if (!trimmed) return null;
      return {
        id: response.id,
        value: trimmed,
        user: response.user,
      };
    })
    .filter((entry): entry is PollResultsTextEntry => Boolean(entry))
    .sort((a, b) => b.value.length - a.value.length || a.value.localeCompare(b.value) || a.id.localeCompare(b.id));

const getLeaderMetrics = (items: Array<{ label: string; count: number; percentage: number }>) => {
  const leader = items[0];
  const runnerUp = items[1];
  const marginPercentage = leader && runnerUp ? leader.percentage - runnerUp.percentage : null;

  return {
    leader,
    runnerUp,
    marginPercentage,
  };
};

const getDispersion = (values: number[], min: number, max: number): PollResultsDispersion => {
  if (values.length === 0) return 'mixed';

  const normalizedValues = values.map((value) => clampScaleValue(value, min, max));
  const span = max - min;
  if (span <= 0) return 'aligned';

  const lowThreshold = min + span / 3;
  const highThreshold = max - span / 3;

  let low = 0;
  let middle = 0;
  let high = 0;

  normalizedValues.forEach((value) => {
    if (value <= lowThreshold) {
      low += 1;
    } else if (value >= highThreshold) {
      high += 1;
    } else {
      middle += 1;
    }
  });

  const total = normalizedValues.length;
  const lowShare = (low / total) * 100;
  const highShare = (high / total) * 100;
  const middleShare = (middle / total) * 100;

  if (lowShare >= 25 && highShare >= 25) {
    return 'split';
  }

  if (middleShare >= 45 || lowShare >= 55 || highShare >= 55) {
    return 'aligned';
  }

  return 'mixed';
};

const buildSectionModels = (poll: GuildPoll, questions: PollQuestionResultModel[]): PollResultsSectionModel[] => {
  const configuredSections = [...(poll.sections || [])].sort((a, b) => a.display_order - b.display_order);
  const questionCountBySection = new Map<string, number>();
  const flaggedBySection = new Map<string, number>();
  const responsesBySection = new Map<string, number>();

  questions.forEach((question) => {
    questionCountBySection.set(question.sectionId, (questionCountBySection.get(question.sectionId) || 0) + 1);
    flaggedBySection.set(question.sectionId, (flaggedBySection.get(question.sectionId) || 0) + (question.isLowConsensus ? 1 : 0));
    responsesBySection.set(question.sectionId, (responsesBySection.get(question.sectionId) || 0) + question.responseCount);
  });

  const sections = configuredSections
    .filter((section) => questionCountBySection.has(section.id))
    .map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      isUnsectioned: false,
      questionCount: questionCountBySection.get(section.id) || 0,
      flaggedCount: flaggedBySection.get(section.id) || 0,
      responseCount: responsesBySection.get(section.id) || 0,
    }));

  if (questionCountBySection.has(UNSECTIONED_SECTION_ID)) {
    sections.push({
      id: UNSECTIONED_SECTION_ID,
      title: '',
      description: null,
      isUnsectioned: true,
      questionCount: questionCountBySection.get(UNSECTIONED_SECTION_ID) || 0,
      flaggedCount: flaggedBySection.get(UNSECTIONED_SECTION_ID) || 0,
      responseCount: responsesBySection.get(UNSECTIONED_SECTION_ID) || 0,
    });
  }

  return sections;
};

const getQuestionTone = (consensusScore: number, isLowConsensus: boolean): PollResultsTone => {
  if (isLowConsensus) return 'review';
  if (consensusScore >= 70) return 'strong';
  return 'mixed';
};

const resolveAnalysisIntent = (question: GuildPollQuestion): PollQuestionAnalysisIntent =>
  question.analysis_intent ?? 'decision';

const isConsensusEligibleQuestion = (
  questionType: PollQuestionType,
  analysisIntent: PollQuestionAnalysisIntent,
) => analysisIntent === 'decision' && questionType !== 'text';

const isDiscreteQuestionType = (questionType: PollQuestionType) =>
  questionType === 'single_choice' ||
  questionType === 'multiple_choice' ||
  questionType === 'date' ||
  questionType === 'time' ||
  questionType === 'datetime' ||
  questionType === 'ranking';

const createQuestionModel = (question: GuildPollQuestion): PollQuestionResultModel => {
  const sectionId = question.section_id || UNSECTIONED_SECTION_ID;
  const resolvedAnalysisIntent = resolveAnalysisIntent(question);
  const isConsensusEligible = isConsensusEligibleQuestion(question.question_type, resolvedAnalysisIntent);
  const base = {
    id: question.id,
    anchorId: `poll-question-${question.id}`,
    question,
    sectionId,
    responseCount: question.cohort_response_count ?? (question.responses?.length || 0),
    originalOrder: question.display_order,
    consensusScore: 0,
    divisiveScore: 0,
    isLowConsensus: false,
    isDiscrete: isDiscreteQuestionType(question.question_type),
    resolvedAnalysisIntent,
    isConsensusEligible,
    isCohortRedacted: Boolean(question.cohort_redacted),
    cohortRedactionReason: question.cohort_redaction_reason ?? null,
  };

  const withAnalysisIntent = (
    model: Omit<PollQuestionResultModel, 'resolvedAnalysisIntent' | 'isConsensusEligible'>,
  ): PollQuestionResultModel => ({
    ...model,
    resolvedAnalysisIntent,
    isConsensusEligible: question.cohort_redacted ? false : isConsensusEligible,
    tone: resolvedAnalysisIntent === 'informative' ? 'informative' : model.tone,
    isLowConsensus: resolvedAnalysisIntent === 'informative' ? false : model.isLowConsensus,
  });

  if (question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
    const choiceStats = getChoiceStats(question);
    const { leader, marginPercentage } = getLeaderMetrics(choiceStats);
    const leaderPercentage = leader?.percentage || 0;
    const isLowConsensus = question.question_type === 'multiple_choice'
      ? leaderPercentage < 50
      : leaderPercentage < 50 || (marginPercentage !== null && marginPercentage < 10);
    const consensusScore = leaderPercentage + ((marginPercentage || 0) / 2);
    const divisiveScore = 100 - consensusScore;

    return withAnalysisIntent({
      ...base,
      tone: getQuestionTone(consensusScore, isLowConsensus),
      consensusScore,
      divisiveScore,
      isLowConsensus,
      takeaway: question.question_type === 'multiple_choice'
        ? {
            kind: 'selection',
            label: leader?.label || '',
            count: leader?.count || 0,
            total: question.responses?.length || 0,
          }
        : {
            kind: 'leader',
            label: leader?.label || '',
            leaderPercentage,
            marginPercentage,
          },
      choiceStats,
    });
  }

  if (question.question_type === 'date' || question.question_type === 'time' || question.question_type === 'datetime') {
    const choiceStats = getDateTimeStats(question);
    const { leader, marginPercentage } = getLeaderMetrics(choiceStats);
    const leaderPercentage = leader?.percentage || 0;
    const isLowConsensus = leaderPercentage < 50 || (marginPercentage !== null && marginPercentage < 10);
    const consensusScore = leaderPercentage + ((marginPercentage || 0) / 2);

    return withAnalysisIntent({
      ...base,
      tone: getQuestionTone(consensusScore, isLowConsensus),
      consensusScore,
      divisiveScore: 100 - consensusScore,
      isLowConsensus,
      takeaway: {
        kind: 'leader',
        label: leader?.label || '',
        leaderPercentage,
        marginPercentage,
      },
      choiceStats,
    });
  }

  if (question.question_type === 'rating') {
    const { average, rows, values } = getRatingStats(question);
    const dispersion = getDispersion(values, 1, 5);
    const normalizedAverage = values.length > 0 ? ((average - 1) / 4) * 100 : 0;
    const isLowConsensus = dispersion === 'split';
    const consensusScore = dispersion === 'aligned' ? normalizedAverage : dispersion === 'mixed' ? normalizedAverage * 0.7 : normalizedAverage * 0.4;

    return withAnalysisIntent({
      ...base,
      tone: getQuestionTone(consensusScore, isLowConsensus),
      consensusScore,
      divisiveScore: 100 - consensusScore,
      isLowConsensus,
      takeaway: {
        kind: 'average',
        average,
        min: 1,
        max: 5,
        dispersion,
      },
      ratingRows: rows,
      ratingAverage: average,
    });
  }

  if (question.question_type === 'scale') {
    const { average, values, config, rows } = getScaleStats(question);
    const dispersion = getDispersion(values, config.min, config.max);
    const normalizedAverage = values.length > 0 ? ((average - config.min) / Math.max(1, config.max - config.min)) * 100 : 0;
    const isLowConsensus = dispersion === 'split';
    const consensusScore = dispersion === 'aligned' ? normalizedAverage : dispersion === 'mixed' ? normalizedAverage * 0.7 : normalizedAverage * 0.4;

    return withAnalysisIntent({
      ...base,
      tone: getQuestionTone(consensusScore, isLowConsensus),
      consensusScore,
      divisiveScore: 100 - consensusScore,
      isLowConsensus,
      takeaway: {
        kind: 'average',
        average,
        min: config.min,
        max: config.max,
        dispersion,
      },
      scaleRows: rows,
      scaleAverage: average,
      scaleMin: config.min,
      scaleMax: config.max,
      scaleStep: config.step,
      scaleDisplay: config.display,
      scaleMinLabel: config.min_label,
      scaleMaxLabel: config.max_label,
    });
  }

  if (question.question_type === 'ranking') {
    const rankingRows = getRankingStats(question);
    const leader = rankingRows[0];
    const runnerUp = rankingRows[1];
    const leaderPercentage = leader?.scorePercentage || 0;
    const marginPercentage = leader && runnerUp ? leader.scorePercentage - runnerUp.scorePercentage : null;
    const isLowConsensus = leaderPercentage < 50 || (marginPercentage !== null && marginPercentage < 10);
    const consensusScore = leaderPercentage + ((marginPercentage || 0) / 2);

    return withAnalysisIntent({
      ...base,
      tone: getQuestionTone(consensusScore, isLowConsensus),
      consensusScore,
      divisiveScore: 100 - consensusScore,
      isLowConsensus,
      takeaway: {
        kind: 'leader',
        label: leader?.option || '',
        leaderPercentage,
        marginPercentage,
      },
      rankingRows,
    });
  }

  const textEntries = getTextEntries(question);
  const consensusScore = textEntries.length > 0 ? 40 : 0;

  return withAnalysisIntent({
    ...base,
    tone: textEntries.length > 0 ? 'mixed' : 'review',
    consensusScore,
    divisiveScore: textEntries.length > 0 ? 50 : 100,
    isLowConsensus: false,
    isDiscrete: false,
    takeaway: {
      kind: 'text',
      count: textEntries.length,
    },
    textEntries,
  });
};

export const buildPollResultsModel = (poll: GuildPoll): PollResultsModel => {
  const questions = getSortedQuestions(poll).map(createQuestionModel);
  const respondentCount = getRespondentCount(poll, poll.questions || []);
  const sections = buildSectionModels(poll, questions);
  const discreteQuestions = questions.filter((question) => question.isDiscrete && question.isConsensusEligible);
  const strongestConsensusQuestion = discreteQuestions.length > 0
    ? [...discreteQuestions]
        .sort((a, b) => b.consensusScore - a.consensusScore || b.responseCount - a.responseCount)
        .map((question) => ({
          id: question.id,
          anchorId: question.anchorId,
          questionText: question.question.question_text,
          score: question.consensusScore,
        }))[0]
    : null;

  const mostDivisiveQuestion = discreteQuestions.length > 0
    ? [...discreteQuestions]
        .sort((a, b) => b.divisiveScore - a.divisiveScore || b.responseCount - a.responseCount)
        .map((question) => ({
          id: question.id,
          anchorId: question.anchorId,
          questionText: question.question.question_text,
          score: question.divisiveScore,
        }))[0]
    : null;

  return {
    respondentCount,
    questionCount: questions.length,
    sectionCount: sections.length,
    sections,
    questions,
    strongestConsensusQuestion,
    mostDivisiveQuestion,
  };
};

export const applyPollResultsView = (
  model: PollResultsModel,
  options: PollResultsViewOptions,
): PollQuestionResultModel[] => {
  const filtered = model.questions.filter((question) => {
    if (options.sectionId !== 'all' && question.sectionId !== options.sectionId) {
      return false;
    }

    if (options.type === 'text-only' && question.question.question_type !== 'text') {
      return false;
    }

    if (options.type !== 'all' && options.type !== 'text-only' && question.question.question_type !== options.type) {
      return false;
    }

    if (options.tone !== 'all' && question.tone !== options.tone) {
      return false;
    }

    return true;
  });

  switch (options.sort) {
    case 'consensus': {
      const eligible = filtered
        .filter((question) => question.isConsensusEligible)
        .sort((a, b) => b.consensusScore - a.consensusScore || b.responseCount - a.responseCount || a.originalOrder - b.originalOrder);
      const ineligible = filtered
        .filter((question) => !question.isConsensusEligible)
        .sort((a, b) => a.originalOrder - b.originalOrder);
      return [...eligible, ...ineligible];
    }
    case 'divisive': {
      const eligible = filtered
        .filter((question) => question.isConsensusEligible)
        .sort((a, b) => b.divisiveScore - a.divisiveScore || b.responseCount - a.responseCount || a.originalOrder - b.originalOrder);
      const ineligible = filtered
        .filter((question) => !question.isConsensusEligible)
        .sort((a, b) => a.originalOrder - b.originalOrder);
      return [...eligible, ...ineligible];
    }
    case 'responses':
      return filtered.sort((a, b) => b.responseCount - a.responseCount || a.originalOrder - b.originalOrder);
    case 'original':
    default:
      return filtered.sort((a, b) => a.originalOrder - b.originalOrder);
  }
};

export const getSectionTitle = (section: GuildPollSection | PollResultsSectionModel) => section.title;
