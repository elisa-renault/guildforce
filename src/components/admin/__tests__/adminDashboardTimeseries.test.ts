import { describe, expect, it } from 'vitest';

import { getRecentTimeseries, mapAdminTimeseriesRows } from '../adminDashboardTimeseries';

describe('adminDashboardTimeseries', () => {
  it('maps RPC rows with null safety and ascending date order', () => {
    const mapped = mapAdminTimeseriesRows([
      {
        bucket_date: '2026-02-18',
        dau_users: 10,
        wau_users: 50,
        mau_users: 100,
        engagement_wau_mau_pct: 50,
        new_signups: 4,
        activated_users_7d: 2,
        activation_rate_7d_pct: 50,
        active_guilds_30d: 20,
        open_bugs: 3,
        pending_deletions: 0,
        critical_issues: 4,
        created_bugs: 2,
        created_deletions: 0,
        critical_created_issues: 3,
      },
      {
        bucket_date: '2026-02-17',
        dau_users: 8,
        wau_users: 40,
        mau_users: 90,
        engagement_wau_mau_pct: null,
        new_signups: 3,
        activated_users_7d: null,
        activation_rate_7d_pct: null,
        active_guilds_30d: 18,
        open_bugs: 2,
        pending_deletions: 1,
        critical_issues: 3,
        created_bugs: 1,
        created_deletions: 1,
        critical_created_issues: 2,
      },
    ]);

    expect(mapped[0].date).toBe('2026-02-17');
    expect(mapped[1].date).toBe('2026-02-18');
    expect(mapped[0].activationRate7dPct).toBeNull();
    expect(mapped[1].criticalIssues).toBe(4);
    expect(mapped[1].criticalBacklog).toBe(4);
    expect(mapped[1].criticalCreated).toBe(3);
  });

  it('returns recent N points only', () => {
    const mapped = mapAdminTimeseriesRows([
      {
        bucket_date: '2026-02-15',
        dau_users: 1,
        wau_users: 1,
        mau_users: 1,
        engagement_wau_mau_pct: 100,
        new_signups: 1,
        activated_users_7d: 1,
        activation_rate_7d_pct: 100,
        active_guilds_30d: 1,
        open_bugs: 0,
        pending_deletions: 0,
        critical_issues: 0,
        created_bugs: 0,
        created_deletions: 0,
        critical_created_issues: 0,
      },
      {
        bucket_date: '2026-02-16',
        dau_users: 2,
        wau_users: 2,
        mau_users: 2,
        engagement_wau_mau_pct: 100,
        new_signups: 2,
        activated_users_7d: 2,
        activation_rate_7d_pct: 100,
        active_guilds_30d: 2,
        open_bugs: 0,
        pending_deletions: 0,
        critical_issues: 0,
        created_bugs: 0,
        created_deletions: 0,
        critical_created_issues: 0,
      },
      {
        bucket_date: '2026-02-17',
        dau_users: 3,
        wau_users: 3,
        mau_users: 3,
        engagement_wau_mau_pct: 100,
        new_signups: 3,
        activated_users_7d: 3,
        activation_rate_7d_pct: 100,
        active_guilds_30d: 3,
        open_bugs: 0,
        pending_deletions: 0,
        critical_issues: 0,
        created_bugs: 0,
        created_deletions: 0,
        critical_created_issues: 0,
      },
    ]);

    const recent = getRecentTimeseries(mapped, 2);
    expect(recent).toHaveLength(2);
    expect(recent[0].date).toBe('2026-02-16');
    expect(recent[1].date).toBe('2026-02-17');
  });
});
