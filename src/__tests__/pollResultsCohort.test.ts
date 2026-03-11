import { describe, expect, it } from 'vitest';

import type { GuildPoll, PollResultsCohortAnalysis } from '@/types/poll';

import { buildPollResultsCohortPoll, getPollResultsCohortOptions } from '@/components/polls/pollResultsCohort';

const buildPoll = (): GuildPoll => ({
  id: 'poll-cohort',
  guild_id: 'guild-1',
  roster_id: null,
  created_by: 'user-1',
  title: 'Cohort analysis',
  description: null,
  is_anonymous: true,
  allow_multiple_responses: false,
  status: 'closed',
  starts_at: null,
  ends_at: null,
  created_at: '2026-03-01T20:00:00.000Z',
  updated_at: '2026-03-01T20:00:00.000Z',
  response_count: 3,
  sections: [],
  questions: [
    {
      id: 'question-choice',
      poll_id: 'poll-cohort',
      section_id: null,
      question_text: 'How long have you been here?',
      question_type: 'single_choice',
      analysis_intent: 'informative',
      is_required: true,
      display_order: 0,
      options: ['Season 1', 'Season 2'],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-03-01T20:00:00.000Z',
      responses: [
        {
          id: 'r1',
          question_id: 'question-choice',
          user_id: 'u1',
          created_at: '2026-03-01T20:00:00.000Z',
          response_value: { type: 'single_choice', value: 'Season 1' },
        },
        {
          id: 'r2',
          question_id: 'question-choice',
          user_id: 'u2',
          created_at: '2026-03-01T20:01:00.000Z',
          response_value: { type: 'single_choice', value: 'Season 2' },
        },
      ],
    },
    {
      id: 'question-multi',
      poll_id: 'poll-cohort',
      section_id: null,
      question_text: 'What do you want more of?',
      question_type: 'multiple_choice',
      analysis_intent: 'decision',
      is_required: false,
      display_order: 1,
      options: ['Communication', 'Loot'],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-03-01T20:00:00.000Z',
      responses: [
        {
          id: 'm1',
          question_id: 'question-multi',
          user_id: 'u1',
          created_at: '2026-03-01T20:00:00.000Z',
          response_value: { type: 'multiple_choice', values: ['Communication'] },
        },
      ],
    },
    {
      id: 'question-text',
      poll_id: 'poll-cohort',
      section_id: null,
      question_text: 'Any feedback?',
      question_type: 'text',
      analysis_intent: 'decision',
      is_required: false,
      display_order: 2,
      options: [],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-03-01T20:00:00.000Z',
      responses: [],
    },
  ],
});

describe('pollResultsCohort helpers', () => {
  it('returns only filterable questions with deduplicated values', () => {
    const options = getPollResultsCohortOptions(buildPoll());

    expect(options.map((option) => option.question.id)).toEqual(['question-choice', 'question-multi']);
    expect(options[0].matchValues).toEqual(['Season 1', 'Season 2']);
    expect(options[1].matchValues).toEqual(['Communication']);
  });

  it('builds a filtered poll clone with cohort metadata and redactions', () => {
    const poll = buildPoll();
    const analysis: PollResultsCohortAnalysis = {
      cohort_respondent_count: 1,
      global_respondent_count: 3,
      is_anonymous_guarded: true,
      filters: [
        {
          question_id: 'question-choice',
          question_type: 'single_choice',
          match_value: 'Season 1',
        },
      ],
      questions: [
        {
          question_id: 'question-choice',
          response_count: 1,
          is_redacted: false,
          redaction_reason: null,
          responses: [
            {
              id: 'r1',
              question_id: 'question-choice',
              user_id: 'redacted-1',
              created_at: '2026-03-01T20:00:00.000Z',
              response_value: { type: 'single_choice', value: 'Season 1' },
            },
          ],
        },
        {
          question_id: 'question-text',
          response_count: 1,
          is_redacted: true,
          redaction_reason: 'text_hidden',
          responses: [],
        },
      ],
    };

    const cohortPoll = buildPollResultsCohortPoll(poll, analysis);
    const choiceQuestion = cohortPoll.questions?.find((question) => question.id === 'question-choice');
    const textQuestion = cohortPoll.questions?.find((question) => question.id === 'question-text');
    const multiQuestion = cohortPoll.questions?.find((question) => question.id === 'question-multi');

    expect(cohortPoll.response_count).toBe(1);
    expect(choiceQuestion?.responses).toHaveLength(1);
    expect(choiceQuestion?.cohort_response_count).toBe(1);
    expect(textQuestion?.cohort_redacted).toBe(true);
    expect(textQuestion?.cohort_redaction_reason).toBe('text_hidden');
    expect(multiQuestion?.responses).toHaveLength(0);
    expect(multiQuestion?.cohort_response_count).toBe(0);
  });
});
