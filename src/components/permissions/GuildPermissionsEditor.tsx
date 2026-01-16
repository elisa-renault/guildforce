import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildPermissions, PermissionType, PermissionRule } from '@/hooks/useGuildPermissions';
import { PermissionSection } from './PermissionSection';
import { PermissionPresets } from './PermissionPresets';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, Save, Shield, Users, Settings, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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
  { type: 'manage_members', labelKey: 'manageMembers', descKey: 'manageMembersDesc', category: 'admin', isSensitive: true },
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

  const handleApplyPreset = (presetPermissions: Record<PermissionType, Omit<PermissionRule, 'permission_type'>[]>) => {
    const newPermissions: PermissionRule[] = [];
    
    (Object.keys(presetPermissions) as PermissionType[]).forEach(type => {
      presetPermissions[type].forEach(rule => {
        newPermissions.push({ ...rule, permission_type: type });
      });
    });
    
    setLocalPermissions(newPermissions);
    setHasChanges(true);
    toast.success(isFrench ? 'Preset appliqué' : 'Preset applied');
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
      manageMembers: { en: 'Manage Members', fr: 'Gérer les membres' },
      manageMembersDesc: { en: 'Edit member commitment status', fr: 'Modifier le statut d\'engagement des membres' },
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
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg">{(t as any).permissions?.title || 'Permissions'}</h3>
        </div>
        
        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {delegatedCount > 0 ? (
            <>
              <Badge variant="secondary">
                {delegatedCount} {isFrench ? 'permission' : 'permission'}{delegatedCount > 1 ? 's' : ''} {isFrench ? 'déléguée' : 'delegated'}{delegatedCount > 1 ? 's' : ''}
              </Badge>
              {rankRules.length > 0 && (
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {isFrench ? 'Par rang' : 'By rank'}
                </Badge>
              )}
              {uniqueUsers > 0 && (
                <Badge variant="outline">
                  +{uniqueUsers} {isFrench ? 'utilisateur' : 'user'}{uniqueUsers > 1 ? 's' : ''}
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              {isFrench ? 'GM uniquement' : 'GM only'}
            </Badge>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {(t as any).permissions?.description || 'Delegate specific management rights to members based on their Battle.net rank or individually. GMs always have all permissions.'}
      </p>

      {/* Presets */}
      <PermissionPresets 
        onApplyPreset={handleApplyPreset}
        onReset={handleReset}
      />

      {/* Grouped permissions */}
      <div className="space-y-6">
        {(['content', 'admin', 'audit'] as const).map(category => {
          const categoryPerms = groupedPermissions[category];
          if (categoryPerms.length === 0) return null;
          
          const info = CATEGORY_INFO[category];
          const Icon = info.icon;
          
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span>{isFrench ? info.labelFr : info.labelEn}</span>
              </div>
              <div className="space-y-2">
                {categoryPerms.map(({ type, labelKey, descKey, isSensitive }) => (
                  <PermissionSection
                    key={type}
                    permissionType={type}
                    label={getLabel(labelKey)}
                    description={getLabel(descKey)}
                    rules={getLocalRules(type)}
                    members={members}
                    ranks={ranks}
                    onChange={(rules) => handleRulesChange(type, rules)}
                    isSensitive={isSensitive}
                  />
                ))}
              </div>
            </div>
          );
        })}
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
