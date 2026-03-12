import type { PollFormData, QuestionFormData, SectionFormData } from '@/types/poll';

type PollEditMode = 'metadata' | 'full' | null;

const normalizeCondition = (condition: QuestionFormData['condition']) => {
  if (!condition) return null;

  return {
    question_id: condition.question_id,
    operator: condition.operator,
    values: [...condition.values],
  };
};

const normalizeQuestion = (question: QuestionFormData) => ({
  question_text: question.question_text,
  question_type: question.question_type,
  analysis_intent: question.analysis_intent ?? 'decision',
  is_required: question.is_required,
  options: [...question.options],
  scale_config: question.scale_config ?? null,
  allow_other: question.allow_other ?? false,
  condition: normalizeCondition(question.condition),
});

const normalizeSection = (section: SectionFormData) => ({
  title: section.title,
  description: section.description,
  questions: section.questions.map(normalizeQuestion),
});

const buildStructureSnapshot = (data: PollFormData) => ({
  sections: data.sections.map(normalizeSection),
  questions: data.questions.map(normalizeQuestion),
});

export const hasPollStructureChanges = (previous: PollFormData, next: PollFormData): boolean =>
  JSON.stringify(buildStructureSnapshot(previous)) !== JSON.stringify(buildStructureSnapshot(next));

export const shouldResetResponsesForFullPollEdit = ({
  isActivePoll,
  editMode,
  previousData,
  nextData,
}: {
  isActivePoll: boolean;
  editMode: PollEditMode;
  previousData: PollFormData | null;
  nextData: PollFormData;
}): boolean => {
  if (!isActivePoll || editMode !== 'full' || !previousData) {
    return false;
  }

  return hasPollStructureChanges(previousData, nextData);
};
