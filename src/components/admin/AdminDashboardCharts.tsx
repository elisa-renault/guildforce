import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { GlowCard } from '@/components/GlowCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useLanguage } from '@/contexts/LanguageContext';

import type { AdminTimeseriesPoint } from './adminDashboardTimeseries';

interface AdminDashboardChartsProps {
  timeseries: AdminTimeseriesPoint[];
  loading: boolean;
}

const labelDate = (dateValue: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${dateValue}T00:00:00Z`));

const labelDateShort = (dateValue: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric' }).format(new Date(`${dateValue}T00:00:00Z`));

export const AdminDashboardCharts = ({ timeseries, loading }: AdminDashboardChartsProps) => {
  const { t } = useLanguage();
  const hasData = timeseries.length > 0;

  const chartData = useMemo(
    () =>
      timeseries.map((point) => ({
        ...point,
        label: labelDate(point.date),
        labelShort: labelDateShort(point.date),
      })),
    [timeseries],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <GlowCard key={index} className="p-4 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-48 w-full" />
          </GlowCard>
        ))}
      </div>
    );
  }

  if (!hasData) {
    return (
      <GlowCard className="p-4">
        <p className="text-sm text-muted-foreground">{t.admin.stats.chartsInsufficientHistory}</p>
      </GlowCard>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <GlowCard className="p-4">
        <h4 className="text-sm font-semibold text-foreground">{t.admin.stats.chartActivityTrendTitle}</h4>
        <p className="text-xs text-muted-foreground mb-3">{t.admin.stats.chartActivityTrendDesc}</p>
        <ChartContainer
          className="h-52 w-full"
          config={{
            dau: { label: t.admin.stats.dauUsers, color: 'hsl(var(--chart-1))' },
            wau: { label: t.admin.stats.wauUsers, color: 'hsl(var(--chart-2))' },
            mau: { label: t.admin.stats.mauUsers, color: 'hsl(var(--chart-3))' },
          }}
        >
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="labelShort" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={42} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="dauUsers" name="dau" stroke="var(--color-dau)" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="wauUsers" name="wau" stroke="var(--color-wau)" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="mauUsers" name="mau" stroke="var(--color-mau)" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartContainer>
      </GlowCard>

      <GlowCard className="p-4">
        <h4 className="text-sm font-semibold text-foreground">{t.admin.stats.chartCriticalIssuesTitle}</h4>
        <p className="text-xs text-muted-foreground mb-3">{t.admin.stats.chartCriticalIssuesDesc}</p>
        <ChartContainer
          className="h-52 w-full"
          config={{
            critical: { label: t.admin.stats.criticalIssues, color: 'hsl(var(--status-error))' },
          }}
        >
          <AreaChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="labelShort" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={42} />
            <ReferenceLine y={5} stroke="hsl(var(--status-warning))" strokeDasharray="4 4" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="criticalIssues"
              name="critical"
              stroke="var(--color-critical)"
              fill="var(--color-critical)"
              fillOpacity={0.25}
            />
          </AreaChart>
        </ChartContainer>
      </GlowCard>

      <GlowCard className="p-4">
        <h4 className="text-sm font-semibold text-foreground">{t.admin.stats.chartSignupActivationTitle}</h4>
        <p className="text-xs text-muted-foreground mb-3">{t.admin.stats.chartSignupActivationDesc}</p>
        <ChartContainer
          className="h-52 w-full"
          config={{
            signups: { label: t.admin.stats.newSignups7d, color: 'hsl(var(--chart-4))' },
            activation: { label: t.admin.stats.activationRate7d, color: 'hsl(var(--status-success))' },
          }}
        >
          <ComposedChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="labelShort" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} width={42} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={42} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar yAxisId="left" dataKey="newSignups" name="signups" fill="var(--color-signups)" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="activationRate7dPct"
              name="activation"
              stroke="var(--color-activation)"
              dot={false}
              strokeWidth={2}
            />
          </ComposedChart>
        </ChartContainer>
      </GlowCard>

      <GlowCard className="p-4">
        <h4 className="text-sm font-semibold text-foreground">{t.admin.stats.chartEngagementTrendTitle}</h4>
        <p className="text-xs text-muted-foreground mb-3">{t.admin.stats.chartEngagementTrendDesc}</p>
        <ChartContainer
          className="h-52 w-full"
          config={{
            engagement: { label: t.admin.stats.engagementRate, color: 'hsl(var(--chart-5))' },
          }}
        >
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="labelShort" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={42} />
            <ReferenceArea y1={20} y2={100} fill="hsl(var(--status-success))" fillOpacity={0.08} />
            <ReferenceLine y={20} stroke="hsl(var(--status-success))" strokeDasharray="4 4" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="engagementPct"
              name="engagement"
              stroke="var(--color-engagement)"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </GlowCard>

      <GlowCard className="p-4 xl:col-span-2">
        <h4 className="text-sm font-semibold text-foreground">{t.admin.stats.chartRetentionTitle}</h4>
        <p className="text-xs text-muted-foreground">{t.admin.stats.chartRetentionInsufficient}</p>
      </GlowCard>
    </div>
  );
};

