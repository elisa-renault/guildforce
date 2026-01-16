import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActivityLog, ActionType } from '@/hooks/useActivityLog';
import { getClassById, getSpecById } from '@/data/wowClasses';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface ActivityLogProps {
  guildId: string;
}

const ACTION_ICONS: Record<ActionType, React.ReactNode> = {
  wish_validation: <CheckCircle2 className="h-4 w-4" />,
  wish_created: <PlusCircle className="h-4 w-4" />,
  wish_updated: <Edit3 className="h-4 w-4" />,
  wish_deleted: <Trash2 className="h-4 w-4" />,
  member_joined: <UserPlus className="h-4 w-4" />,
  commitment_changed: <UserCog className="h-4 w-4" />,
  roster_created: <FileText className="h-4 w-4" />,
  roster_updated: <Pencil className="h-4 w-4" />,
  roster_deleted: <Trash2 className="h-4 w-4" />,
  permissions_updated: <Shield className="h-4 w-4" />,
};

const ACTION_COLORS: Record<ActionType, string> = {
  wish_validation: 'bg-primary/20 text-primary',
  wish_created: 'bg-emerald-500/20 text-emerald-400',
  wish_updated: 'bg-amber-500/20 text-amber-400',
  wish_deleted: 'bg-red-500/20 text-red-400',
  member_joined: 'bg-cyan-500/20 text-cyan-400',
  commitment_changed: 'bg-violet-500/20 text-violet-400',
  roster_created: 'bg-blue-500/20 text-blue-400',
  roster_updated: 'bg-amber-500/20 text-amber-400',
  roster_deleted: 'bg-red-500/20 text-red-400',
  permissions_updated: 'bg-orange-500/20 text-orange-400',
};

export const ActivityLog: React.FC<ActivityLogProps> = ({ guildId }) => {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;
  
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
    const labels: Record<ActionType, { en: string; fr: string }> = {
      wish_validation: { en: 'Validation', fr: 'Validation' },
      wish_created: { en: 'Wish Created', fr: 'Vœu créé' },
      wish_updated: { en: 'Wish Updated', fr: 'Vœu modifié' },
      wish_deleted: { en: 'Wish Deleted', fr: 'Vœu supprimé' },
      member_joined: { en: 'Member Joined', fr: 'Nouveau membre' },
      commitment_changed: { en: 'Commitment', fr: 'Engagement' },
      roster_created: { en: 'Roster Created', fr: 'Roster créé' },
      roster_updated: { en: 'Roster Updated', fr: 'Roster modifié' },
      roster_deleted: { en: 'Roster Deleted', fr: 'Roster supprimé' },
      permissions_updated: { en: 'Permissions', fr: 'Permissions' },
    };
    return labels[actionType]?.[language] || actionType;
  };

  const getValidationStatusLabel = (status: string): string => {
    if (status === 'approved') return t.wishes.validation.approved;
    if (status === 'rejected') return t.wishes.validation.rejected;
    return t.wishes.validation.pending;
  };

  const getValidationStatusIcon = (status: string): React.ReactNode => {
    if (status === 'approved') return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (status === 'rejected') return <XCircle className="h-3 w-3 text-red-400" />;
    return <Clock className="h-3 w-3 text-amber-400" />;
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
                {log.user_profile?.username || 'System'}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">
                {log.target_user_profile?.username || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {classData && (
                <Badge variant="outline" className={`bg-${classData.color}/20`}>
                  {classData.name[language]}
                </Badge>
              )}
              {specs.length > 0 && (
                <span className="text-muted-foreground">
                  ({specs.map(s => s?.name[language]).join(', ')})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {getValidationStatusIcon(oldStatus)}
              <span className="text-muted-foreground">{getValidationStatusLabel(oldStatus)}</span>
              <span className="text-muted-foreground">→</span>
              {getValidationStatusIcon(newStatus)}
              <span className={newStatus === 'approved' ? 'text-emerald-400' : newStatus === 'rejected' ? 'text-red-400' : 'text-amber-400'}>
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
              <span className="font-medium">{log.target_user_profile?.username || 'Unknown'}</span>
              <span className="text-muted-foreground text-sm">
                {language === 'fr' ? 'a ajouté un vœu' : 'added a wish'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {classData && (
                <Badge variant="outline" className={`bg-${classData.color}/20`}>
                  {classData.name[language]}
                </Badge>
              )}
              {specs.length > 0 && (
                <span className="text-muted-foreground">
                  ({specs.map(s => s?.name[language]).join(', ')})
                </span>
              )}
            </div>
          </div>
        );
      }

      case 'wish_updated': {
        const oldClassData = getClassById(details.old_class_id as string);
        const newClassData = getClassById(details.new_class_id as string);
        const oldSpecIds = (details.old_spec_ids as string[]) || [];
        const newSpecIds = (details.new_spec_ids as string[]) || [];
        const oldSpecs = oldSpecIds.map(id => getSpecById(id)).filter(Boolean);
        const newSpecs = newSpecIds.map(id => getSpecById(id)).filter(Boolean);
        const classChanged = details.old_class_id !== details.new_class_id;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{log.target_user_profile?.username || 'Unknown'}</span>
              <span className="text-muted-foreground text-sm">
                {language === 'fr' ? 'a modifié un vœu' : 'updated a wish'}
              </span>
            </div>
            {classChanged ? (
              <div className="flex items-center gap-2 text-sm">
                {oldClassData && (
                  <Badge variant="outline" className={`bg-${oldClassData.color}/20 opacity-50`}>
                    {oldClassData.name[language]}
                  </Badge>
                )}
                <span className="text-muted-foreground">→</span>
                {newClassData && (
                  <Badge variant="outline" className={`bg-${newClassData.color}/20`}>
                    {newClassData.name[language]}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                {newClassData && (
                  <Badge variant="outline" className={`bg-${newClassData.color}/20`}>
                    {newClassData.name[language]}
                  </Badge>
                )}
                {newSpecs.length > 0 && (
                  <span className="text-muted-foreground">
                    ({newSpecs.map(s => s?.name[language]).join(', ')})
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
              <span className="font-medium">{log.target_user_profile?.username || 'Unknown'}</span>
              <span className="text-muted-foreground text-sm">
                {language === 'fr' ? 'a supprimé un vœu' : 'deleted a wish'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {classData && (
                <Badge variant="outline" className={`bg-${classData.color}/20 opacity-50`}>
                  {classData.name[language]}
                </Badge>
              )}
              {specs.length > 0 && (
                <span className="text-muted-foreground opacity-50">
                  ({specs.map(s => s?.name[language]).join(', ')})
                </span>
              )}
            </div>
          </div>
        );
      }

      case 'member_joined':
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{log.target_user_profile?.username || 'Unknown'}</span>
            <span className="text-muted-foreground text-sm">
              {language === 'fr' ? 'a rejoint la guilde' : 'joined the guild'}
            </span>
          </div>
        );

      case 'commitment_changed': {
        const oldStatus = details.old_status as string;
        const newStatus = details.new_status as string;
        
        const getStatusLabel = (status: string) => {
          if (status === 'confirmed') return language === 'fr' ? 'Confirmé' : 'Confirmed';
          if (status === 'withdrawn') return language === 'fr' ? 'Retrait' : 'Withdrawn';
          return language === 'fr' ? 'Indécis' : 'Undecided';
        };

        const getStatusColor = (status: string) => {
          if (status === 'confirmed') return 'text-healer';
          if (status === 'withdrawn') return 'text-destructive';
          return 'text-amber-500';
        };

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{log.target_user_profile?.username || 'Unknown'}</span>
              <span className="text-muted-foreground text-sm">
                {language === 'fr' ? 'a changé son engagement' : 'changed commitment'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={`${getStatusColor(oldStatus)} opacity-60`}>{getStatusLabel(oldStatus)}</span>
              <span className="text-muted-foreground">→</span>
              <span className={getStatusColor(newStatus)}>{getStatusLabel(newStatus)}</span>
            </div>
          </div>
        );
      }

      case 'roster_created':
        return (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {language === 'fr' ? 'Nouveau roster :' : 'New roster:'}
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
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{details.new_name as string}</span>
              </div>
            )}
            {details.old_name === details.new_name && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{log.roster?.name || details.new_name as string}</Badge>
                <span className="text-muted-foreground">
                  {language === 'fr' ? 'modifié' : 'updated'}
                </span>
              </div>
            )}
          </div>
        );

      case 'roster_deleted':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-500/10 text-red-400">
              {details.name as string}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {language === 'fr' ? 'supprimé' : 'deleted'}
            </span>
          </div>
        );

      case 'permissions_updated': {
        const changes = details.changes as Record<string, { added: number; removed: number; modified: number }>;
        const totalRules = details.total_rules as number;
        
        const getPermissionLabel = (type: string) => {
          const labels: Record<string, { en: string; fr: string }> = {
            manage_wishes: { en: 'Wishes', fr: 'Vœux' },
            manage_polls: { en: 'Polls', fr: 'Sondages' },
            manage_rosters: { en: 'Rosters', fr: 'Rosters' },
            view_activity_log: { en: 'Activity', fr: 'Journal' },
          };
          return labels[type]?.[language] || type;
        };

        const changedTypes = Object.keys(changes || {});
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{log.user_profile?.username || 'System'}</span>
              <span className="text-muted-foreground text-sm">
                {language === 'fr' ? 'a modifié les permissions' : 'updated permissions'}
              </span>
            </div>
            {changedTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 text-xs">
                {changedTypes.map(type => (
                  <Badge key={type} variant="outline" className="bg-orange-500/10 text-orange-400">
                    {getPermissionLabel(type)}
                  </Badge>
                ))}
              </div>
            )}
            <span className="text-xs text-muted-foreground">
              {totalRules} {language === 'fr' ? 'règle(s) active(s)' : 'active rule(s)'}
            </span>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const dateLocale = language === 'fr' ? fr : enUS;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            {language === 'fr' ? 'Journal d\'activité' : 'Activity Log'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-[160px] h-8 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">
                {language === 'fr' ? 'Tout' : 'All'}
              </SelectItem>
              <SelectItem value="wish_created">
                {language === 'fr' ? 'Vœux créés' : 'Wishes Created'}
              </SelectItem>
              <SelectItem value="wish_updated">
                {language === 'fr' ? 'Vœux modifiés' : 'Wishes Updated'}
              </SelectItem>
              <SelectItem value="wish_deleted">
                {language === 'fr' ? 'Vœux supprimés' : 'Wishes Deleted'}
              </SelectItem>
              <SelectItem value="wish_validation">
                {language === 'fr' ? 'Validations' : 'Validations'}
              </SelectItem>
              <SelectItem value="member_joined">
                {language === 'fr' ? 'Membres' : 'Members'}
              </SelectItem>
              <SelectItem value="commitment_changed">
                {language === 'fr' ? 'Engagements' : 'Commitments'}
              </SelectItem>
              <SelectItem value="roster_created">
                {language === 'fr' ? 'Rosters créés' : 'Rosters Created'}
              </SelectItem>
              <SelectItem value="roster_updated">
                {language === 'fr' ? 'Rosters modifiés' : 'Rosters Updated'}
              </SelectItem>
              <SelectItem value="roster_deleted">
                {language === 'fr' ? 'Rosters supprimés' : 'Rosters Deleted'}
              </SelectItem>
              <SelectItem value="permissions_updated">
                {language === 'fr' ? 'Permissions' : 'Permissions'}
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
            <p>{language === 'fr' ? 'Aucune activité' : 'No activity yet'}</p>
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
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
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
                  {formatDistanceToNow(new Date(log.created_at), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
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
            {language === 'fr' 
              ? `${totalCount} entrées`
              : `${totalCount} entries`}
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
