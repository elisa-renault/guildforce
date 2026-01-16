import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildPermissions, PermissionType, PermissionRule } from '@/hooks/useGuildPermissions';
import { PermissionSection } from './PermissionSection';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, Save, Shield, Users, Settings, Eye, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GuildPermissionsEditorProps {
  guildId: string;
}

interface PermissionConfig {
  type: PermissionType;
  labelKey: string;
  descKey: string;
  category: 'content' | 'admin' | 'audit';
  isSensitive?: boolean;
}

const PERMISSION_CONFIGS: PermissionConfig[] = [
  { type: 'manage_wishes', labelKey: 'manageWishes', descKey: 'manageWishesDesc', category: 'content' },
  { type: 'manage_polls', labelKey: 'managePolls', descKey: 'managePollsDesc', category: 'content' },
  { type: 'manage_rosters', labelKey: 'manageRosters', descKey: 'manageRostersDesc', category: 'content' },
  { type: 'view_activity_log', labelKey: 'viewActivityLog', descKey: 'viewActivityLogDesc', category: 'audit' },
];

const CATEGORY_INFO = {
  content: { 
    labelEn: 'Content Management', 
    labelFr: 'Gestion du contenu',
    icon: Settings,
  },
  admin: { 
    labelEn: 'Administration', 
    labelFr: 'Administration',
    icon: Users,
  },
  audit: { 
    labelEn: 'Audit', 
    labelFr: 'Audit',
    icon: Eye,
  },
};

export const GuildPermissionsEditor = ({ guildId }: GuildPermissionsEditorProps) => {
  const { t } = useLanguage();
  const {
    permissions,
    members,
    ranks,
    officerRankThreshold,
    loading,
    saving,
    savePermissions,
  } = useGuildPermissions(guildId);

  const [localPermissions, setLocalPermissions] = useState<PermissionRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const isFrench = t.common.loading === 'Chargement...';

  useEffect(() => {
    setLocalPermissions(permissions);
    setHasChanges(false);
  }, [permissions]);

  const handleRulesChange = (permissionType: PermissionType, rules: Omit<PermissionRule, 'permission_type'>[]) => {
    const otherPermissions = localPermissions.filter(p => p.permission_type !== permissionType);
    const newRules = rules.map(r => ({ ...r, permission_type: permissionType }));
    setLocalPermissions([...otherPermissions, ...newRules]);
    setHasChanges(true);
  };


  const handleReset = () => {
    setLocalPermissions([]);
    setHasChanges(true);
    toast.info(isFrench ? 'Permissions réinitialisées (GM seul)' : 'Permissions reset (GM only)');
  };

  const handleSave = async () => {
    await savePermissions(localPermissions);
    setHasChanges(false);
  };

  const getLocalRules = (permissionType: PermissionType): PermissionRule[] => {
    return localPermissions.filter(p => p.permission_type === permissionType);
  };

  const getLabel = (key: string): string => {
    const labels: Record<string, { en: string; fr: string }> = {
      manageWishes: { en: 'Manage Wishes', fr: 'Gérer les vœux' },
      manageWishesDesc: { en: 'Approve or reject member wishes', fr: 'Approuver ou refuser les vœux des membres' },
      managePolls: { en: 'Manage Polls', fr: 'Gérer les sondages' },
      managePollsDesc: { en: 'Create, edit and publish polls', fr: 'Créer, modifier et publier des sondages' },
      manageRosters: { en: 'Manage Rosters', fr: 'Gérer les rosters' },
      manageRostersDesc: { en: 'Create and configure rosters', fr: 'Créer et configurer les rosters' },
      viewActivityLog: { en: 'View Activity Log', fr: 'Voir le journal' },
      viewActivityLogDesc: { en: 'Access the guild activity history', fr: 'Accéder à l\'historique d\'activité' },
    };
    return labels[key]?.[isFrench ? 'fr' : 'en'] || key;
  };

  // Calculate summary stats
  const delegatedCount = new Set(localPermissions.map(p => p.permission_type)).size;
  const rankRules = localPermissions.filter(p => p.access_type === 'rank');
  const userRules = localPermissions.filter(p => p.access_type === 'user');
  const uniqueUsers = new Set(userRules.map(r => r.user_id)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const groupedPermissions = {
    content: PERMISSION_CONFIGS.filter(p => p.category === 'content'),
    admin: PERMISSION_CONFIGS.filter(p => p.category === 'admin'),
    audit: PERMISSION_CONFIGS.filter(p => p.category === 'audit'),
  };

  return (
    <div className="space-y-3">
      {/* Header with summary - compact */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base">{(t as any).permissions?.title || 'Permissions'}</h3>
        </div>
        
        {/* Summary badges */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {delegatedCount > 0 ? (
            <>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {delegatedCount} {isFrench ? 'déléguée' : 'delegated'}{delegatedCount > 1 ? 's' : ''}
              </Badge>
              {rankRules.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Users className="h-2.5 w-2.5 mr-0.5" />
                  {isFrench ? 'Rangs' : 'Ranks'}
                </Badge>
              )}
              {uniqueUsers > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{uniqueUsers}
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
              {isFrench ? 'GM seul' : 'GM only'}
            </Badge>
          )}
        </div>
      </div>

      {/* Reset button */}
      {delegatedCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                {isFrench ? 'Réinitialiser' : 'Reset'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{isFrench ? 'Retirer toutes les permissions déléguées' : 'Remove all delegated permissions'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Two-column grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Content permissions */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
            <Settings className="h-3 w-3" />
            <span>{isFrench ? 'Contenu' : 'Content'}</span>
          </div>
          {groupedPermissions.content.map(({ type, labelKey, descKey, isSensitive }) => (
            <PermissionSection
              key={type}
              permissionType={type}
              label={getLabel(labelKey)}
              description={getLabel(descKey)}
              rules={getLocalRules(type)}
              members={members}
              ranks={ranks}
              officerRankThreshold={officerRankThreshold}
              onChange={(rules) => handleRulesChange(type, rules)}
              isSensitive={isSensitive}
            />
          ))}
        </div>

        {/* Admin + Audit permissions */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
            <Users className="h-3 w-3" />
            <span>{isFrench ? 'Admin & Audit' : 'Admin & Audit'}</span>
          </div>
          {[...groupedPermissions.admin, ...groupedPermissions.audit].map(({ type, labelKey, descKey, isSensitive }) => (
            <PermissionSection
              key={type}
              permissionType={type}
              label={getLabel(labelKey)}
              description={getLabel(descKey)}
              rules={getLocalRules(type)}
              members={members}
              ranks={ranks}
              officerRankThreshold={officerRankThreshold}
              onChange={(rules) => handleRulesChange(type, rules)}
              isSensitive={isSensitive}
            />
          ))}
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-border/50">
          <CosmicButton
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            icon={<Save className="h-4 w-4" />}
          >
            {t.common.save}
          </CosmicButton>
        </div>
      )}
    </div>
  );
};
