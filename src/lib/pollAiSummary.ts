import type {
  PollAiSummaryStatus,
  PollQuestionAiSummary,
  PollQuestionAiSummaryContent,
} from '../types/poll';

export const POLL_AI_SUMMARY_MODEL = 'gpt-5.4';
export const POLL_AI_SUMMARY_PROMPT_VERSION = 'v1';
export const POLL_AI_SUMMARY_MIN_COMMENTS = 3;
export const POLL_AI_SUMMARY_MAX_THEMES = 3;
export const POLL_AI_SUMMARY_MAX_POLARITY_CLUSTERS = 3;
export const POLL_AI_SUMMARY_MAX_KEYWORDS = 5;
export const POLL_AI_SUMMARY_MAX_KEYWORD_LENGTH = 32;
export const POLL_AI_SUMMARY_MAX_KEYWORD_WORDS = 4;
export const POLL_AI_SUMMARY_MAX_COMMENTS_PER_CHUNK = 40;
export const POLL_AI_SUMMARY_MAX_CHARS_PER_CHUNK = 6000;

export const POLL_AI_SUMMARY_STATUSES = [
  'ready',
  'insufficient_data',
  'unavailable',
  'not_generated',
] as const satisfies PollAiSummaryStatus[];

export interface PollAiSummaryCommentInput {
  id: string;
  response_value?: unknown;
}

export interface NormalizedPollAiComment {
  id: string;
  value: string;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFacet = (value: unknown): value is PollQuestionAiSummaryContent['themes'][number] =>
  isRecord(value) &&
  typeof value.label === 'string' &&
  typeof value.count === 'number' &&
  typeof value.summary === 'string';

export const isPollAiSummaryStatus = (value: unknown): value is PollAiSummaryStatus =>
  typeof value === 'string' &&
  (POLL_AI_SUMMARY_STATUSES as readonly string[]).includes(value);

export const normalizePollAiComments = (comments: PollAiSummaryCommentInput[]): NormalizedPollAiComment[] =>
  comments
    .map((comment) => {
      if (!isRecord(comment.response_value) || comment.response_value.type !== 'text') {
        return null;
      }

      const value = typeof comment.response_value.value === 'string' ? comment.response_value.value.trim() : '';
      if (!value) return null;

      return {
        id: comment.id,
        value,
      };
    })
    .filter((comment): comment is NormalizedPollAiComment => Boolean(comment))
    .sort((left, right) => left.id.localeCompare(right.id));

export const buildPollAiSummarySourceSignature = (comments: NormalizedPollAiComment[]) =>
  JSON.stringify(comments.map((comment) => comment.value));

export const chunkPollAiComments = (comments: NormalizedPollAiComment[]) => {
  const chunks: NormalizedPollAiComment[][] = [];
  let currentChunk: NormalizedPollAiComment[] = [];
  let currentChars = 0;

  comments.forEach((comment) => {
    const projectedChars = currentChars + comment.value.length;
    const wouldOverflowCount = currentChunk.length >= POLL_AI_SUMMARY_MAX_COMMENTS_PER_CHUNK;
    const wouldOverflowChars = projectedChars > POLL_AI_SUMMARY_MAX_CHARS_PER_CHUNK;

    if (currentChunk.length > 0 && (wouldOverflowCount || wouldOverflowChars)) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChars = 0;
    }

    currentChunk.push(comment);
    currentChars += comment.value.length;
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const normalizeKeywordCandidate = (keyword: string) =>
  keyword
    .trim()
    .replace(/^[\s"'`.,;:!?()[\]{}<>/\\|+-]+/u, '')
    .replace(/[\s"'`.,;:!?()[\]{}<>/\\|+-]+$/u, '')
    .replace(/\s+/gu, ' ');

const normalizeKeywordSearchValue = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

const isValidKeyword = (keyword: string) => {
  if (!keyword) return false;
  if (keyword.length > POLL_AI_SUMMARY_MAX_KEYWORD_LENGTH) return false;
  if (!/[\p{L}\p{N}]/u.test(keyword)) return false;

  const words = keyword.split(/\s+/u).filter(Boolean);
  if (words.length === 0 || words.length > POLL_AI_SUMMARY_MAX_KEYWORD_WORDS) return false;

  return true;
};

const expandKeywordCandidates = (keyword: string) => {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  const separatorSplit = trimmed
    .split(/[,\n;|]+/u)
    .map(normalizeKeywordCandidate)
    .filter(Boolean);

  const slashCandidates =
    (trimmed.includes('/') || trimmed.includes(' / '))
      ? trimmed
          .split('/')
          .map(normalizeKeywordCandidate)
          .filter(Boolean)
      : [];

  const candidates = slashCandidates.length > 1 ? slashCandidates : separatorSplit.length > 1 ? separatorSplit : [normalizeKeywordCandidate(trimmed)];

  return candidates.filter(isValidKeyword);
};

const buildKeywordCorpus = (corpus: string[]) =>
  corpus
    .map(normalizeKeywordSearchValue)
    .filter(Boolean)
    .map((value) => ` ${value} `);

const keywordExistsInCorpus = (keyword: string, normalizedCorpus: string[]) => {
  if (normalizedCorpus.length === 0) {
    return true;
  }

  const normalizedKeyword = normalizeKeywordSearchValue(keyword);
  if (!normalizedKeyword) {
    return false;
  }

  const boundedKeyword = ` ${normalizedKeyword} `;
  return normalizedCorpus.some((entry) => entry.includes(boundedKeyword));
};

export const mergeUniqueKeywords = (keywords: string[], corpus: string[] = []) => {
  const seen = new Set<string>();
  const merged: string[] = [];
  const normalizedCorpus = buildKeywordCorpus(corpus);

  keywords.forEach((keyword) => {
    expandKeywordCandidates(keyword).forEach((candidate) => {
      if (!keywordExistsInCorpus(candidate, normalizedCorpus)) return;

      const dedupeKey = candidate.toLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      merged.push(candidate);
    });
  });

  return merged.slice(0, POLL_AI_SUMMARY_MAX_KEYWORDS);
};

export const normalizePollQuestionAiSummaryContent = (
  value: unknown,
  corpus: string[] = [],
): PollQuestionAiSummaryContent | null => {
  if (!isRecord(value)) return null;

  const headline = typeof value.headline === 'string' ? value.headline.trim() : '';
  const themes = Array.isArray(value.themes) ? value.themes.filter(isFacet).slice(0, POLL_AI_SUMMARY_MAX_THEMES) : [];
  const polarityClusters = Array.isArray(value.polarity_clusters)
    ? value.polarity_clusters.filter(isFacet).slice(0, POLL_AI_SUMMARY_MAX_POLARITY_CLUSTERS)
    : [];
  const keywords = Array.isArray(value.keywords)
    ? mergeUniqueKeywords(
        value.keywords.filter((keyword): keyword is string => typeof keyword === 'string'),
        corpus,
      )
    : [];

  if (!headline) return null;

  return {
    headline,
    themes,
    polarity_clusters: polarityClusters,
    keywords,
  };
};

export const normalizePollQuestionAiSummariesPayload = (payload: unknown): PollQuestionAiSummary[] | null => {
  if (!isRecord(payload) || !Array.isArray(payload.summaries)) {
    return null;
  }

  return payload.summaries
    .map((entry) => {
      if (!isRecord(entry) || typeof entry.question_id !== 'string' || !isPollAiSummaryStatus(entry.status)) {
        return null;
      }

      const summary = normalizePollQuestionAiSummaryContent(entry.summary);

      return {
        question_id: entry.question_id,
        status: entry.status,
        comment_count: typeof entry.comment_count === 'number' ? entry.comment_count : 0,
        generated_at: typeof entry.generated_at === 'string' ? entry.generated_at : undefined,
        summary: summary || undefined,
      } satisfies PollQuestionAiSummary;
    })
    .filter((entry): entry is PollQuestionAiSummary => Boolean(entry));
};

export const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
};
