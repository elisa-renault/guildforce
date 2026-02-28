import { interpolateMessage } from '@/i18n/format';

const DEFAULT_RANK_PATTERN = /^rank\s+(\d+)$/i;
const DEFAULT_GUILD_MASTER_PATTERN = /^guild\s*master$/i;

interface FormatRankLabelOptions {
  rankName: string | null | undefined;
  rankIndex: number;
  rankLabel: string;
  guildMasterLabel?: string;
  customLabel?: string | null;
}

export type GuildRankLabelMap = Record<number, string>;

export const formatRankLabel = ({
  rankName,
  rankIndex,
  rankLabel,
  guildMasterLabel,
  customLabel,
}: FormatRankLabelOptions): string => {
  const trimmedCustomLabel = (customLabel ?? '').trim();

  if (trimmedCustomLabel) {
    return trimmedCustomLabel;
  }

  const trimmed = (rankName ?? '').trim();

  if (!trimmed) {
    return interpolateMessage(rankLabel, { index: rankIndex });
  }

  if (rankIndex === 0 && guildMasterLabel && DEFAULT_GUILD_MASTER_PATTERN.test(trimmed)) {
    return guildMasterLabel;
  }

  const match = trimmed.match(DEFAULT_RANK_PATTERN);
  if (match) {
    const parsedIndex = Number(match[1]);
    const nextIndex = Number.isFinite(parsedIndex) ? parsedIndex : rankIndex;
    return interpolateMessage(rankLabel, { index: nextIndex });
  }

  return trimmed;
};
