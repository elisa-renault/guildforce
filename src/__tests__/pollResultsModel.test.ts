import { describe, expect, it } from 'vitest';

import type { GuildPoll } from '@/types/poll';

import { applyPollResultsView, buildPollResultsModel } from '@/components/polls/pollResultsModel';

const pollFixture: GuildPoll = {
  id: 'poll-1',
  guild_id: 'guild-1',
  roster_id: null,
  created_by: 'user-1',
  title: 'Raid schedule pulse',
  description: 'Weekly alignment check',
  is_anonymous: false,
  allow_multiple_responses: false,
  status: 'closed',
  starts_at: null,
  ends_at: '2026-03-01T20:00:00.000Z',
  created_at: '2026-02-20T20:00:00.000Z',
  updated_at: '2026-03-01T20:00:00.000Z',
  response_count: 5,
  sections: [
    {
      id: 'section-scheduling',
      poll_id: 'poll-1',
      title: 'Scheduling',
      description: 'Find the best slot',
      display_order: 0,
      created_at: '2026-02-20T20:00:00.000Z',
    },
    {
      id: 'section-feedback',
      poll_id: 'poll-1',
      title: 'Feedback',
      description: 'Open comments',
      display_order: 1,
      created_at: '2026-02-20T20:00:00.000Z',
    },
  ],
  questions: [
    {
      id: 'question-best-night',
      poll_id: 'poll-1',
      section_id: 'section-scheduling',
      question_text: 'Which raid night works best?',
      question_type: 'single_choice',
      is_required: true,
      display_order: 0,
      options: ['Wednesday', 'Friday'],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-02-20T20:00:00.000Z',
      responses: [
        { id: 'r1', question_id: 'question-best-night', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Wednesday' } },
        { id: 'r2', question_id: 'question-best-night', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Wednesday' } },
        { id: 'r3', question_id: 'question-best-night', user_id: 'u3', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Wednesday' } },
        { id: 'r4', question_id: 'question-best-night', user_id: 'u4', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Wednesday' } },
        { id: 'r5', question_id: 'question-best-night', user_id: 'u5', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Friday' } },
      ],
    },
    {
      id: 'question-time',
      poll_id: 'poll-1',
      section_id: 'section-scheduling',
      question_text: 'Preferred start time?',
      question_type: 'time',
      analysis_intent: 'informative',
      is_required: true,
      display_order: 1,
      options: [],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-02-20T20:00:00.000Z',
      responses: [
        { id: 't1', question_id: 'question-time', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'time', value: '20:00' } },
        { id: 't2', question_id: 'question-time', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'time', value: '20:00' } },
        { id: 't3', question_id: 'question-time', user_id: 'u3', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'time', value: '21:00' } },
        { id: 't4', question_id: 'question-time', user_id: 'u4', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'time', value: '21:00' } },
      ],
    },
    {
      id: 'question-rating',
      poll_id: 'poll-1',
      section_id: 'section-feedback',
      question_text: 'How confident are you?',
      question_type: 'rating',
      is_required: false,
      display_order: 2,
      options: [],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-02-20T20:00:00.000Z',
      responses: [
        { id: 'sr1', question_id: 'question-rating', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'rating', value: 5 } },
        { id: 'sr2', question_id: 'question-rating', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'rating', value: 1 } },
        { id: 'sr3', question_id: 'question-rating', user_id: 'u3', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'rating', value: 5 } },
        { id: 'sr4', question_id: 'question-rating', user_id: 'u4', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'rating', value: 1 } },
      ],
    },
    {
      id: 'question-text',
      poll_id: 'poll-1',
      section_id: null,
      question_text: 'Any extra context?',
      question_type: 'text',
      is_required: false,
      display_order: 3,
      options: [],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-02-20T20:00:00.000Z',
      responses: [
        { id: 'tx1', question_id: 'question-text', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'Alpha' } },
        { id: 'tx2', question_id: 'question-text', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'Beta' } },
      ],
    },
  ],
};

describe('pollResultsModel', () => {
  it('builds sections, strongest consensus, and divisive flags', () => {
    const model = buildPollResultsModel(pollFixture);

    expect(model.sectionCount).toBe(3);
    expect(model.sections.map((section) => section.title || 'General questions')).toEqual([
      'Scheduling',
      'Feedback',
      'General questions',
    ]);
    expect(model.strongestConsensusQuestion?.id).toBe('question-best-night');
    expect(model.mostDivisiveQuestion?.id).toBe('question-best-night');

    const schedulingLead = model.questions.find((question) => question.id === 'question-best-night');
    const timeSplit = model.questions.find((question) => question.id === 'question-time');
    const ratingSplit = model.questions.find((question) => question.id === 'question-rating');

    expect(schedulingLead?.isLowConsensus).toBe(false);
    expect(timeSplit?.tone).toBe('informative');
    expect(timeSplit?.resolvedAnalysisIntent).toBe('informative');
    expect(timeSplit?.isConsensusEligible).toBe(false);
    expect(timeSplit?.isLowConsensus).toBe(false);
    expect(ratingSplit?.isLowConsensus).toBe(true);
  });

  it('filters and sorts derived questions deterministically', () => {
    const model = buildPollResultsModel(pollFixture);

    const textOnly = applyPollResultsView(model, {
      sectionId: 'all',
      type: 'text-only',
      lowConsensusOnly: false,
      sort: 'original',
    });
    expect(textOnly.map((question) => question.id)).toEqual(['question-text']);

    const lowConsensus = applyPollResultsView(model, {
      sectionId: 'all',
      type: 'all',
      lowConsensusOnly: true,
      sort: 'divisive',
    });
    expect(lowConsensus.map((question) => question.id)).toEqual(['question-rating']);

    const consensusSorted = applyPollResultsView(model, {
      sectionId: 'all',
      type: 'all',
      lowConsensusOnly: false,
      sort: 'consensus',
    });
    expect(consensusSorted.map((question) => question.id)).toEqual([
      'question-best-night',
      'question-rating',
      'question-time',
      'question-text',
    ]);

    const schedulingOnly = applyPollResultsView(model, {
      sectionId: 'section-scheduling',
      type: 'all',
      lowConsensusOnly: false,
      sort: 'responses',
    });
    expect(schedulingOnly.map((question) => question.id)).toEqual([
      'question-best-night',
      'question-time',
    ]);
  });

  it('orders text responses from longest to shortest to avoid submission-order leakage', () => {
    const model = buildPollResultsModel({
      ...pollFixture,
      questions: pollFixture.questions?.map((question) =>
        question.id === 'question-text'
          ? {
              ...question,
              responses: [
                { id: 'tx-a', question_id: 'question-text', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'tiny' } },
                { id: 'tx-b', question_id: 'question-text', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'a much longer answer' } },
                { id: 'tx-c', question_id: 'question-text', user_id: 'u3', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'medium' } },
              ],
            }
          : question,
      ),
    });

    const textQuestion = model.questions.find((question) => question.id === 'question-text');

    expect(textQuestion?.textEntries?.map((entry) => entry.value)).toEqual([
      'a much longer answer',
      'medium',
      'tiny',
    ]);
  });
});
