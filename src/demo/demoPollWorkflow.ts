import type {
  GuildPoll,
  GuildPollQuestion,
  GuildPollResponse,
  GuildPollSection,
  PollFormData,
  QuestionFormData,
  ResponseValue,
  SectionFormData,
} from '@/types/poll';

import { DEMO_VIEWER_USER_ID, type DemoGuildPoll } from '@/demo/demoPolls';
import { demoRoster } from '@/demo/demoRoster';

const createId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const demoPollToFormData = (poll: GuildPoll): PollFormData => {
  const sortedSections = [...(poll.sections || [])].sort((a, b) => a.display_order - b.display_order);
  const sortedQuestions = [...(poll.questions || [])].sort((a, b) => a.display_order - b.display_order);
  const sectionsById = new Map<string, SectionFormData>();
  const sectionIndexById = new Map<string, number>();

  const sections = sortedSections.map((section, index) => {
    const formSection: SectionFormData = {
      id: section.id,
      title: section.title,
      description: section.description || '',
      questions: [],
    };
    sectionsById.set(section.id, formSection);
    sectionIndexById.set(section.id, index);
    return formSection;
  });

  const generalQuestions: QuestionFormData[] = [];
  const questionIdToEditorId: Record<string, string> = {};
  const sectionQuestionCounts = new Map<number, number>();
  let generalIndex = 0;

  sortedQuestions.forEach((question) => {
    const sectionIndex = question.section_id ? sectionIndexById.get(question.section_id) : undefined;
    const editorId = sectionIndex !== undefined
      ? `section-${sectionIndex}-q-${sectionQuestionCounts.get(sectionIndex) ?? 0}`
      : `general-q-${generalIndex}`;

    if (sectionIndex !== undefined) {
      sectionQuestionCounts.set(sectionIndex, (sectionQuestionCounts.get(sectionIndex) ?? 0) + 1);
    } else {
      generalIndex += 1;
    }

    questionIdToEditorId[question.id] = editorId;

    const formQuestion: QuestionFormData = {
      id: question.id,
      section_id: question.section_id,
      question_text: question.question_text,
      question_type: question.question_type,
      analysis_intent: question.analysis_intent ?? 'decision',
      is_required: question.is_required,
      options: question.options,
      scale_config: question.scale_config,
      allow_other: question.allow_other,
      condition: question.condition,
    };

    if (question.section_id && sectionsById.has(question.section_id)) {
      sectionsById.get(question.section_id)!.questions.push(formQuestion);
    } else {
      generalQuestions.push({ ...formQuestion, section_id: null });
    }
  });

  const remapCondition = (question: QuestionFormData) => {
    if (question.condition?.question_id && questionIdToEditorId[question.condition.question_id]) {
      question.condition = {
        ...question.condition,
        question_id: questionIdToEditorId[question.condition.question_id],
      };
    }
  };

  sections.forEach((section) => section.questions.forEach(remapCondition));
  generalQuestions.forEach(remapCondition);

  return {
    title: poll.title,
    description: poll.description || '',
    is_anonymous: poll.is_anonymous,
    allow_multiple_responses: poll.allow_multiple_responses,
    roster_id: poll.roster_id,
    ends_at: poll.ends_at,
    sections,
    questions: generalQuestions,
  };
};

const buildQuestion = ({
  pollId,
  sectionId,
  question,
  displayOrder,
  existingQuestion,
}: {
  pollId: string;
  sectionId: string | null;
  question: QuestionFormData;
  displayOrder: number;
  existingQuestion?: GuildPollQuestion;
}): GuildPollQuestion => ({
  id: question.id || createId('demo-question'),
  poll_id: pollId,
  section_id: sectionId,
  question_text: question.question_text,
  question_type: question.question_type,
  analysis_intent: question.analysis_intent ?? 'decision',
  is_required: question.is_required,
  display_order: displayOrder,
  options: question.options || [],
  scale_config: question.scale_config ?? null,
  allow_other: question.allow_other ?? false,
  condition: question.condition ?? null,
  created_at: existingQuestion?.created_at || new Date().toISOString(),
  responses: existingQuestion?.responses || [],
  my_response: existingQuestion?.my_response,
});

export const buildDemoPollFromForm = ({
  form,
  existingPoll,
  status,
}: {
  form: PollFormData;
  existingPoll?: GuildPoll | null;
  status: GuildPoll['status'];
}): DemoGuildPoll => {
  const now = new Date().toISOString();
  const pollId = existingPoll?.id || createId('demo-poll');
  const existingQuestionsById = new Map((existingPoll?.questions || []).map((question) => [question.id, question]));
  const sections: GuildPollSection[] = form.sections.map((section, index) => ({
    id: section.id || createId('demo-section'),
    poll_id: pollId,
    title: section.title,
    description: section.description || null,
    display_order: index,
    created_at: now,
  }));
  const sectionQuestions = form.sections.flatMap((section, sectionIndex) =>
    section.questions.map((question, questionIndex) =>
      buildQuestion({
        pollId,
        sectionId: sections[sectionIndex].id,
        question,
        displayOrder: sectionIndex * 100 + questionIndex,
        existingQuestion: question.id ? existingQuestionsById.get(question.id) : undefined,
      }),
    ),
  );
  const generalQuestions = form.questions.map((question, index) =>
    buildQuestion({
      pollId,
      sectionId: null,
      question,
      displayOrder: 1000 + index,
      existingQuestion: question.id ? existingQuestionsById.get(question.id) : undefined,
    }),
  );

  return {
    id: pollId,
    guild_id: existingPoll?.guild_id || 'demo-astral-vanguard',
    roster_id: form.roster_id,
    created_by: existingPoll?.created_by || 'demo-officer',
    title: form.title,
    description: form.description || null,
    is_anonymous: form.is_anonymous,
    allow_multiple_responses: form.allow_multiple_responses,
    status,
    starts_at: existingPoll?.starts_at || now,
    ends_at: form.ends_at,
    created_at: existingPoll?.created_at || now,
    updated_at: now,
    results_base_audience: existingPoll?.results_base_audience || 'eligible_respondents',
    results_base_visibility: status === 'draft' ? 'none' : 'full',
    creator: existingPoll?.creator || {
      id: 'demo-officer',
      username: 'Nyx',
      avatar_url: null,
    },
    roster: form.roster_id ? { id: demoRoster.id, name: demoRoster.name } : undefined,
    sections,
    questions: [...sectionQuestions, ...generalQuestions],
    response_count: status === 'draft' ? 0 : existingPoll?.response_count || 0,
    member_count: existingPoll?.member_count || 27,
    viewer_can_respond: status === 'active',
    viewer_can_view_results: status === 'closed',
    demo_audience: '',
    demo_result_summary: '',
  };
};

export const publishDemoPoll = (polls: DemoGuildPoll[], pollId: string) =>
  polls.map((poll) =>
    poll.id === pollId
      ? {
          ...poll,
          status: 'active' as const,
          results_base_visibility: 'full' as const,
          viewer_can_respond: true,
          viewer_can_view_results: false,
          updated_at: new Date().toISOString(),
        }
      : poll,
  );

export const closeDemoPoll = (polls: DemoGuildPoll[], pollId: string) =>
  polls.map((poll) =>
    poll.id === pollId
      ? {
          ...poll,
          status: 'closed' as const,
          viewer_can_respond: false,
          viewer_can_view_results: true,
          ends_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : poll,
  );

export const deleteDemoPoll = (polls: DemoGuildPoll[], pollId: string) =>
  polls.filter((poll) => poll.id !== pollId);

export const duplicateDemoPoll = (polls: DemoGuildPoll[], pollId: string) => {
  const source = polls.find((poll) => poll.id === pollId);
  if (!source) return polls;

  const now = new Date().toISOString();
  const nextId = createId('demo-poll-copy');
  const sectionIdMap = new Map<string, string>();
  const sections = (source.sections || []).map((section) => {
    const nextSectionId = createId('demo-section');
    sectionIdMap.set(section.id, nextSectionId);
    return {
      ...section,
      id: nextSectionId,
      poll_id: nextId,
      created_at: now,
    };
  });
  const questions = (source.questions || []).map((question) => ({
    ...question,
    id: createId('demo-question'),
    poll_id: nextId,
    section_id: question.section_id ? sectionIdMap.get(question.section_id) ?? null : null,
    created_at: now,
    responses: [],
    my_response: undefined,
  }));

  return [
    {
      ...source,
      id: nextId,
      title: `${source.title} (copy)`,
      status: 'draft',
      created_at: now,
      updated_at: now,
      starts_at: now,
      ends_at: null,
      sections,
      questions,
      response_count: 0,
      viewer_can_respond: false,
      viewer_can_view_results: false,
      results_base_visibility: 'none',
    },
    ...polls,
  ];
};

export const upsertDemoPoll = (polls: DemoGuildPoll[], poll: DemoGuildPoll) =>
  polls.some((current) => current.id === poll.id)
    ? polls.map((current) => (current.id === poll.id ? poll : current))
    : [poll, ...polls];

export const resetDemoPollResponses = (poll: GuildPoll): DemoGuildPoll => ({
  ...(poll as DemoGuildPoll),
  questions: (poll.questions || []).map((question) => ({
    ...question,
    responses: [],
    my_response: undefined,
  })),
  response_count: 0,
  viewer_can_view_results: poll.status === 'closed',
  updated_at: new Date().toISOString(),
});

export const submitDemoPollResponses = (
  polls: DemoGuildPoll[],
  pollId: string,
  responses: { questionId: string; value: ResponseValue }[],
) =>
  polls.map((poll) => {
    if (poll.id !== pollId) return poll;

    const hadPreviousViewerResponse = Boolean((poll.questions || []).some((question) => question.my_response));
    const submittedAt = new Date().toISOString();
    const questions = (poll.questions || []).map((question) => {
      const submitted = responses.find((response) => response.questionId === question.id);
      if (!submitted) return question;

      const submittedResponse: GuildPollResponse = {
        id: `${question.id}-demo-viewer-response`,
        question_id: question.id,
        user_id: DEMO_VIEWER_USER_ID,
        response_value: submitted.value,
        created_at: submittedAt,
        user: {
          id: DEMO_VIEWER_USER_ID,
          username: 'You',
          avatar_url: null,
        },
      };

      return {
        ...question,
        my_response: submittedResponse,
        responses: [
          ...(question.responses || []).filter((existing) => existing.user_id !== DEMO_VIEWER_USER_ID),
          submittedResponse,
        ],
      };
    });

    return {
      ...poll,
      questions,
      response_count: hadPreviousViewerResponse ? poll.response_count : (poll.response_count || 0) + 1,
      viewer_can_view_results: true,
      updated_at: submittedAt,
    };
  });
