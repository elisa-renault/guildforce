import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildPermissions, PermissionType, PermissionRule } from '@/hooks/useGuildPermissions';
import { PermissionSection } from './PermissionSection';
import { PermissionPresets } from './PermissionPresets';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface GuildPermissionsEditorProps {
  guildId: string;
}

const PERMISSION_TYPES: { type: PermissionType; labelKey: string; descKey: string }[] = [
  { type: 'manage_wishes', labelKey: 'manageWishes', descKey: 'manageWishesDesc' },
  { type: 'manage_polls', labelKey: 'managePolls', descKey: 'managePollsDesc' },
  { type: 'manage_rosters', labelKey: 'manageRosters', descKey: 'manageRostersDesc' },
  { type: 'view_activity_log', labelKey: 'viewActivityLog', descKey: 'viewActivityLogDesc' },
  { type: 'manage_members', labelKey: 'manageMembers', descKey: 'manageMembersDesc' },
];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg">{(t as any).permissions?.title || 'Permissions'}</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {(t as any).permissions?.description || 'Delegate specific management rights to members based on their Battle.net rank or individually. GMs always have all permissions.'}
      </p>

      {/* Presets */}
      <PermissionPresets 
        onApplyPreset={handleApplyPreset}
        onReset={handleReset}
      />

      <div className="space-y-3">
        {PERMISSION_TYPES.map(({ type, labelKey, descKey }) => (
          <PermissionSection
            key={type}
            permissionType={type}
            label={getLabel(labelKey)}
            description={getLabel(descKey)}
            rules={getLocalRules(type)}
            members={members}
            ranks={ranks}
            onChange={(rules) => handleRulesChange(type, rules)}
          />
        ))}
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
