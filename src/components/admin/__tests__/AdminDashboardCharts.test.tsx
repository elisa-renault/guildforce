import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminDashboardCharts } from '../AdminDashboardCharts';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      admin: {
        stats: {
          chartsInsufficientHistory: 'Insufficient history',
          chartActivityTrendTitle: 'Activity trend',
          chartActivityTrendDesc: 'Activity description',
          chartCriticalIssuesTitle: 'Critical trend',
          chartCriticalIssuesDesc: 'Critical description',
          chartCriticalBacklogLegend: 'Open backlog',
          chartCriticalCreatedLegend: 'Incidents created / day',
          chartNoIncidentsPeriod: 'No incidents in period',
          chartSignupActivationTitle: 'Signups vs activation',
          chartSignupActivationDesc: 'Signup description',
          chartEngagementTrendTitle: 'Engagement trend',
          chartEngagementTrendDesc: 'Engagement description',
          chartRetentionTitle: 'Retention trend',
          chartRetentionInsufficient: 'Retention insufficient',
          dauUsers: 'DAU',
          wauUsers: 'WAU',
          mauUsers: 'MAU',
          newSignups7d: 'New signups',
          activationRate7d: 'Activation',
          engagementRate: 'Engagement',
        },
      },
    },
  }),
}));

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: unknown }) => <div>{children as JSX.Element}</div>,
  ChartTooltip: () => <div />,
  ChartTooltipContent: () => <div />,
}));

vi.mock('recharts', () => ({
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  ReferenceArea: () => <div />,
  ReferenceLine: () => <div />,
  LineChart: ({ children }: { children: unknown }) => <div>{children as JSX.Element}</div>,
  ComposedChart: ({ children }: { children: unknown }) => <div>{children as JSX.Element}</div>,
  Bar: ({ dataKey }: { dataKey: string }) => <div data-testid={`series-${dataKey}`} />,
  Area: ({ dataKey }: { dataKey: string }) => <div data-testid={`series-${dataKey}`} />,
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid={`series-${dataKey}`} />,
}));

describe('AdminDashboardCharts', () => {
  it('renders critical backlog and created series', () => {
    render(
      <AdminDashboardCharts
        loading={false}
        timeseries={[
          {
            date: '2026-02-18',
            dauUsers: 1,
            wauUsers: 3,
            mauUsers: 10,
            engagementPct: 30,
            newSignups: 2,
            activatedUsers7d: 1,
            activationRate7dPct: 50,
            activeGuilds30d: 2,
            openBugs: 2,
            pendingDeletions: 0,
            criticalIssues: 3,
            createdBugs: 1,
            createdDeletions: 0,
            criticalCreated: 2,
            criticalBacklog: 3,
          },
        ]}
      />,
    );

    expect(screen.getByTestId('series-criticalBacklog')).toBeInTheDocument();
    expect(screen.getByTestId('series-criticalCreated')).toBeInTheDocument();
    expect(screen.getByText('Engagement trend')).toBeInTheDocument();
  });

  it('renders explicit empty critical state when no incident exists', () => {
    render(
      <AdminDashboardCharts
        loading={false}
        timeseries={[
          {
            date: '2026-02-18',
            dauUsers: 1,
            wauUsers: 3,
            mauUsers: 10,
            engagementPct: null,
            newSignups: 0,
            activatedUsers7d: null,
            activationRate7dPct: null,
            activeGuilds30d: 1,
            openBugs: 0,
            pendingDeletions: 0,
            criticalIssues: 0,
            createdBugs: 0,
            createdDeletions: 0,
            criticalCreated: 0,
            criticalBacklog: 0,
          },
        ]}
      />,
    );

    expect(screen.getByText('No incidents in period')).toBeInTheDocument();
  });
});
