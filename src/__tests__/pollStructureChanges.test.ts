import { describe, expect, it } from 'vitest';

import type { PollFormData } from '@/types/poll';

import {
  hasPollStructureChanges,
  shouldResetResponsesForFullPollEdit,
} from '@/lib/pollStructureChanges';

const buildPollFormData = (): PollFormData => ({
  title: 'Raid feedback',
  description: 'Review the current roster setup.',
  is_anonymous: false,
  allow_multiple_responses: false,
  roster_id: null,
  ends_at: null,
  sections: [
    {
      title: 'Logistics',
      description: 'Scheduling questions',
      questions: [
        {
          id: 'question-1',
          question_text: 'Which raid night works best?',
          question_type: 'single_choice',
          analysis_intent: 'decision',
          is_required: true,
          options: ['Wednesday', 'Friday'],
          allow_other: false,
          condition: null,
        },
      ],
    },
  ],
  questions: [
    {
      id: 'question-2',
      question_text: 'Anything else to add?',
      question_type: 'text',
      analysis_intent: 'informative',
      is_required: false,
      options: [],
      allow_other: false,
      condition: null,
    },
  ],
});

describe('pollStructureChanges', () => {
  it('does not flag unchanged question structure as requiring a response reset', () => {
    const previous = buildPollFormData();
    const next = buildPollFormData();

    expect(hasPollStructureChanges(previous, next)).toBe(false);
    expect(
      shouldResetResponsesForFullPollEdit({
        isActivePoll: true,
        editMode: 'full',
        previousData: previous,
        nextData: next,
      }),
    ).toBe(false);
  });

  it('requires a reset when the poll question structure changes', () => {
    const previous = buildPollFormData();
    const next = buildPollFormData();
    next.sections[0].questions[0].options = ['Wednesday', 'Friday', 'Sunday'];

    expect(hasPollStructureChanges(previous, next)).toBe(true);
    expect(
      shouldResetResponsesForFullPollEdit({
        isActivePoll: true,
        editMode: 'full',
        previousData: previous,
        nextData: next,
      }),
    ).toBe(true);
  });

  it('never resets responses outside active full-edit mode', () => {
    const previous = buildPollFormData();
    const next = buildPollFormData();
    next.sections[0].questions[0].question_text = 'Updated question wording';

    expect(
      shouldResetResponsesForFullPollEdit({
        isActivePoll: true,
        editMode: 'metadata',
        previousData: previous,
        nextData: next,
      }),
    ).toBe(false);
    expect(
      shouldResetResponsesForFullPollEdit({
        isActivePoll: false,
        editMode: 'full',
        previousData: previous,
        nextData: next,
      }),
    ).toBe(false);
  });
});
