import { describe, expect, it } from 'vitest';

import {
  DEMO_ACTIVE_POLL_ID,
  DEMO_CLOSED_POLL_ID,
  DEMO_DRAFT_POLL_ID,
  buildDemoPolls,
} from '@/demo/demoPolls';
import {
  buildDemoPollFromForm,
  closeDemoPoll,
  deleteDemoPoll,
  demoPollToFormData,
  duplicateDemoPoll,
  publishDemoPoll,
  resetDemoPollResponses,
  submitDemoPollResponses,
  upsertDemoPoll,
} from '@/demo/demoPollWorkflow';
import { translationsEn } from '@/i18n/translations.en';
import { shouldResetResponsesForFullPollEdit } from '@/lib/pollStructureChanges';

const buildPolls = () => buildDemoPolls(translationsEn);

describe('demo poll workflow mutations', () => {
  it('publishes a draft poll locally', () => {
    const next = publishDemoPoll(buildPolls(), DEMO_DRAFT_POLL_ID);
    const poll = next.find((item) => item.id === DEMO_DRAFT_POLL_ID);

    expect(poll?.status).toBe('active');
    expect(poll?.viewer_can_respond).toBe(true);
    expect(poll?.viewer_can_view_results).toBe(false);
  });

  it('closes an active poll locally', () => {
    const next = closeDemoPoll(buildPolls(), DEMO_ACTIVE_POLL_ID);
    const poll = next.find((item) => item.id === DEMO_ACTIVE_POLL_ID);

    expect(poll?.status).toBe('closed');
    expect(poll?.viewer_can_respond).toBe(false);
    expect(poll?.viewer_can_view_results).toBe(true);
    expect(poll?.ends_at).toBeTruthy();
  });

  it('duplicates a poll as a clean draft', () => {
    const next = duplicateDemoPoll(buildPolls(), DEMO_CLOSED_POLL_ID);
    const duplicate = next[0];

    expect(duplicate.id).not.toBe(DEMO_CLOSED_POLL_ID);
    expect(duplicate.status).toBe('draft');
    expect(duplicate.response_count).toBe(0);
    expect(duplicate.viewer_can_respond).toBe(false);
    expect(duplicate.viewer_can_view_results).toBe(false);
    expect(duplicate.questions?.every((question) => !question.my_response && question.responses.length === 0)).toBe(true);
  });

  it('deletes a poll locally', () => {
    const next = deleteDemoPoll(buildPolls(), DEMO_DRAFT_POLL_ID);

    expect(next.some((poll) => poll.id === DEMO_DRAFT_POLL_ID)).toBe(false);
  });

  it('submits a viewer response and unlocks local results', () => {
    const polls = buildPolls();
    const active = polls.find((poll) => poll.id === DEMO_ACTIVE_POLL_ID);
    const question = active?.questions?.[0];

    expect(active).toBeDefined();
    expect(question).toBeDefined();

    const next = submitDemoPollResponses(polls, DEMO_ACTIVE_POLL_ID, [
      {
        questionId: question!.id,
        value: { type: 'single_choice', value: question!.options[0] },
      },
    ]);
    const poll = next.find((item) => item.id === DEMO_ACTIVE_POLL_ID);
    const updatedQuestion = poll?.questions?.find((item) => item.id === question!.id);

    expect(updatedQuestion?.my_response?.response_value).toEqual({ type: 'single_choice', value: question!.options[0] });
    expect(poll?.response_count).toBe((active?.response_count || 0) + 1);
    expect(poll?.viewer_can_view_results).toBe(true);
  });

  it('preserves existing responses when editing active poll metadata locally', () => {
    const polls = buildPolls();
    const active = polls.find((poll) => poll.id === DEMO_ACTIVE_POLL_ID)!;
    const question = active.questions![0];
    const respondedPoll = submitDemoPollResponses(polls, DEMO_ACTIVE_POLL_ID, [
      {
        questionId: question.id,
        value: { type: 'single_choice', value: question.options[0] },
      },
    ]).find((poll) => poll.id === DEMO_ACTIVE_POLL_ID)!;
    const form = demoPollToFormData(respondedPoll);

    const updated = buildDemoPollFromForm({
      form: {
        ...form,
        title: 'Metadata-only title update',
      },
      existingPoll: respondedPoll,
      status: 'active',
    });

    expect(updated.response_count).toBe(respondedPoll.response_count);
    expect(updated.questions?.find((item) => item.id === question.id)?.my_response).toBeDefined();
  });

  it('detects and resets local responses for active full edit structure changes', () => {
    const polls = buildPolls();
    const active = polls.find((poll) => poll.id === DEMO_ACTIVE_POLL_ID)!;
    const question = active.questions![0];
    const respondedPoll = submitDemoPollResponses(polls, DEMO_ACTIVE_POLL_ID, [
      {
        questionId: question.id,
        value: { type: 'single_choice', value: question.options[0] },
      },
    ]).find((poll) => poll.id === DEMO_ACTIVE_POLL_ID)!;
    const previousData = demoPollToFormData(respondedPoll);
    const nextData = {
      ...previousData,
      questions: [
        ...previousData.questions,
        {
          question_text: 'New structure question',
          question_type: 'text' as const,
          analysis_intent: 'decision' as const,
          is_required: false,
          options: [],
          scale_config: null,
          allow_other: false,
          condition: null,
        },
      ],
    };

    expect(
      shouldResetResponsesForFullPollEdit({
        pollStatus: 'active',
        editMode: 'full',
        previousData,
        nextData,
      }),
    ).toBe(true);
    expect(
      shouldResetResponsesForFullPollEdit({
        pollStatus: 'active',
        editMode: 'metadata',
        previousData,
        nextData,
      }),
    ).toBe(false);

    const resetPoll = resetDemoPollResponses(respondedPoll);

    expect(resetPoll.response_count).toBe(0);
    expect(resetPoll.questions?.every((item) => !item.my_response && item.responses.length === 0)).toBe(true);
  });

  it('creates and updates poll form data locally', () => {
    const polls = buildPolls();
    const draft = polls.find((poll) => poll.id === DEMO_DRAFT_POLL_ID)!;
    const form = demoPollToFormData(draft);
    const updated = buildDemoPollFromForm({
      form: {
        ...form,
        title: 'Updated demo poll title',
      },
      existingPoll: draft,
      status: 'draft',
    });
    const next = upsertDemoPoll(polls, updated);

    expect(updated.id).toBe(draft.id);
    expect(next.find((poll) => poll.id === draft.id)?.title).toBe('Updated demo poll title');

    const created = buildDemoPollFromForm({
      form: {
        ...form,
        title: 'Created demo poll title',
      },
      status: 'draft',
    });

    expect(upsertDemoPoll(next, created)[0].title).toBe('Created demo poll title');
  });
});
