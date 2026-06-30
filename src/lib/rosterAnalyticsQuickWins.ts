export type TokenRiskLevel = 'none' | 'low' | 'moderate' | 'high';

export interface CoverageCountStat {
  count: number;
}

export interface CoverageSummary {
  total: number;
  covered: number;
  missing: number;
}

export interface TokenRiskInput {
  id: string;
  name: string;
  total: number;
}

export interface TokenRiskSummary<Token extends TokenRiskInput = TokenRiskInput> {
  token: Token | null;
  topTokens: Token[];
  total: number;
  percent: number;
  level: TokenRiskLevel;
}

export const summarizeCoverage = (stats: CoverageCountStat[]): CoverageSummary => {
  const total = stats.length;
  const covered = stats.filter(stat => stat.count > 0).length;

  return {
    total,
    covered,
    missing: total - covered,
  };
};

export const sortCoverageMissingFirst = <Stat extends CoverageCountStat>(stats: Stat[]): Stat[] => (
  [...stats].sort((a, b) => {
    const aCovered = a.count > 0;
    const bCovered = b.count > 0;
    if (aCovered !== bCovered) return aCovered ? 1 : -1;
    if (a.count !== b.count) return a.count - b.count;
    return 0;
  })
);

export const getCoverageStateKey = (count: number): 'missing' | 'covered' | 'secured' => {
  if (count <= 0) return 'missing';
  if (count === 1) return 'covered';
  return 'secured';
};

export const getTokenRiskSummary = <Token extends TokenRiskInput>(
  tokens: Token[],
): TokenRiskSummary<Token> => {
  const total = tokens.reduce((sum, token) => sum + token.total, 0);
  const token = tokens.reduce<Token | null>(
    (current, candidate) => (!current || candidate.total > current.total ? candidate : current),
    null,
  );
  const topTokens = token && token.total > 0
    ? tokens.filter(candidate => candidate.total === token.total)
    : [];
  const percent = total > 0 && token ? token.total / total : 0;
  const level: TokenRiskLevel =
    total === 0 || !token || token.total === 0
      ? 'none'
      : percent >= 0.5
        ? 'high'
        : percent >= 0.4
          ? 'moderate'
          : 'low';

  return { token, topTokens, total, percent, level };
};
