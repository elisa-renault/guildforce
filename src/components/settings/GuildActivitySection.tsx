import { History, Loader2 } from 'lucide-react';

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

interface GuildActivitySectionProps {
  guildId: string;
  showVaultAudit?: boolean;
}

function buildAuditDetails(
  actionContext: Record<string, unknown>,
  labels: {
    detailReasonGiven: string;
    detailSurface: string;
    detailVersion: string;
  },
) {
  const details: string[] = [];

  if (actionContext.reason_provided === true) {
    details.push(labels.detailReasonGiven);
  }

  if (typeof actionContext.client_surface === 'string' && actionContext.client_surface.trim()) {
    details.push(`${labels.detailSurface}: ${actionContext.client_surface}`);
  }

  if (typeof actionContext.version_number === 'number') {
    details.push(`${labels.detailVersion} ${actionContext.version_number}`);
  }

  return details.join(' • ') || '—';
}

function getAuditActionLabel(
  actionType: string,
  labels: {
    vaultSecretCreated: string;
    vaultSecretArchived: string;
    vaultSecretRotated: string;
    vaultAccessUpdated: string;
  },
) {
  switch (actionType) {
    case 'created':
      return labels.vaultSecretCreated;
    case 'archived':
      return labels.vaultSecretArchived;
    case 'rotated':
      return labels.vaultSecretRotated;
    case 'updated':
      return labels.vaultAccessUpdated;
    default:
      return actionType;
  }
}

export const GuildActivitySection = ({
  guildId,
  showVaultAudit = false,
}: GuildActivitySectionProps) => {
  const { t } = useLanguage();
  const activity = t.activityLog;
  const { auditEvents, auditLoading } = useGuildVault({
    guildId,
    includeAudit: showVaultAudit,
    mode: 'audit-only',
  });

  return (
    <div className="space-y-4">
      <h2 className="font-sans text-base font-medium">{t.common.activityLog}</h2>

      <div className="min-h-[500px]">
        <ActivityLog guildId={guildId} />
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
                          {getAuditActionLabel(event.action_type, activity)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm font-medium">
                        {event.secret_label}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                        {buildAuditDetails(event.action_context, activity)}
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
