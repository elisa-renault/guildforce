import { describe, expect, it } from 'vitest';

import {
  buildPollAiSummarySourceSignature,
  chunkPollAiComments,
  mergeUniqueKeywords,
  normalizePollAiComments,
  normalizePollQuestionAiSummaryContent,
  normalizePollQuestionAiSummariesPayload,
} from '@/lib/pollAiSummary';

describe('pollAiSummary helpers', () => {
  it('normalizes text comments and removes blank entries deterministically', () => {
    const comments = normalizePollAiComments([
      { id: 'b', response_value: { type: 'text', value: '  second  ' } },
      { id: 'a', response_value: { type: 'text', value: ' first ' } },
      { id: 'c', response_value: { type: 'text', value: '   ' } },
      { id: 'd', response_value: { type: 'single_choice', value: 'ignored' } },
    ]);

    expect(comments).toEqual([
      { id: 'a', value: 'first' },
      { id: 'b', value: 'second' },
    ]);
    expect(buildPollAiSummarySourceSignature(comments)).toBe('["first","second"]');
  });

  it('chunks oversized comment sets and deduplicates keywords', () => {
    const chunks = chunkPollAiComments([
      { id: '1', value: 'a'.repeat(4000) },
      { id: '2', value: 'b'.repeat(2500) },
      { id: '3', value: 'c'.repeat(100) },
    ]);

    expect(chunks).toHaveLength(2);
    expect(mergeUniqueKeywords(['Planning', 'planning', 'Schedule', '', 'Cadence'])).toEqual([
      'Planning',
      'Schedule',
      'Cadence',
    ]);
  });

  it('splits slash-separated keyword dumps and drops oversized phrases', () => {
    expect(
      mergeUniqueKeywords([
        'événements hors WoW/mini-jeux/autres jeux/Gala-ctique/Among Us/Archipelago/concours transmo/M+/housing/sorties raid HF/score M+ à atteindre nl récompenses (?)',
      ]),
    ).toEqual([
      'événements hors WoW',
      'mini-jeux',
      'autres jeux',
      'Gala-ctique',
      'Among Us',
    ]);
  });

  it('normalizes AI summary payloads and rejects malformed rows', () => {
    const payload = normalizePollQuestionAiSummariesPayload({
      summaries: [
        {
          question_id: 'question-1',
          status: 'ready',
          comment_count: 4,
          generated_at: '2026-03-12T10:00:00.000Z',
          summary: {
            headline: 'Headline',
            themes: [{ label: 'Theme', count: 2, summary: 'Theme summary' }],
            polarity_clusters: [{ label: 'Positive', count: 2, summary: 'Mostly positive' }],
            keywords: ['planning', 'planning', 'schedule'],
          },
        },
        {
          question_id: 7,
          status: 'ready',
          comment_count: 1,
        },
      ],
    });

    expect(payload).toEqual([
      {
        question_id: 'question-1',
        status: 'ready',
        comment_count: 4,
        generated_at: '2026-03-12T10:00:00.000Z',
        summary: {
          headline: 'Headline',
          themes: [{ label: 'Theme', count: 2, summary: 'Theme summary' }],
          polarity_clusters: [{ label: 'Positive', count: 2, summary: 'Mostly positive' }],
          keywords: ['planning', 'schedule'],
        },
      },
    ]);
  });

  it('drops malformed keywords that do not exist in the source comments', () => {
    expect(
      mergeUniqueKeywords(
        ['CE', 'progress', 'roster', 'stabilite', 'continuitécoudée'],
        [
          'Le CE veut plus de stabilite dans le roster.',
          'Le progress du roster est bon, mais il faut mieux communiquer.',
        ],
      ),
    ).toEqual(['CE', 'progress', 'roster', 'stabilite']);
  });

  it('filters summary keywords against the comment corpus when provided', () => {
    expect(
      normalizePollQuestionAiSummaryContent(
        {
          headline: 'Headline',
          themes: [],
          polarity_clusters: [],
          keywords: ['communication', 'continuitécoudée'],
        },
        ['La communication doit etre plus claire.'],
      ),
    ).toEqual({
      headline: 'Headline',
      themes: [],
      polarity_clusters: [],
      keywords: ['communication'],
    });
  });
});
