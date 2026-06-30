import { describe, expect, it } from 'vitest';

import {
  getCoverageStateKey,
  getTokenRiskSummary,
  sortCoverageMissingFirst,
  summarizeCoverage,
} from '@/lib/rosterAnalyticsQuickWins';

describe('roster analytics quick wins', () => {
  it('summarizes covered and missing coverage rows', () => {
    expect(summarizeCoverage([{ count: 0 }, { count: 1 }, { count: 3 }])).toEqual({
      total: 3,
      covered: 2,
      missing: 1,
    });
  });

  it('sorts missing coverage rows before covered rows', () => {
    const result = sortCoverageMissingFirst([
      { name: 'Secured', count: 3 },
      { name: 'Missing A', count: 0 },
      { name: 'Covered', count: 1 },
      { name: 'Missing B', count: 0 },
    ]);

    expect(result.map(stat => stat.name)).toEqual(['Missing A', 'Missing B', 'Covered', 'Secured']);
  });

  it('labels coverage state from source count', () => {
    expect(getCoverageStateKey(0)).toBe('missing');
    expect(getCoverageStateKey(1)).toBe('covered');
    expect(getCoverageStateKey(2)).toBe('secured');
  });

  it('classifies token concentration risk', () => {
    expect(getTokenRiskSummary([
      { id: 'a', name: 'A', total: 5 },
      { id: 'b', name: 'B', total: 3 },
      { id: 'c', name: 'C', total: 2 },
    ])).toMatchObject({
      token: { id: 'a' },
      topTokens: [{ id: 'a' }],
      total: 10,
      percent: 0.5,
      level: 'high',
    });

    expect(getTokenRiskSummary([
      { id: 'a', name: 'A', total: 5 },
      { id: 'b', name: 'B', total: 1 },
      { id: 'c', name: 'C', total: 5 },
    ])).toMatchObject({
      token: { id: 'a' },
      topTokens: [{ id: 'a' }, { id: 'c' }],
      total: 11,
      percent: 5 / 11,
      level: 'moderate',
    });

    expect(getTokenRiskSummary([
      { id: 'a', name: 'A', total: 0 },
      { id: 'b', name: 'B', total: 0 },
    ])).toMatchObject({
      token: { id: 'a' },
      topTokens: [],
      total: 0,
      percent: 0,
      level: 'none',
    });
  });
});
