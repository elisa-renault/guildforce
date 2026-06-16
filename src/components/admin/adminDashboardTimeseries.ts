export interface AdminTimeseriesPoint {
  date: string;
  dauUsers: number;
  wauUsers: number;
  mauUsers: number;
  engagementPct: number | null;
  newSignups: number;
  activatedUsers7d: number | null;
  activationRate7dPct: number | null;
  activeGuilds30d: number;
  openBugs: number;
  pendingDeletions: number;
  criticalIssues: number;
  createdBugs: number;
  createdDeletions: number;
  criticalCreated: number;
  criticalBacklog: number;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

interface RawTimeseriesRow {
  bucket_date: string;
  dau_users: number;
  wau_users: number;
  mau_users: number;
  engagement_wau_mau_pct: number | null;
  new_signups: number;
  activated_users_7d: number | null;
  activation_rate_7d_pct: number | null;
  active_guilds_30d: number;
  open_bugs: number;
  pending_deletions: number;
  critical_issues: number;
  created_bugs: number;
  created_deletions: number;
  critical_created_issues: number;
}

export const mapAdminTimeseriesRows = (rows: RawTimeseriesRow[] | null | undefined): AdminTimeseriesPoint[] => {
  if (!rows || rows.length === 0) return [];

  return rows
    .map((row) => ({
      date: row.bucket_date,
      dauUsers: toNumber(row.dau_users),
      wauUsers: toNumber(row.wau_users),
      mauUsers: toNumber(row.mau_users),
      engagementPct: toNullableNumber(row.engagement_wau_mau_pct),
      newSignups: toNumber(row.new_signups),
      activatedUsers7d: toNullableNumber(row.activated_users_7d),
      activationRate7dPct: toNullableNumber(row.activation_rate_7d_pct),
      activeGuilds30d: toNumber(row.active_guilds_30d),
      openBugs: toNumber(row.open_bugs),
      pendingDeletions: toNumber(row.pending_deletions),
      criticalIssues: toNumber(row.critical_issues),
      createdBugs: toNumber(row.created_bugs),
      createdDeletions: toNumber(row.created_deletions),
      criticalCreated: toNumber(row.critical_created_issues),
      criticalBacklog: toNumber(row.critical_issues),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getRecentTimeseries = (points: AdminTimeseriesPoint[], days: number): AdminTimeseriesPoint[] => {
  if (days <= 0) return [];
  return points.slice(-days);
};
