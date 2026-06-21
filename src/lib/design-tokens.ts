export type SemanticTone = "success" | "warning" | "error" | "info" | "neutral";
export type StatusTone = SemanticTone;

const TONE_CLASSES: Record<SemanticTone, string> = {
  success: "bg-status-success/20 text-status-success border-status-success/30",
  warning: "bg-status-warning/20 text-status-warning border-status-warning/30",
  error: "bg-status-error/20 text-status-error border-status-error/30",
  info: "bg-status-info/20 text-status-info border-status-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export const toneBadgeClass = (tone: SemanticTone): string => TONE_CLASSES[tone];
export const statusClass = (status: StatusTone): string => toneBadgeClass(status);

const TONE_TEXT_CLASSES: Record<SemanticTone, string> = {
  success: "text-status-success",
  warning: "text-status-warning",
  error: "text-status-error",
  info: "text-status-info",
  neutral: "text-muted-foreground",
};

export const toneTextClass = (tone: SemanticTone): string => TONE_TEXT_CLASSES[tone];
export const severityClass = (severity: StatusTone): string => toneTextClass(severity);

const TONE_CALLOUT_CLASSES: Record<SemanticTone, string> = {
  success: "bg-status-success/10 border-status-success/30 text-status-success",
  warning: "bg-status-warning/10 border-status-warning/30 text-status-warning",
  error: "bg-status-error/10 border-status-error/30 text-status-error",
  info: "bg-status-info/10 border-status-info/30 text-status-info",
  neutral: "bg-muted border-border text-muted-foreground",
};

export const toneCalloutClass = (tone: SemanticTone): string =>
  TONE_CALLOUT_CLASSES[tone];

export type CommitmentTone = "confirmed" | "undecided" | "withdrawn";

const COMMITMENT_BADGE_CLASSES: Record<CommitmentTone, string> = {
  confirmed: "bg-sky-500/20 text-sky-300 border-sky-400/30",
  undecided: "bg-violet-500/20 text-violet-300 border-violet-400/30",
  withdrawn: "bg-zinc-800/80 text-zinc-400 border-zinc-700",
};

export const commitmentBadgeClass = (status: CommitmentTone): string =>
  COMMITMENT_BADGE_CLASSES[status];

const COMMITMENT_TEXT_CLASSES: Record<CommitmentTone, string> = {
  confirmed: "text-sky-300",
  undecided: "text-violet-300",
  withdrawn: "text-zinc-400",
};

export const commitmentTextClass = (status: CommitmentTone): string =>
  COMMITMENT_TEXT_CLASSES[status];

const COMMITMENT_CALLOUT_CLASSES: Record<CommitmentTone, string> = {
  confirmed: "bg-sky-500/10 border-sky-400/30 text-sky-300",
  undecided: "bg-violet-500/10 border-violet-400/30 text-violet-300",
  withdrawn: "bg-zinc-800/80 border-zinc-700 text-zinc-400",
};

export const commitmentCalloutClass = (status: CommitmentTone): string =>
  COMMITMENT_CALLOUT_CLASSES[status];

export type RoleToken = "tank" | "healer" | "dps";

const ROLE_CLASSES: Record<RoleToken, string> = {
  tank: "bg-tank/20 text-tank border-tank/30",
  healer: "bg-healer/20 text-healer border-healer/30",
  dps: "bg-dps/20 text-dps border-dps/30",
};

export const roleBadgeClass = (role: RoleToken): string => ROLE_CLASSES[role];
export const roleClass = (role: RoleToken): string => roleBadgeClass(role);

export type FactionToken = "alliance" | "horde";

const FACTION_CLASSES: Record<FactionToken, string> = {
  alliance: "bg-alliance/20 text-alliance border-alliance/30",
  horde: "bg-horde/20 text-horde border-horde/30",
};

export const factionBadgeClass = (faction: FactionToken): string =>
  FACTION_CLASSES[faction];

export type WoWClassToken =
  | "warrior"
  | "paladin"
  | "hunter"
  | "rogue"
  | "priest"
  | "death-knight"
  | "shaman"
  | "mage"
  | "warlock"
  | "monk"
  | "druid"
  | "demon-hunter"
  | "evoker";

const WOW_CLASS_TEXT_CLASSES: Record<WoWClassToken, string> = {
  warrior: "text-class-warrior",
  paladin: "text-class-paladin",
  hunter: "text-class-hunter",
  rogue: "text-class-rogue",
  priest: "text-class-priest",
  "death-knight": "text-class-death-knight",
  shaman: "text-class-shaman",
  mage: "text-class-mage",
  warlock: "text-class-warlock",
  monk: "text-class-monk",
  druid: "text-class-druid",
  "demon-hunter": "text-class-demon-hunter",
  evoker: "text-class-evoker",
};

export const wowClassTextClass = (classId: string): string =>
  WOW_CLASS_TEXT_CLASSES[classId as WoWClassToken] || "text-foreground";

const WOW_CLASS_COLOR_VALUES: Record<WoWClassToken, string> = {
  warrior: "hsl(var(--class-warrior))",
  paladin: "hsl(var(--class-paladin))",
  hunter: "hsl(var(--class-hunter))",
  rogue: "hsl(var(--class-rogue))",
  priest: "hsl(var(--class-priest))",
  "death-knight": "hsl(var(--class-death-knight))",
  shaman: "hsl(var(--class-shaman))",
  mage: "hsl(var(--class-mage))",
  warlock: "hsl(var(--class-warlock))",
  monk: "hsl(var(--class-monk))",
  druid: "hsl(var(--class-druid))",
  "demon-hunter": "hsl(var(--class-demon-hunter))",
  evoker: "hsl(var(--class-evoker))",
};

export const wowClassColorValue = (classId: string): string =>
  WOW_CLASS_COLOR_VALUES[classId as WoWClassToken] || "hsl(var(--primary))";

const ROLE_COLOR_VALUES: Record<RoleToken, string> = {
  tank: "hsl(var(--tank))",
  healer: "hsl(var(--healer))",
  dps: "hsl(var(--dps))",
};

export const roleColorValue = (role: RoleToken): string => ROLE_COLOR_VALUES[role];

export type RangeToken = "melee" | "ranged";

const RANGE_COLOR_VALUES: Record<RangeToken, string> = {
  melee: "hsl(var(--tank))",
  ranged: "hsl(var(--status-info))",
};

export const rangeColorValue = (range: RangeToken): string => RANGE_COLOR_VALUES[range];

export type TierTokenGroupId = "dreadful" | "mystic" | "venerated" | "zenith";

const TIER_TOKEN_COLOR_VALUES: Record<TierTokenGroupId, string> = {
  dreadful: "hsl(var(--class-priest))",
  mystic: "hsl(var(--class-rogue))",
  venerated: "hsl(var(--class-shaman))",
  zenith: "hsl(var(--class-paladin))",
};

export const tierTokenColorValue = (group: TierTokenGroupId): string =>
  TIER_TOKEN_COLOR_VALUES[group];

export const tierTokenGradientValue = (group: TierTokenGroupId): string => {
  const color = tierTokenColorValue(group);
  return `linear-gradient(90deg, ${color}, ${color})`;
};
