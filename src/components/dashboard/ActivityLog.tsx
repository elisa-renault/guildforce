import {
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  FileText,
  Pencil,
  Trash2,
  History,
  RefreshCw,
  PlusCircle,
  Edit3,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Shield,
  Lock,
  Unlock,
  RotateCw,
  KeyRound,
  UserMinus,
  Compass,
  Archive,
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName, getLocalizedSpecName, getSpecById } from '@/data/wowClasses';
import { useActivityLog, ActionType } from '@/hooks/useActivityLog';
import { formatDistanceFromNowLocalized, interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { commitmentTextClass, toneBadgeClass } from '@/lib/design-tokens';

interface ActivityLogProps {
  guildId: string;
}

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  wish_validation: <CheckCircle2 className="h-4 w-4" />,
  wish_created: <PlusCircle className="h-4 w-4" />,
  wish_updated: <Edit3 className="h-4 w-4" />,
  wish_deleted: <Trash2 className="h-4 w-4" />,
  roster_selection_changed: <CheckCircle2 className="h-4 w-4" />,
  wish_season_drafted: <FileText className="h-4 w-4" />,
  member_joined: <UserPlus className="h-4 w-4" />,
  member_removed: <UserMinus className="h-4 w-4" />,
  commitment_changed: <UserCog className="h-4 w-4" />,
  roster_wishes_locked: <Lock className="h-4 w-4" />,
  roster_wishes_unlocked: <Unlock className="h-4 w-4" />,
  member_wishes_locked: <Lock className="h-4 w-4" />,
  member_wishes_unlocked: <Unlock className="h-4 w-4" />,
  roster_created: <FileText className="h-4 w-4" />,
  roster_updated: <Pencil className="h-4 w-4" />,
  roster_deleted: <Trash2 className="h-4 w-4" />,
  permissions_updated: <Shield className="h-4 w-4" />,
  vault_secret_created: <KeyRound className="h-4 w-4" />,
  vault_secret_archived: <Trash2 className="h-4 w-4" />,
  vault_secret_rotated: <RotateCw className="h-4 w-4" />,
  vault_access_rules_updated: <Shield className="h-4 w-4" />,
  atlas_doc_created: <Compass className="h-4 w-4" />,
  atlas_doc_updated: <FileText className="h-4 w-4" />,
  atlas_doc_published: <CheckCircle2 className="h-4 w-4" />,
  atlas_doc_archived: <Archive className="h-4 w-4" />,
  atlas_doc_restored: <FileText className="h-4 w-4" />,
  atlas_doc_visibility_updated: <Shield className="h-4 w-4" />,
};

const ACTION_COLORS: Record<ActionType, string> = {
  wish_validation: toneBadgeClass('info'),
  wish_created: toneBadgeClass('success'),
  wish_updated: toneBadgeClass('warning'),
  wish_deleted: toneBadgeClass('error'),
  roster_selection_changed: toneBadgeClass('info'),
  wish_season_drafted: toneBadgeClass('info'),
  member_joined: toneBadgeClass('info'),
  member_removed: toneBadgeClass('error'),
  commitment_changed: toneBadgeClass('info'),
  roster_wishes_locked: toneBadgeClass('warning'),
  roster_wishes_unlocked: toneBadgeClass('success'),
  member_wishes_locked: toneBadgeClass('warning'),
  member_wishes_unlocked: toneBadgeClass('success'),
  roster_created: toneBadgeClass('info'),
  roster_updated: toneBadgeClass('warning'),
  roster_deleted: toneBadgeClass('error'),
  permissions_updated: toneBadgeClass('warning'),
  vault_secret_created: toneBadgeClass('info'),
  vault_secret_archived: toneBadgeClass('warning'),
  vault_secret_rotated: toneBadgeClass('info'),
  vault_access_rules_updated: toneBadgeClass('warning'),
  atlas_doc_created: toneBadgeClass('info'),
  atlas_doc_updated: toneBadgeClass('warning'),
  atlas_doc_published: toneBadgeClass('success'),
  atlas_doc_archived: toneBadgeClass('warning'),
  atlas_doc_restored: toneBadgeClass('info'),
  atlas_doc_visibility_updated: toneBadgeClass('warning'),
};

export const ActivityLog: React.FC<ActivityLogProps> = ({ guildId }) => {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  const ui = {
    title: resolveSemanticMessage({ key: 'activity.log.title', language, translations: t }),
    system: resolveSemanticMessage({ key: 'activity.log.system', language, translations: t }),
    unknown: resolveSemanticMessage({ key: 'activity.log.unknown', language, translations: t }),
    emptyText: resolveSemanticMessage({ key: 'activity.log.empty', language, translations: t }),
    entriesText: (count: number) =>
      interpolateMessage(
        resolveSemanticMessage({ key: 'activity.log.entries_label', language, translations: t }),
        { count },
      ),
    statusConfirmed: resolveSemanticMessage({ key: 'activity.log.status.confirmed', language, translations: t }),
    statusWithdrawn: resolveSemanticMessage({ key: 'activity.log.status.withdrawn', language, translations: t }),
    statusUndecided: resolveSemanticMessage({ key: 'activity.log.status.undecided', language, translations: t }),
    wishCreatedText: resolveSemanticMessage({ key: 'activity.log.wish_created', language, translations: t }),
    wishUpdatedText: resolveSemanticMessage({ key: 'activity.log.wish_updated', language, translations: t }),
    wishDeletedText: resolveSemanticMessage({ key: 'activity.log.wish_deleted', language, translations: t }),
    wishCreatedForTargetText: resolveSemanticMessage({ key: 'activity.log.wish_created_for_target', language, translations: t }),
    wishUpdatedForTargetText: resolveSemanticMessage({ key: 'activity.log.wish_updated_for_target', language, translations: t }),
    wishDeletedForTargetText: resolveSemanticMessage({ key: 'activity.log.wish_deleted_for_target', language, translations: t }),
    memberJoinedText: resolveSemanticMessage({ key: 'activity.log.member_joined', language, translations: t }),
    commitmentChangedText: resolveSemanticMessage({ key: 'activity.log.commitment_changed', language, translations: t }),
    rosterWishesLockedText: resolveSemanticMessage({ key: 'activity.log.roster_wishes_locked', language, translations: t }),
    rosterWishesLockedScheduledText: resolveSemanticMessage({ key: 'activity.log.roster_wishes_locked_scheduled', language, translations: t }),
    rosterWishesUnlockedText: resolveSemanticMessage({ key: 'activity.log.roster_wishes_unlocked', language, translations: t }),
    memberWishesLockedText: resolveSemanticMessage({ key: 'activity.log.member_wishes_locked', language, translations: t }),
    memberWishesUnlockedText: resolveSemanticMessage({ key: 'activity.log.member_wishes_unlocked', language, translations: t }),
    rosterCreatedText: resolveSemanticMessage({ key: 'activity.log.roster_created', language, translations: t }),
    rosterUpdatedText: resolveSemanticMessage({ key: 'activity.log.roster_updated', language, translations: t }),
    rosterDeletedText: resolveSemanticMessage({ key: 'activity.log.roster_deleted', language, translations: t }),
    permissionsUpdatedText: resolveSemanticMessage({ key: 'activity.log.permissions_updated', language, translations: t }),
    rulesLabel: resolveSemanticMessage({ key: 'activity.log.rules_label', language, translations: t }),
    actionLabels: {
      wish_validation: resolveSemanticMessage({ key: 'activity.log.action.wish_validation', language, translations: t }),
      wish_created: resolveSemanticMessage({ key: 'activity.log.action.wish_created', language, translations: t }),
      wish_updated: resolveSemanticMessage({ key: 'activity.log.action.wish_updated', language, translations: t }),
      wish_deleted: resolveSemanticMessage({ key: 'activity.log.action.wish_deleted', language, translations: t }),
      roster_selection_changed: t.wishes.memberDetail.historyEvent.selectionChanged,
      wish_season_drafted: resolveSemanticMessage({ key: 'activity.log.action.wish_season_drafted', language, translations: t }),
      member_joined: resolveSemanticMessage({ key: 'activity.log.action.member_joined', language, translations: t }),
      commitment_changed: resolveSemanticMessage({ key: 'activity.log.action.commitment_changed', language, translations: t }),
      roster_wishes_locked: resolveSemanticMessage({ key: 'activity.log.action.roster_wishes_locked', language, translations: t }),
      roster_wishes_unlocked: resolveSemanticMessage({ key: 'activity.log.action.roster_wishes_unlocked', language, translations: t }),
      member_wishes_locked: resolveSemanticMessage({ key: 'activity.log.action.member_wishes_locked', language, translations: t }),
      member_wishes_unlocked: resolveSemanticMessage({ key: 'activity.log.action.member_wishes_unlocked', language, translations: t }),
      roster_created: resolveSemanticMessage({ key: 'activity.log.action.roster_created', language, translations: t }),
      roster_updated: resolveSemanticMessage({ key: 'activity.log.action.roster_updated', language, translations: t }),
      roster_deleted: resolveSemanticMessage({ key: 'activity.log.action.roster_deleted', language, translations: t }),
      permissions_updated: resolveSemanticMessage({ key: 'activity.log.action.permissions_updated', language, translations: t }),
      atlas_doc_created: resolveSemanticMessage({ key: 'activity.log.action.atlas_doc_created', language, translations: t }),
      atlas_doc_updated: resolveSemanticMessage({ key: 'activity.log.action.atlas_doc_updated', language, translations: t }),
      atlas_doc_published: resolveSemanticMessage({ key: 'activity.log.action.atlas_doc_published', language, translations: t }),
      atlas_doc_archived: resolveSemanticMessage({ key: 'activity.log.action.atlas_doc_archived', language, translations: t }),
      atlas_doc_restored: resolveSemanticMessage({ key: 'activity.log.action.atlas_doc_restored', language, translations: t }),
      atlas_doc_visibility_updated: resolveSemanticMessage({ key: 'activity.log.action.atlas_doc_visibility_updated', language, translations: t }),
    },
    filterLabels: {
      all: resolveSemanticMessage({ key: 'activity.log.filter.all', language, translations: t }),
      wish_created: resolveSemanticMessage({ key: 'activity.log.filter.wish_created', language, translations: t }),
      wish_updated: resolveSemanticMessage({ key: 'activity.log.filter.wish_updated', language, translations: t }),
      wish_deleted: resolveSemanticMessage({ key: 'activity.log.filter.wish_deleted', language, translations: t }),
      roster_selection_changed: t.wishes.memberDetail.historyEvent.selectionChanged,
      wish_season_drafted: resolveSemanticMessage({ key: 'activity.log.filter.wish_season_drafted', language, translations: t }),
      wish_validation: resolveSemanticMessage({ key: 'activity.log.filter.wish_validation', language, translations: t }),
      member_joined: resolveSemanticMessage({ key: 'activity.log.filter.member_joined', language, translations: t }),
      commitment_changed: resolveSemanticMessage({ key: 'activity.log.filter.commitment_changed', language, translations: t }),
      roster_wishes_locked: resolveSemanticMessage({ key: 'activity.log.filter.roster_wishes_locked', language, translations: t }),
      roster_wishes_unlocked: resolveSemanticMessage({ key: 'activity.log.filter.roster_wishes_unlocked', language, translations: t }),
      member_wishes_locked: resolveSemanticMessage({ key: 'activity.log.filter.member_wishes_locked', language, translations: t }),
      member_wishes_unlocked: resolveSemanticMessage({ key: 'activity.log.filter.member_wishes_unlocked', language, translations: t }),
      roster_created: resolveSemanticMessage({ key: 'activity.log.filter.roster_created', language, translations: t }),
      roster_updated: resolveSemanticMessage({ key: 'activity.log.filter.roster_updated', language, translations: t }),
      roster_deleted: resolveSemanticMessage({ key: 'activity.log.filter.roster_deleted', language, translations: t }),
      permissions_updated: resolveSemanticMessage({ key: 'activity.log.filter.permissions_updated', language, translations: t }),
    },
    permissionLabels: {
      manage_wishes: resolveSemanticMessage({ key: 'activity.log.permission.manage_wishes', language, translations: t }),
      manage_polls: resolveSemanticMessage({ key: 'activity.log.permission.manage_polls', language, translations: t }),
      manage_rosters: resolveSemanticMessage({ key: 'activity.log.permission.manage_rosters', language, translations: t }),
      view_activity_log: resolveSemanticMessage({ key: 'activity.log.permission.view_activity_log', language, translations: t }),
      manage_atlas: resolveSemanticMessage({ key: 'activity.log.permission.manage_atlas', language, translations: t }),
    },
  };

  const actionTypes = filter === 'all' ? undefined : [filter as ActionType];
  const { logs, loading, refetch, totalPages, totalCount } = useActivityLog({ 
    guildId, 
    limit: PAGE_SIZE, 
    actionTypes,
    page: currentPage 
  });

  // Reset to page 1 when filter changes
  const handleFilterChange = (value: string) => {
    setFilter(value);
    setCurrentPage(1);
  };

  const getActionLabel = (actionType: ActionType): string => {
    if (actionType === 'member_removed') return t.activityLog.memberRemoved;
    if (actionType === 'vault_secret_created') return t.activityLog.vaultSecretCreated;
    if (actionType === 'vault_secret_archived') return t.activityLog.vaultSecretArchived;
    if (actionType === 'vault_secret_rotated') return t.activityLog.vaultSecretRotated;
    if (actionType === 'vault_access_rules_updated') return t.activityLog.vaultAccessUpdated;
    return ui.actionLabels[actionType as keyof typeof ui.actionLabels] || actionType;
  };

  const getValidationStatusLabel = (status: string): string => {
    if (status === 'approved') return t.wishes.validation.approved;
    if (status === 'rejected') return t.wishes.validation.rejected;
    return t.wishes.validation.pending;
  };

  const getValidationStatusIcon = (status: string): React.ReactNode => {
    if (status === 'approved') return <CheckCircle2 className="h-3 w-3 text-status-success" />;
    if (status === 'rejected') return <XCircle className="h-3 w-3 text-status-error" />;
    return <Clock className="h-3 w-3 text-status-warning" />;
  };

  const getActorName = (log: typeof logs[0]) => log.user_profile?.username || ui.system;

  const getWishActionText = (
    log: typeof logs[0],
    defaultText: string,
    targetText: string,
  ) => {
    const targetName = log.target_user_profile?.username || ui.unknown;
    const hasSeparateTarget = Boolean(log.target_user_id && log.target_user_id !== log.user_id);

    return hasSeparateTarget
      ? interpolateMessage(targetText, { target: targetName })
      : defaultText;
  };

  const renderLogDetails = (log: typeof logs[0]) => {
    const details = log.action_details;

    switch (log.action_type) {
      case 'wish_validation': {
        const classData = getClassById(details.class_id as string);
        const specIds = (details.spec_ids as string[]) || [];
        const specs = specIds.map(id => getSpecById(id)).filter(Boolean);
        const newStatus = details.new_status as string;
        const oldStatus = details.old_status as string;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {log.user_profile?.username || ui.system}
              </span>
              <span className="text-muted-foreground">-&gt;</span>
              <span className="font-medium">
                {log.target_user_profile?.username || ui.unknown}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {classData && (
                <Badge variant="outline" className={`bg-${classData.color}/20`}>
                  {getLocalizedClassName(classData.id, language)}
                </Badge>
              )}
              {specs.length > 0 && (
                <span className="text-muted-foreground">
                  ({specs.map(s => getLocalizedSpecName(s!.id, language)).join(', ')})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {getValidationStatusIcon(oldStatus)}
              <span className="text-muted-foreground">{getValidationStatusLabel(oldStatus)}</span>
              <span className="text-muted-foreground">-&gt;</span>
              {getValidationStatusIcon(newStatus)}
              <span className={newStatus === 'approved' ? 'text-status-success' : newStatus === 'rejected' ? 'text-status-error' : 'text-status-warning'}>
                {getValidationStatusLabel(newStatus)}
              </span>
            </div>
          </div>
        );
      }

      case 'wish_created': {
        const classData = getClassById(details.class_id as string);
        const specIds = (details.spec_ids as string[]) || [];
        const specs = specIds.map(id => getSpecById(id)).filter(Boolean);

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{getActorName(log)}</span>
              <span className="text-muted-foreground text-sm">
                {getWishActionText(log, ui.wishCreatedText, ui.wishCreatedForTargetText)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {classData && (
                <Badge variant="outline" className={`bg-${classData.color}/20`}>
                  {getLocalizedClassName(classData.id, language)}
                </Badge>
              )}
              {specs.length > 0 && (
                <span className="text-muted-foreground">
                  ({specs.map(s => getLocalizedSpecName(s!.id, language)).join(', ')})
                </span>
              )}
            </div>
          </div>
        );
      }

      case 'wish_updated': {
        const oldClassData = getClassById(details.old_class_id as string);
        const newClassData = getClassById(details.new_class_id as string);
        const newSpecIds = (details.new_spec_ids as string[]) || [];
        const newSpecs = newSpecIds.map(id => getSpecById(id)).filter(Boolean);
        const classChanged = details.old_class_id !== details.new_class_id;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{getActorName(log)}</span>
              <span className="text-muted-foreground text-sm">
                {getWishActionText(log, ui.wishUpdatedText, ui.wishUpdatedForTargetText)}
              </span>
            </div>
            {classChanged ? (
              <div className="flex items-center gap-2 text-sm">
                {oldClassData && (
                  <Badge variant="outline" className={`bg-${oldClassData.color}/20 opacity-50`}>
                    {getLocalizedClassName(oldClassData.id, language)}
                  </Badge>
                )}
                <span className="text-muted-foreground">-&gt;</span>
                {newClassData && (
                  <Badge variant="outline" className={`bg-${newClassData.color}/20`}>
                    {getLocalizedClassName(newClassData.id, language)}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                {newClassData && (
                  <Badge variant="outline" className={`bg-${newClassData.color}/20`}>
                    {getLocalizedClassName(newClassData.id, language)}
                  </Badge>
                )}
                {newSpecs.length > 0 && (
                  <span className="text-muted-foreground">
                    ({newSpecs.map(s => getLocalizedSpecName(s!.id, language)).join(', ')})
                  </span>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'wish_deleted': {
        const classData = getClassById(details.class_id as string);
        const specIds = (details.spec_ids as string[]) || [];
        const specs = specIds.map(id => getSpecById(id)).filter(Boolean);

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{getActorName(log)}</span>
              <span className="text-muted-foreground text-sm">
                {getWishActionText(log, ui.wishDeletedText, ui.wishDeletedForTargetText)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {classData && (
                <Badge variant="outline" className={`bg-${classData.color}/20 opacity-50`}>
                  {getLocalizedClassName(classData.id, language)}
                </Badge>
              )}
              {specs.length > 0 && (
                <span className="text-muted-foreground opacity-50">
                  ({specs.map(s => getLocalizedSpecName(s!.id, language)).join(', ')})
                </span>
              )}
            </div>
          </div>
        );
      }

      case 'member_joined':
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{log.target_user_profile?.username || ui.unknown}</span>
            <span className="text-muted-foreground text-sm">
              {ui.memberJoinedText}
            </span>
          </div>
        );

      case 'commitment_changed': {
        const oldStatus = details.old_status as string;
        const newStatus = details.new_status as string;
        
        const getStatusLabel = (status: string) => {
          if (status === 'confirmed') return ui.statusConfirmed;
          if (status === 'withdrawn') return ui.statusWithdrawn;
          return ui.statusUndecided;
        };

        const getStatusColor = (status: string) => {
          if (status === 'confirmed') return commitmentTextClass('confirmed');
          if (status === 'withdrawn') return commitmentTextClass('withdrawn');
          return commitmentTextClass('undecided');
        };

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{log.target_user_profile?.username || ui.unknown}</span>
              <span className="text-muted-foreground text-sm">
                {ui.commitmentChangedText}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
          <span className={`${getStatusColor(oldStatus)} opacity-60`}>{getStatusLabel(oldStatus)}</span>
              <span className="text-muted-foreground">-&gt;</span>
              <span className={getStatusColor(newStatus)}>{getStatusLabel(newStatus)}</span>
            </div>
          </div>
        );
      }

      case 'roster_wishes_locked': {
        const scheduled = Boolean(details.scheduled);
        const message = scheduled ? ui.rosterWishesLockedScheduledText : ui.rosterWishesLockedText;
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{log.roster?.name || ui.unknown}</Badge>
            <span className="text-muted-foreground text-sm">
              {message}
            </span>
          </div>
        );
      }

      case 'roster_wishes_unlocked':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{log.roster?.name || ui.unknown}</Badge>
            <span className="text-muted-foreground text-sm">
              {ui.rosterWishesUnlockedText}
            </span>
          </div>
        );

      case 'member_wishes_locked':
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{log.target_user_profile?.username || ui.unknown}</span>
            <span className="text-muted-foreground text-sm">
              {ui.memberWishesLockedText}
            </span>
          </div>
        );

      case 'member_wishes_unlocked':
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{log.target_user_profile?.username || ui.unknown}</span>
            <span className="text-muted-foreground text-sm">
              {ui.memberWishesUnlockedText}
            </span>
          </div>
        );

      case 'roster_created':
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {ui.rosterCreatedText}
            </span>
            <Badge variant="outline">{details.name as string}</Badge>
          </div>
        );

      case 'roster_updated':
        return (
          <div className="flex flex-col gap-1 text-sm">
            {details.old_name !== details.new_name && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{details.old_name as string}</span>
                <span className="text-muted-foreground">-&gt;</span>
                <span className="font-medium">{details.new_name as string}</span>
              </div>
            )}
            {details.old_name === details.new_name && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{log.roster?.name || details.new_name as string}</Badge>
                <span className="text-muted-foreground">
                  {ui.rosterUpdatedText}
                </span>
              </div>
            )}
          </div>
        );

      case 'roster_deleted':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={toneBadgeClass('error')}>
              {details.name as string}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {ui.rosterDeletedText}
            </span>
          </div>
        );

      case 'permissions_updated': {
        const changes = details.changes as Record<string, { added: number; removed: number; modified: number }>;
        const totalRules = details.total_rules as number;
        
        const getPermissionLabel = (type: string) => {
          if (type === 'manage_vault') return t.permissions.manageVault;
          if (type === 'view_vault_audit') return t.permissions.viewVaultAudit;
          return ui.permissionLabels[type as keyof typeof ui.permissionLabels] || type;
        };

        const changedTypes = Object.keys(changes || {});
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{log.user_profile?.username || ui.system}</span>
              <span className="text-muted-foreground text-sm">
                {ui.permissionsUpdatedText}
              </span>
            </div>
            {changedTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 text-xs">
                {changedTypes.map(type => (
                  <Badge key={type} variant="outline" className={toneBadgeClass('warning')}>
                    {getPermissionLabel(type)}
                  </Badge>
                ))}
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {totalRules} {ui.rulesLabel}
            </span>
          </div>
        );
      }

      case 'member_removed':
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{log.user_profile?.username || ui.system}</span>
            <span className="text-muted-foreground text-sm">→</span>
            <span className="font-medium">{log.target_user_profile?.username || ui.unknown}</span>
          </div>
        );

      case 'vault_secret_created':
      case 'vault_secret_archived':
      case 'vault_secret_rotated':
      case 'vault_access_rules_updated':
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{log.user_profile?.username || ui.system}</span>
            {log.secret_label ? (
              <Badge variant="outline">{log.secret_label}</Badge>
            ) : null}
            {log.action_type === 'vault_secret_rotated' && typeof details.version_number === 'number' ? (
              <span className="text-xs text-muted-foreground">
                {t.activityLog.detailVersion} {details.version_number}
              </span>
            ) : null}
            {log.action_type === 'vault_access_rules_updated' && typeof details.total_rules === 'number' ? (
              <span className="text-xs text-muted-foreground">
                {details.total_rules} {ui.rulesLabel}
              </span>
            ) : null}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            {ui.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-[160px] h-8 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">
                {ui.filterLabels.all}
              </SelectItem>
              <SelectItem value="wish_created">
                {ui.filterLabels.wish_created}
              </SelectItem>
              <SelectItem value="wish_updated">
                {ui.filterLabels.wish_updated}
              </SelectItem>
              <SelectItem value="wish_deleted">
                {ui.filterLabels.wish_deleted}
              </SelectItem>
              <SelectItem value="wish_season_drafted">
                {ui.filterLabels.wish_season_drafted}
              </SelectItem>
              <SelectItem value="wish_validation">
                {ui.filterLabels.wish_validation}
              </SelectItem>
              <SelectItem value="roster_selection_changed">
                {ui.filterLabels.roster_selection_changed}
              </SelectItem>
              <SelectItem value="member_joined">
                {ui.filterLabels.member_joined}
              </SelectItem>
              <SelectItem value="commitment_changed">
                {ui.filterLabels.commitment_changed}
              </SelectItem>
              <SelectItem value="roster_wishes_locked">
                {ui.filterLabels.roster_wishes_locked}
              </SelectItem>
              <SelectItem value="roster_wishes_unlocked">
                {ui.filterLabels.roster_wishes_unlocked}
              </SelectItem>
              <SelectItem value="member_wishes_locked">
                {ui.filterLabels.member_wishes_locked}
              </SelectItem>
              <SelectItem value="member_wishes_unlocked">
                {ui.filterLabels.member_wishes_unlocked}
              </SelectItem>
              <SelectItem value="roster_created">
                {ui.filterLabels.roster_created}
              </SelectItem>
              <SelectItem value="roster_updated">
                {ui.filterLabels.roster_updated}
              </SelectItem>
              <SelectItem value="roster_deleted">
                {ui.filterLabels.roster_deleted}
              </SelectItem>
              <SelectItem value="permissions_updated">
                {ui.filterLabels.permissions_updated}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="h-8 w-8 flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Log List */}
      <ScrollArea className="flex-1 pr-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card/50">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mb-4 opacity-50" />
            <p>{ui.emptyText}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
              >
                {/* Mobile: Top row with icon, badge, roster, timestamp */}
                <div className="flex items-center gap-2 sm:hidden">
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${ACTION_COLORS[log.action_type]}`}>
                    {ACTION_ICONS[log.action_type]}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getActionLabel(log.action_type)}
                  </Badge>
                  {log.roster && (
                    <span className="text-xs text-muted-foreground truncate">
                      {log.roster.name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                    {formatDistanceFromNowLocalized(log.created_at, language, true)}
                  </span>
                </div>

                {/* Desktop: Action Icon */}
                <div className={`hidden sm:flex p-2 rounded-full flex-shrink-0 ${ACTION_COLORS[log.action_type]}`}>
                  {ACTION_ICONS[log.action_type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="hidden sm:flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {getActionLabel(log.action_type)}
                    </Badge>
                    {log.roster && (
                      <span className="text-xs text-muted-foreground truncate">
                        {log.roster.name}
                      </span>
                    )}
                  </div>
                  {renderLogDetails(log)}
                </div>

                {/* Desktop: Timestamp */}
                <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatDistanceFromNowLocalized(log.created_at, language, true)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
          <span className="text-sm text-muted-foreground">
            {ui.entriesText(totalCount)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
