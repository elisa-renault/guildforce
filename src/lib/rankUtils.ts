/**
 * Utilities for handling WoW guild ranks
 */

export interface GuildRank {
  rank_index: number;
  rank_name: string;
}

/**
 * Generate an array of rank indices from 0 to maxRank (inclusive)
 */
export function generateRankIndices(maxRank: number): number[] {
  return Array.from({ length: maxRank + 1 }, (_, i) => i);
}

/**
 * Get the name of a rank by its index from a list of ranks
 */
export function getRankName(
  index: number,
  ranks: GuildRank[]
): string {
  const rank = ranks.find(r => r.rank_index === index);
  return rank?.rank_name || `Rank ${index}`;
}

/**
 * Sort ranks by their index (ascending)
 */
export function sortRanksByIndex(ranks: GuildRank[]): GuildRank[] {
  return [...ranks].sort((a, b) => a.rank_index - b.rank_index);
}

/**
 * Get the maximum rank index from a list of ranks
 */
export function getMaxRankIndex(ranks: GuildRank[], fallback = 9): number {
  if (ranks.length === 0) return fallback;
  return Math.max(...ranks.map(r => r.rank_index));
}
