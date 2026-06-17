import { useMemo } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import type { AdminTimeseriesPoint } from './adminDashboardTimeseries';

import { GlowCard } from '@/components/GlowCard';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const hasCriticalSeriesData = chartData.some((point) => point.criticalBacklog > 0 || point.criticalCreated > 0);

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <GlowCard key={index} surface="section" className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-48 w-full" />
          </GlowCard>
        ))}
      </div>
    );
  }

  if (!hasData) {
    return (
      <GlowCard surface="section">
        <p className="text-sm text-muted-foreground">{t.admin.stats.chartsInsufficientHistory}</p>
      </GlowCard>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <GlowCard surface="section">
        <h4 className="text-sm font-medium text-foreground">{t.admin.stats.chartActivityTrendTitle}</h4>
        <p className="text-xs text-muted-foreground mb-3">{t.admin.stats.chartActivityTrendDesc}</p>
        <ChartContainer
          className="h-52 w-full"
          config={{
            dau: { label: t.admin.stats.dauUsers, color: 'hsl(var(--status-info))' },
            wau: { label: t.admin.stats.wauUsers, color: 'hsl(var(--status-warning))' },
            mau: { label: t.admin.stats.mauUsers, color: 'hsl(var(--foreground))' },
          }}
        >
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="labelShort" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="dauUsers"
              name="dau"
              stroke="var(--color-dau)"
              dot={{ r: 2 }}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="wauUsers"
              name="wau"
              stroke="var(--color-wau)"
              dot={{ r: 2 }}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="mauUsers"
              name="mau"
              stroke="var(--color-mau)"
              dot={{ r: 2 }}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </GlowCard>

      <GlowCard surface="section">
        <h4 className="text-sm font-medium text-foreground">{t.admin.stats.chartCriticalIssuesTitle}</h4>
        <p className="text-xs text-muted-foreground mb-3">{t.admin.stats.chartCriticalIssuesDesc}</p>
        <ChartContainer
          className="h-52 w-full"
          config={{
            criticalBacklog: { label: t.admin.stats.chartCriticalBacklogLegend, color: 'hsl(var(--status-error))' },
            criticalCreated: { label: t.admin.stats.chartCriticalCreatedLegend, color: 'hsl(var(--status-warning))' },
          }}
        >
          {hasCriticalSeriesData ? (
            <ComposedChart data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="labelShort" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <ReferenceLine y={5} stroke="hsl(var(--status-warning))" strokeDasharray="4 4" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="criticalBacklog"
                name="criticalBacklog"
                stroke="var(--color-criticalBacklog)"
                fill="var(--color-criticalBacklog)"
                fillOpacity={0.22}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="criticalCreated"
                name="criticalCreated"
                stroke="var(--color-criticalCreated)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          ) : (
            <div className="h-full flex items-center justify-center px-3">
              <p className="text-xs text-muted-foreground">{t.admin.stats.chartNoIncidentsPeriod}</p>
            </div>
          )}
        </ChartContainer>
      </GlowCard>

      <GlowCard surface="section">
        <h4 className="text-sm font-medium text-foreground">{t.admin.stats.chartSignupActivationTitle}</h4>
        <p className="text-xs text-muted-foreground mb-3">{t.admin.stats.chartSignupActivationDesc}</p>
        <ChartContainer
          className="h-52 w-full"
          config={{
            signups: { label: t.admin.stats.newSignups7d, color: 'hsl(var(--status-info))' },
            activation: { label: t.admin.stats.activationRate7d, color: 'hsl(var(--status-success))' },
          }}
        >
          <ComposedChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="labelShort" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar yAxisId="left" dataKey="newSignups" name="signups" fill="var(--color-signups)" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="activationRate7dPct"
              name="activation"
              stroke="var(--color-activation)"
              dot={{ r: 2 }}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      </GlowCard>

      <GlowCard surface="section">
        <h4 className="text-sm font-medium text-foreground">{t.admin.stats.chartEngagementTrendTitle}</h4>
        <p className="text-xs text-muted-foreground mb-3">{t.admin.stats.chartEngagementTrendDesc}</p>
        <ChartContainer
          className="h-52 w-full"
          config={{
            engagement: { label: t.admin.stats.engagementRate, color: 'hsl(var(--status-success))' },
          }}
        >
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="labelShort" tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={44} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ReferenceArea y1={20} y2={100} fill="hsl(var(--status-success))" fillOpacity={0.05} />
            <ReferenceLine y={20} stroke="hsl(var(--status-success))" strokeDasharray="4 4" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="engagementPct"
              name="engagement"
              stroke="var(--color-engagement)"
              dot={{ r: 2 }}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </GlowCard>

      <GlowCard surface="section" className="xl:col-span-2">
        <h4 className="text-sm font-medium text-foreground">{t.admin.stats.chartRetentionTitle}</h4>
        <p className="text-xs text-muted-foreground">{t.admin.stats.chartRetentionInsufficient}</p>
      </GlowCard>
    </div>
  );
};
