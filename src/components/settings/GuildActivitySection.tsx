import { History, Loader2 } from 'lucide-react';

import type { ReactNode } from 'react';

import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildVault } from '@/hooks/useGuildVault';
import { toneBadgeClass } from '@/lib/design-tokens';
import { buildVaultAuditDetails, getVaultAuditActionLabel } from '@/lib/guildVaultAuditLabels';

interface GuildActivitySectionProps {
  guildId: string;
  showVaultAudit?: boolean;
}

interface GuildActivitySurfaceProps {
  activityLog: ReactNode;
  showVaultAudit?: boolean;
  auditEvents?: Array<{
    id: string;
    created_at: string;
    actor_username: string | null;
    action_type: string;
    secret_label: string;
    action_context: Record<string, unknown> | null;
  }>;
  auditLoading?: boolean;
}

export const GuildActivitySurface = ({
  activityLog,
  showVaultAudit = false,
  auditEvents = [],
  auditLoading = false,
}: GuildActivitySurfaceProps) => {
  const { t } = useLanguage();
  const activity = t.activityLog;

  return (
    <div className="space-y-4">
      <h2 className="font-sans text-base font-medium">{t.common.activityLog}</h2>

      <div className="min-h-[500px]">
        {activityLog}
      </div>

      {showVaultAudit && (
        <div className="space-y-3 rounded-xl border border-border/40 bg-card/20 p-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="font-medium">{activity.vaultAuditTitle}</h3>
          </div>

          {auditLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{activity.vaultAuditEmpty}</p>
          ) : (
            <div className="rounded-lg border border-border/30 bg-background/30">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-10 px-3">{activity.when}</TableHead>
                    <TableHead className="h-10 px-3">{activity.user}</TableHead>
                    <TableHead className="h-10 px-3">{activity.action}</TableHead>
                    <TableHead className="h-10 px-3">{activity.secret}</TableHead>
                    <TableHead className="h-10 px-3">{activity.details}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.slice(0, 20).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm">
                        {event.actor_username || '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge variant="outline" className={`h-6 px-2 text-[11px] ${toneBadgeClass('info')}`}>
                          {getVaultAuditActionLabel(event.action_type, activity)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm font-medium">
                        {event.secret_label}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                        {buildVaultAuditDetails(event.action_context, activity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const GuildActivitySection = ({
  guildId,
  showVaultAudit = false,
}: GuildActivitySectionProps) => {
  const { auditEvents, auditLoading } = useGuildVault({
    guildId,
    includeAudit: showVaultAudit,
    mode: 'audit-only',
  });

  return (
    <GuildActivitySurface
      activityLog={<ActivityLog guildId={guildId} />}
      showVaultAudit={showVaultAudit}
      auditEvents={auditEvents}
      auditLoading={auditLoading}
    />
  );
};
