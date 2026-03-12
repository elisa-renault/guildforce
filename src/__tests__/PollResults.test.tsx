import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GuildPoll } from '@/types/poll';

import { PollResults } from '@/components/polls';
import { translationsEn } from '@/i18n/translations.en';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { ...translationsEn, lang: 'en' },
  }),
}));

afterEach(() => {
  cleanup();
});

const buildPoll = (isAnonymous = false): GuildPoll => ({
  id: 'poll-render',
  guild_id: 'guild-1',
  roster_id: null,
  created_by: 'user-1',
  title: 'Poll results UX',
  description: 'A long poll to review',
  is_anonymous: isAnonymous,
  allow_multiple_responses: false,
  status: 'closed',
  starts_at: null,
  ends_at: '2026-03-01T20:00:00.000Z',
  created_at: '2026-02-20T20:00:00.000Z',
  updated_at: '2026-03-01T20:00:00.000Z',
  response_count: 5,
  creator: {
    id: 'user-1',
    username: 'RaidLead',
    avatar_url: null,
  },
  sections: [
    {
      id: 'section-main',
      poll_id: 'poll-render',
      title: 'Main section',
      description: 'Primary decisions',
      display_order: 0,
      created_at: '2026-02-20T20:00:00.000Z',
    },
  ],
  questions: [
    {
      id: 'question-1',
      poll_id: 'poll-render',
      section_id: 'section-main',
      question_text: 'Best raid night?',
      question_type: 'single_choice',
      analysis_intent: 'decision',
      is_required: true,
      display_order: 0,
      options: ['Wednesday', 'Friday'],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-02-20T20:00:00.000Z',
      responses: [
        { id: 'r1', question_id: 'question-1', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Wednesday' }, user: { id: 'u1', username: 'Alice', avatar_url: null } },
        { id: 'r2', question_id: 'question-1', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Wednesday' }, user: { id: 'u2', username: 'Bob', avatar_url: null } },
        { id: 'r3', question_id: 'question-1', user_id: 'u3', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Wednesday' }, user: { id: 'u3', username: 'Cara', avatar_url: null } },
        { id: 'r4', question_id: 'question-1', user_id: 'u4', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Wednesday' }, user: { id: 'u4', username: 'Dane', avatar_url: null } },
        { id: 'r5', question_id: 'question-1', user_id: 'u5', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Friday' }, user: { id: 'u5', username: 'Eli', avatar_url: null } },
      ],
    },
    {
      id: 'question-2',
      poll_id: 'poll-render',
      section_id: null,
      question_text: 'Any extra context?',
      question_type: 'text',
      analysis_intent: 'decision',
      is_required: false,
      display_order: 1,
      options: [],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-02-20T20:00:00.000Z',
      responses: [
        { id: 't1', question_id: 'question-2', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'Alpha' }, user: { id: 'u1', username: 'Alice', avatar_url: null } },
        { id: 't2', question_id: 'question-2', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'Beta' }, user: { id: 'u2', username: 'Bob', avatar_url: null } },
        { id: 't3', question_id: 'question-2', user_id: 'u3', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'Gamma' }, user: { id: 'u3', username: 'Cara', avatar_url: null } },
        { id: 't4', question_id: 'question-2', user_id: 'u4', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'Delta' }, user: { id: 'u4', username: 'Dane', avatar_url: null } },
        { id: 't5', question_id: 'question-2', user_id: 'u5', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'text', value: 'Epsilon' }, user: { id: 'u5', username: 'Eli', avatar_url: null } },
      ],
    },
    {
      id: 'question-3',
      poll_id: 'poll-render',
      section_id: 'section-main',
      question_text: 'How long have you been in the guild?',
      question_type: 'single_choice',
      analysis_intent: 'informative',
      is_required: false,
      display_order: 2,
      options: ['Season 1', 'Season 2', 'Season 3'],
      scale_config: null,
      allow_other: false,
      condition: null,
      created_at: '2026-02-20T20:00:00.000Z',
      responses: [
        { id: 'i1', question_id: 'question-3', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Season 1' }, user: { id: 'u1', username: 'Alice', avatar_url: null } },
        { id: 'i2', question_id: 'question-3', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Season 1' }, user: { id: 'u2', username: 'Bob', avatar_url: null } },
        { id: 'i3', question_id: 'question-3', user_id: 'u3', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Season 2' }, user: { id: 'u3', username: 'Cara', avatar_url: null } },
        { id: 'i4', question_id: 'question-3', user_id: 'u4', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Season 2' }, user: { id: 'u4', username: 'Dane', avatar_url: null } },
        { id: 'i5', question_id: 'question-3', user_id: 'u5', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'single_choice', value: 'Season 3' }, user: { id: 'u5', username: 'Eli', avatar_url: null } },
      ],
    },
    {
      id: 'question-4',
      poll_id: 'poll-render',
      section_id: 'section-main',
      question_text: 'How clear were last season objectives?',
      question_type: 'scale',
      analysis_intent: 'decision',
      is_required: false,
      display_order: 3,
      options: [],
      scale_config: { min: 1, max: 5, step: 1, min_label: 'Not at all', max_label: 'Completely' },
      allow_other: false,
      condition: null,
      created_at: '2026-02-20T20:00:00.000Z',
      responses: [
        { id: 's1', question_id: 'question-4', user_id: 'u1', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'scale', value: 5 }, user: { id: 'u1', username: 'Alice', avatar_url: null } },
        { id: 's2', question_id: 'question-4', user_id: 'u2', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'scale', value: 4 }, user: { id: 'u2', username: 'Bob', avatar_url: null } },
        { id: 's3', question_id: 'question-4', user_id: 'u3', created_at: '2026-02-20T20:00:00.000Z', response_value: { type: 'scale', value: 5 }, user: { id: 'u3', username: 'Cara', avatar_url: null } },
      ],
    },
  ],
});

describe('PollResults', () => {
  it('renders summary controls and keeps the mixed percentage/count metric visible', () => {
    render(<PollResults poll={buildPoll()} variant="full" />);

    expect(screen.getByText('Poll results UX')).toBeInTheDocument();
    expect(screen.queryByText('Question navigator')).not.toBeInTheDocument();
    expect(screen.getByText('Strongest consensus')).toBeInTheDocument();
    expect(screen.getByText('Reading tags')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Reading tags' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Main section' })).toHaveAttribute('href', '#poll-section-section-main');
    expect(screen.getByText((content) => content.includes('80%') && content.includes('4'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('4') && content.includes('80%'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Best raid night?' })).toHaveAttribute('href', '#poll-question-question-1');
    expect(screen.queryByRole('button', { name: 'Percentages' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Counts' })).not.toBeInTheDocument();
  });

  it('collapses long text by default and reveals more on demand', () => {
    render(<PollResults poll={buildPoll()} variant="full" />);

    expect(screen.queryByText('Beta')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Show more' })[0]);

    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('does not expose respondent identities when the poll is anonymous', () => {
    render(<PollResults poll={buildPoll(true)} variant="compact" />);

    expect(screen.queryAllByText('Alice')).toHaveLength(0);
    expect(screen.queryAllByText('Bob')).toHaveLength(0);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });

  it('renders scale endpoint labels as anchored extremes', () => {
    render(<PollResults poll={buildPoll()} variant="full" />);

    expect(screen.getAllByText('How clear were last season objectives?').length).toBeGreaterThan(0);
    expect(screen.getByText('Not at all')).toBeInTheDocument();
    expect(screen.getByText('Completely')).toBeInTheDocument();
  });

  it('uses singular question label when a section contains one visible question', () => {
    render(
      <PollResults
        poll={{
          ...buildPoll(),
          questions: [buildPoll().questions![0]],
        }}
        variant="full"
      />,
    );

    expect(screen.getByText((content) => content.includes('1 question') && content.includes('0 need review'))).toBeInTheDocument();
  });

  it('shows the cohort analysis builder only when explicitly enabled', () => {
    render(<PollResults poll={buildPoll()} variant="full" canUseCohortFilters />);

    expect(screen.getByText('Analyze a subgroup')).toBeInTheDocument();
    expect(screen.getByText('Add filter')).toBeInTheDocument();
    expect(screen.getByText('No cohort filter yet. Add one or more filters to focus the analysis.')).toBeInTheDocument();
  });

  it('hides the cohort analysis builder when not enabled', () => {
    render(<PollResults poll={buildPoll()} variant="full" canUseCohortFilters={false} />);

    expect(screen.queryByText('Analyze a subgroup')).not.toBeInTheDocument();
    expect(screen.queryByText('Add filter')).not.toBeInTheDocument();
  });

  it('renders AI summaries ahead of raw comments and exposes the GM CTA without auto-generating', () => {
    const onGenerateAiSummaries = vi.fn();

    render(
      <PollResults
        poll={buildPoll()}
        variant="full"
        canGenerateAiSummaries
        onGenerateAiSummaries={onGenerateAiSummaries}
        aiSummaries={[
          {
            question_id: 'question-2',
            status: 'ready',
            comment_count: 5,
            generated_at: '2026-03-02T20:00:00.000Z',
            summary: {
              headline: 'Most comments ask for clearer planning and a fixed raid cadence.',
              themes: [{ label: 'Planning clarity', count: 3, summary: 'Respondents want clearer planning details.' }],
              polarity_clusters: [{ label: 'Constructive concern', count: 2, summary: 'Feedback is mostly actionable rather than hostile.' }],
              keywords: ['planning', 'schedule'],
            },
          },
        ]}
      />,
    );

    expect(onGenerateAiSummaries).not.toHaveBeenCalled();
    expect(screen.getByText('AI summary')).toBeInTheDocument();
    expect(screen.getByText('Most comments ask for clearer planning and a fixed raid cadence.')).toBeInTheDocument();
    expect(screen.queryByText('Top recurring themes')).not.toBeInTheDocument();
    expect(screen.queryByText('Planning clarity')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show AI details' }));
    expect(screen.getByText('Top recurring themes')).toBeInTheDocument();
    expect(screen.getByText('Planning clarity')).toBeInTheDocument();
    expect(screen.getByText('Raw comments')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate AI summaries' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate AI summaries' }));

    expect(onGenerateAiSummaries).toHaveBeenCalledTimes(1);
  });

  it('does not show the GM AI CTA to regular readers when no summary exists', () => {
    render(<PollResults poll={buildPoll()} variant="full" aiSummaries={[]} />);

    expect(screen.queryByRole('button', { name: 'Generate AI summaries' })).not.toBeInTheDocument();
    expect(screen.queryByText('No AI summary has been generated for this question yet.')).not.toBeInTheDocument();
  });
});
