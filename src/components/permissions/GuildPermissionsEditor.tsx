import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildPermissions, PermissionType, PermissionRule } from '@/hooks/useGuildPermissions';
import { PermissionRow } from './PermissionRow';
import { IndividualAccessEditor } from './IndividualAccessEditor';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, Save, Shield, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface GuildPermissionsEditorProps {
  guildId: string;
}

interface PermissionConfig {
  type: PermissionType;
  labelKey: string;
  descKey: string;
  isSensitive?: boolean;
}

const PERMISSION_CONFIGS: PermissionConfig[] = [
  { type: 'manage_wishes', labelKey: 'manageWishes', descKey: 'manageWishesDesc' },
  { type: 'manage_polls', labelKey: 'managePolls', descKey: 'managePollsDesc' },
  { type: 'manage_rosters', labelKey: 'manageRosters', descKey: 'manageRostersDesc' },
  { type: 'view_activity_log', labelKey: 'viewActivityLog', descKey: 'viewActivityLogDesc' },
];

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

  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const maxRankIndex = sortedRanks.length > 0 ? Math.max(...sortedRanks.map(r => r.rank_index)) : 9;

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
  const userRules = localPermissions.filter(p => p.access_type === 'user');
  const uniqueUsers = new Set(userRules.map(r => r.user_id)).size;

  // Permission types for individual access editor
  const permissionTypesForEditor = PERMISSION_CONFIGS.map(c => ({
    type: c.type,
    label: getLabel(c.labelKey),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base">{(t as any).permissions?.title || 'Permissions'}</h3>
          
          {/* Summary badges */}
          <div className="flex items-center gap-1.5">
            {delegatedCount > 0 ? (
              <>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {delegatedCount} {isFrench ? 'déléguée' : 'delegated'}{delegatedCount > 1 ? 's' : ''}
                </Badge>
                {uniqueUsers > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{uniqueUsers} {isFrench ? 'utilisateur' : 'user'}{uniqueUsers > 1 ? 's' : ''}
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
        
        {/* Actions */}
        <div className="flex items-center gap-2">
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
          
          {hasChanges && (
            <CosmicButton
              onClick={handleSave}
              loading={saving}
              disabled={saving}
              size="sm"
              icon={<Save className="h-3.5 w-3.5" />}
            >
              {t.common.save}
            </CosmicButton>
          )}
        </div>
      </div>

      {/* Permissions table */}
      <div className="border border-border/50 rounded-lg overflow-hidden bg-card/30">
        {PERMISSION_CONFIGS.map(({ type, labelKey, descKey, isSensitive }) => (
          <PermissionRow
            key={type}
            label={getLabel(labelKey)}
            description={getLabel(descKey)}
            rules={getLocalRules(type)}
            ranks={sortedRanks}
            officerRankThreshold={officerRankThreshold}
            maxRankIndex={maxRankIndex}
            onChange={(rules) => handleRulesChange(type, rules)}
            isSensitive={isSensitive}
          />
        ))}
      </div>

      {/* Separator */}
      <Separator className="my-4" />

      {/* Individual access section */}
      <IndividualAccessEditor
        permissions={localPermissions}
        members={members}
        permissionTypes={permissionTypesForEditor}
        onChange={(newPermissions) => {
          setLocalPermissions(newPermissions);
          setHasChanges(true);
        }}
      />
    </div>
  );
};