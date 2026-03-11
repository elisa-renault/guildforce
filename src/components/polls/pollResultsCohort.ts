import type {
  GuildPoll,
  GuildPollQuestion,
  PollResultsCohortAnalysis,
  PollResultsCohortFilterableQuestionType,
  ResponseValue,
} from '@/types/poll';

const FILTERABLE_TYPES = new Set<PollResultsCohortFilterableQuestionType>([
  'single_choice',
  'multiple_choice',
  'rating',
  'date',
  'time',
  'datetime',
  'scale',
]);

export interface PollResultsCohortOption {
  question: GuildPollQuestion;
  matchValues: string[];
}

const isFilterableQuestionType = (
  questionType: GuildPollQuestion['question_type'],
): questionType is PollResultsCohortFilterableQuestionType => FILTERABLE_TYPES.has(questionType as PollResultsCohortFilterableQuestionType);

const extractMatchValues = (question: GuildPollQuestion): string[] => {
  const values = new Set<string>();

  (question.responses || []).forEach((response) => {
    const value = response.response_value as ResponseValue;

    switch (question.question_type) {
      case 'single_choice':
      case 'date':
      case 'time':
      case 'datetime':
      case 'rating':
      case 'scale':
        if ('value' in value && value.value !== undefined && value.value !== null) {
          values.add(String(value.value));
        }
        break;
      case 'multiple_choice':
        if (value.type === 'multiple_choice') {
          value.values.forEach((selectedValue) => values.add(selectedValue));
        }
        break;
      default:
        break;
    }
  });

  return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
};

export const getPollResultsCohortOptions = (poll: GuildPoll): PollResultsCohortOption[] =>
  (poll.questions || [])
    .filter(
      (question) =>
        isFilterableQuestionType(question.question_type) &&
        (question.effective_visibility || 'full') !== 'none',
    )
    .map((question) => ({
      question,
      matchValues: extractMatchValues(question),
    }))
    .filter((entry) => entry.matchValues.length > 0);

export const buildPollResultsCohortPoll = (
  poll: GuildPoll,
  analysis: PollResultsCohortAnalysis,
): GuildPoll => {
  const questionResults = new Map(analysis.questions.map((question) => [question.question_id, question]));

  return {
    ...poll,
    response_count: analysis.cohort_respondent_count,
    questions: (poll.questions || []).map((question) => {
      const cohortQuestion = questionResults.get(question.id);

      if (!cohortQuestion) {
        return {
          ...question,
          responses: [],
          cohort_response_count: 0,
          cohort_redacted: false,
          cohort_redaction_reason: null,
        };
      }

      return {
        ...question,
        responses: cohortQuestion.responses,
        cohort_response_count: cohortQuestion.response_count,
        cohort_redacted: cohortQuestion.is_redacted,
        cohort_redaction_reason: cohortQuestion.redaction_reason || null,
      };
    }),
  };
};
