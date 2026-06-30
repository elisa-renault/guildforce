import { demoGuild, demoRoster } from './demoRoster';
import type { Translations } from '@/i18n/translations';
import type {
  GuildPoll,
  GuildPollQuestion,
  GuildPollResponse,
  GuildPollSection,
  PollQuestionType,
  ResponseValue,
  ScaleConfig,
} from '@/types/poll';

export const DEMO_ACTIVE_POLL_ID = 'demo-poll-midnight-availability';
export const DEMO_DRAFT_POLL_ID = 'demo-poll-trial-feedback-prep';
export const DEMO_CLOSED_POLL_ID = 'demo-poll-loot-bench-review';
export const DEMO_VIEWER_USER_ID = 'demo-viewer';

export type DemoPollSubmission = Record<string, { questionId: string; value: ResponseValue }[]>;
export type DemoGuildPoll = GuildPoll & {
  demo_audience: string;
  demo_result_summary: string;
};

type DemoPollCopy = Translations['demo']['pollItems'][number];

const demoUsers = [
  'Nyx',
  'Thorn',
  'Luna',
  'Ash',
  'Void',
  'Mist',
  'Sera',
  'Tide',
  'Bloom',
  'Sky',
  'Iron',
  'Night',
  'Star',
  'Frost',
  'Wild',
  'Sun',
  'Fel',
  'Root',
  'Storm',
  'Nether',
  'Kael',
  'Dawn',
  'Ember',
];

const createdAt = '2026-06-27T18:30:00.000Z';
const activeEndsAt = '2026-07-05T20:00:00.000Z';
const closedAt = '2026-06-24T21:00:00.000Z';

const section = (
  pollId: string,
  id: string,
  copy: DemoPollCopy['sections'][number],
  displayOrder: number,
): GuildPollSection => ({
  id,
  poll_id: pollId,
  title: copy.title,
  description: copy.description,
  display_order: displayOrder,
  created_at: createdAt,
});

const question = ({
  id,
  pollId,
  sectionId,
  copy,
  type,
  displayOrder,
  options = copy.options ?? [],
  isRequired = true,
  scaleConfig = null,
  condition = null,
  responses = [],
}: {
  id: string;
  pollId: string;
  sectionId: string | null;
  copy: DemoPollCopy['sections'][number]['questions'][number];
  type: PollQuestionType;
  displayOrder: number;
  options?: string[];
  isRequired?: boolean;
  scaleConfig?: ScaleConfig | null;
  condition?: GuildPollQuestion['condition'];
  responses?: GuildPollResponse[];
}): GuildPollQuestion => ({
  id,
  poll_id: pollId,
  section_id: sectionId,
  question_text: copy.text,
  question_type: type,
  analysis_intent: type === 'text' ? 'informative' : 'decision',
  is_required: isRequired,
  display_order: displayOrder,
  options,
  scale_config: scaleConfig,
  allow_other: false,
  condition,
  created_at: createdAt,
  responses,
});

const response = (
  questionId: string,
  userIndex: number,
  value: ResponseValue,
  offsetMinutes = 0,
): GuildPollResponse => {
  const username = demoUsers[userIndex % demoUsers.length];
  return {
    id: `${questionId}-response-${userIndex + 1}`,
    question_id: questionId,
    user_id: `demo-user-${userIndex + 1}`,
    response_value: value,
    created_at: new Date(Date.parse(createdAt) + offsetMinutes * 60_000).toISOString(),
    user: {
      id: `demo-user-${userIndex + 1}`,
      username,
      avatar_url: null,
    },
  };
};

const responses = (questionId: string, values: ResponseValue[]) =>
  values.map((value, index) => response(questionId, index, value, index * 7));

const singleResponses = (questionId: string, values: string[]) =>
  responses(questionId, values.map((value) => ({ type: 'single_choice', value })));

const scaleResponses = (questionId: string, values: number[]) =>
  responses(questionId, values.map((value) => ({ type: 'scale', value })));

const ratingResponses = (questionId: string, values: number[]) =>
  responses(questionId, values.map((value) => ({ type: 'rating', value })));

const textResponses = (questionId: string, comments: string[]) =>
  responses(questionId, comments.map((value) => ({ type: 'text', value })));

const multipleResponses = (questionId: string, values: string[][]) =>
  responses(questionId, values.map((selection) => ({ type: 'multiple_choice', values: selection })));

const rankingResponses = (questionId: string, rankings: string[][]) =>
  responses(questionId, rankings.map((values) => ({ type: 'ranking', values })));

const buildPollShell = (
  id: string,
  copy: DemoPollCopy,
  status: GuildPoll['status'],
  responseCount: number,
): DemoGuildPoll => ({
  id,
  guild_id: demoGuild.id,
  roster_id: demoRoster.id,
  created_by: 'demo-officer',
  title: copy.title,
  description: copy.description,
  is_anonymous: status === 'closed',
  allow_multiple_responses: false,
  status,
  starts_at: createdAt,
  ends_at: status === 'active' ? activeEndsAt : status === 'closed' ? closedAt : null,
  created_at: createdAt,
  updated_at: status === 'closed' ? closedAt : createdAt,
  results_base_audience: 'eligible_respondents',
  results_base_visibility: status === 'draft' ? 'none' : 'full',
  creator: {
    id: 'demo-officer',
    username: 'Nyx',
    avatar_url: null,
  },
  roster: {
    id: demoRoster.id,
    name: demoRoster.name,
  },
  sections: [],
  questions: [],
  response_count: responseCount,
  member_count: 27,
  viewer_can_respond: status === 'active',
  viewer_can_view_results: status === 'closed',
  demo_audience: copy.audience,
  demo_result_summary: copy.resultSummary,
});

const getCopy = (copies: DemoPollCopy[], index: number) => {
  const copy = copies[index];
  if (!copy) {
    throw new Error(`Missing demo poll translation at index ${index}`);
  }
  return copy;
};

export const buildDemoPolls = (translations: Translations): DemoGuildPoll[] => {
  const activeCopy = getCopy(translations.demo.pollItems, 0);
  const draftCopy = getCopy(translations.demo.pollItems, 1);
  const closedCopy = getCopy(translations.demo.pollItems, 2);

  const activeSections = [
    section(DEMO_ACTIVE_POLL_ID, 'demo-active-section-commitment', activeCopy.sections[0], 0),
    section(DEMO_ACTIVE_POLL_ID, 'demo-active-section-extras', activeCopy.sections[1], 1),
  ];
  const activeNightOptions = activeCopy.sections[0].questions[0].options ?? [];
  const activeExtraOptions = activeCopy.sections[1].questions[0].options ?? [];
  const activeQuestions: GuildPollQuestion[] = [
    question({
      id: 'demo-active-q-nights',
      pollId: DEMO_ACTIVE_POLL_ID,
      sectionId: activeSections[0].id,
      copy: activeCopy.sections[0].questions[0],
      type: 'single_choice',
      displayOrder: 0,
      responses: singleResponses('demo-active-q-nights', [
        ...Array(10).fill(activeNightOptions[0]),
        ...Array(5).fill(activeNightOptions[1]),
        ...Array(4).fill(activeNightOptions[2]),
        ...Array(2).fill(activeNightOptions[3]),
        ...Array(2).fill(activeNightOptions[4]),
      ]),
    }),
    question({
      id: 'demo-active-q-stability',
      pollId: DEMO_ACTIVE_POLL_ID,
      sectionId: activeSections[0].id,
      copy: activeCopy.sections[0].questions[1],
      type: 'scale',
      displayOrder: 1,
      isRequired: false,
      scaleConfig: {
        min: 1,
        max: 5,
        step: 1,
        display: 'slider',
        min_label: activeCopy.sections[0].questions[1].minLabel,
        max_label: activeCopy.sections[0].questions[1].maxLabel,
      },
      responses: scaleResponses('demo-active-q-stability', [5, 5, 4, 4, 4, 5, 3, 4, 5, 2, 4, 3, 5, 4, 4, 5, 3, 2, 4, 5, 3, 4, 5]),
    }),
    question({
      id: 'demo-active-q-note',
      pollId: DEMO_ACTIVE_POLL_ID,
      sectionId: activeSections[0].id,
      copy: activeCopy.sections[0].questions[2],
      type: 'text',
      displayOrder: 2,
      isRequired: false,
      condition: {
        question_id: 'demo-active-q-nights',
        operator: 'equals',
        values: activeNightOptions.slice(3, 5),
      },
      responses: textResponses('demo-active-q-note', activeCopy.sections[0].questions[2].comments ?? []),
    }),
    question({
      id: 'demo-active-q-extras',
      pollId: DEMO_ACTIVE_POLL_ID,
      sectionId: activeSections[1].id,
      copy: activeCopy.sections[1].questions[0],
      type: 'multiple_choice',
      displayOrder: 3,
      responses: multipleResponses('demo-active-q-extras', [
        [activeExtraOptions[0], activeExtraOptions[2]],
        [activeExtraOptions[0], activeExtraOptions[1]],
        [activeExtraOptions[2]],
        [activeExtraOptions[0], activeExtraOptions[3]],
        [activeExtraOptions[1], activeExtraOptions[2]],
        [activeExtraOptions[0]],
        [activeExtraOptions[2], activeExtraOptions[3]],
        [activeExtraOptions[0], activeExtraOptions[1], activeExtraOptions[2]],
        [activeExtraOptions[3]],
        [activeExtraOptions[0], activeExtraOptions[2]],
        [activeExtraOptions[2]],
        [activeExtraOptions[1]],
        [activeExtraOptions[0], activeExtraOptions[3]],
        [activeExtraOptions[0], activeExtraOptions[2]],
        [activeExtraOptions[2], activeExtraOptions[3]],
        [activeExtraOptions[0]],
        [activeExtraOptions[1], activeExtraOptions[2]],
        [activeExtraOptions[0], activeExtraOptions[2]],
        [activeExtraOptions[3]],
        [activeExtraOptions[0]],
        [activeExtraOptions[2]],
        [activeExtraOptions[1], activeExtraOptions[3]],
        [activeExtraOptions[0], activeExtraOptions[2]],
      ]),
    }),
  ];

  const draftSections = [
    section(DEMO_DRAFT_POLL_ID, 'demo-draft-section-readiness', draftCopy.sections[0], 0),
  ];
  const draftQuestions = draftCopy.sections[0].questions;
  const draftPollQuestions: GuildPollQuestion[] = [
    question({
      id: 'demo-draft-q-group',
      pollId: DEMO_DRAFT_POLL_ID,
      sectionId: draftSections[0].id,
      copy: draftQuestions[0],
      type: 'single_choice',
      displayOrder: 0,
    }),
    question({
      id: 'demo-draft-q-readiness',
      pollId: DEMO_DRAFT_POLL_ID,
      sectionId: draftSections[0].id,
      copy: draftQuestions[1],
      type: 'scale',
      displayOrder: 1,
      scaleConfig: {
        min: 1,
        max: 5,
        step: 1,
        display: 'stars',
        min_label: draftQuestions[1].minLabel,
        max_label: draftQuestions[1].maxLabel,
      },
    }),
    question({
      id: 'demo-draft-q-notes',
      pollId: DEMO_DRAFT_POLL_ID,
      sectionId: draftSections[0].id,
      copy: draftQuestions[2],
      type: 'multiple_choice',
      displayOrder: 2,
    }),
  ];

  const closedSections = [
    section(DEMO_CLOSED_POLL_ID, 'demo-closed-section-loot', closedCopy.sections[0], 0),
    section(DEMO_CLOSED_POLL_ID, 'demo-closed-section-bench', closedCopy.sections[1], 1),
  ];
  const closedLootOptions = closedCopy.sections[0].questions[0].options ?? [];
  const closedRankingOptions = closedCopy.sections[0].questions[1].options ?? [];
  const closedComments = closedCopy.sections[1].questions[2].comments ?? [];
  const closedQuestions: GuildPollQuestion[] = [
    question({
      id: 'demo-closed-q-loot-priority',
      pollId: DEMO_CLOSED_POLL_ID,
      sectionId: closedSections[0].id,
      copy: closedCopy.sections[0].questions[0],
      type: 'single_choice',
      displayOrder: 0,
      responses: singleResponses('demo-closed-q-loot-priority', [
        ...Array(9).fill(closedLootOptions[0]),
        ...Array(5).fill(closedLootOptions[1]),
        ...Array(4).fill(closedLootOptions[2]),
        ...Array(3).fill(closedLootOptions[3]),
      ]),
    }),
    question({
      id: 'demo-closed-q-gearing-rank',
      pollId: DEMO_CLOSED_POLL_ID,
      sectionId: closedSections[0].id,
      copy: closedCopy.sections[0].questions[1],
      type: 'ranking',
      displayOrder: 1,
      responses: rankingResponses(
        'demo-closed-q-gearing-rank',
        Array.from({ length: 21 }, (_, index) => {
          const first = index % 3 === 0 ? closedRankingOptions[1] : closedRankingOptions[0];
          const second = first === closedRankingOptions[0] ? closedRankingOptions[1] : closedRankingOptions[0];
          return [first, second, closedRankingOptions[2], closedRankingOptions[3], closedRankingOptions[4]];
        }),
      ),
    }),
    question({
      id: 'demo-closed-q-bench-comfort',
      pollId: DEMO_CLOSED_POLL_ID,
      sectionId: closedSections[1].id,
      copy: closedCopy.sections[1].questions[0],
      type: 'rating',
      displayOrder: 2,
      responses: ratingResponses('demo-closed-q-bench-comfort', [5, 4, 4, 3.5, 3, 2, 4.5, 5, 2.5, 3, 4, 1.5, 5, 3, 4, 2, 4.5, 3.5, 2.5, 5, 3]),
    }),
    question({
      id: 'demo-closed-q-bench-clarity',
      pollId: DEMO_CLOSED_POLL_ID,
      sectionId: closedSections[1].id,
      copy: closedCopy.sections[1].questions[1],
      type: 'scale',
      displayOrder: 3,
      scaleConfig: {
        min: 1,
        max: 5,
        step: 1,
        display: 'slider',
        min_label: closedCopy.sections[1].questions[1].minLabel,
        max_label: closedCopy.sections[1].questions[1].maxLabel,
      },
      responses: scaleResponses('demo-closed-q-bench-clarity', [3, 4, 2, 3, 5, 2, 4, 3, 2, 3, 4, 1, 5, 3, 2, 4, 3, 2, 4, 3, 2]),
    }),
    question({
      id: 'demo-closed-q-policy-feedback',
      pollId: DEMO_CLOSED_POLL_ID,
      sectionId: closedSections[1].id,
      copy: closedCopy.sections[1].questions[2],
      type: 'text',
      displayOrder: 4,
      isRequired: false,
      responses: textResponses('demo-closed-q-policy-feedback', closedComments),
    }),
  ];

  return [
    {
      ...buildPollShell(DEMO_ACTIVE_POLL_ID, activeCopy, 'active', 23),
      sections: activeSections,
      questions: activeQuestions,
    },
    {
      ...buildPollShell(DEMO_DRAFT_POLL_ID, draftCopy, 'draft', 0),
      sections: draftSections,
      questions: draftPollQuestions,
    },
    {
      ...buildPollShell(DEMO_CLOSED_POLL_ID, closedCopy, 'closed', 21),
      sections: closedSections,
      questions: closedQuestions,
    },
  ];
};

export const applyDemoPollSubmissions = (
  polls: DemoGuildPoll[],
  submissions: DemoPollSubmission,
): DemoGuildPoll[] =>
  polls.map((poll) => {
    const pollSubmissions = submissions[poll.id] || [];
    if (pollSubmissions.length === 0) return poll;

    const submittedAt = new Date().toISOString();
    const submittedQuestions = new Set(pollSubmissions.map((submission) => submission.questionId));
    const questions = (poll.questions || []).map((pollQuestion) => {
      const submitted = pollSubmissions.find((submission) => submission.questionId === pollQuestion.id);
      if (!submitted) return pollQuestion;

      const submittedResponse: GuildPollResponse = {
        id: `${pollQuestion.id}-demo-viewer-response`,
        question_id: pollQuestion.id,
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
        ...pollQuestion,
        my_response: submittedResponse,
        responses: [
          ...(pollQuestion.responses || []).filter((existing) => existing.user_id !== DEMO_VIEWER_USER_ID),
          submittedResponse,
        ],
      };
    });

    return {
      ...poll,
      questions,
      response_count: submittedQuestions.size > 0 ? (poll.response_count || 0) + 1 : poll.response_count,
      viewer_can_view_results: true,
    };
  });
