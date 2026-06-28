import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildPermissions, PermissionType, PermissionRule } from '@/hooks/useGuildPermissions';
import { PermissionRow } from './PermissionRow';
import { IndividualAccessEditor } from './IndividualAccessEditor';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, Save, Shield, RotateCcw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface GuildPermissionsEditorProps {
  guildId: string;
}

// Permission labels and descriptions are now in translations.ts under t.permissions

const PERMISSION_TYPES: { type: PermissionType; isSensitive?: boolean }[] = [
  { type: 'manage_wishes' },
  { type: 'manage_polls' },
  { type: 'manage_rosters' },
  { type: 'view_activity_log' },
  { type: 'manage_members' },
  { type: 'manage_vault', isSensitive: true },
  { type: 'view_vault_audit', isSensitive: true },
  { type: 'manage_atlas' },
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
    toast.info(t.permissions.resetToGmOnly);
  };

  const handleSave = async () => {
    await savePermissions(localPermissions);
    setHasChanges(false);
  };

  const getLocalRules = (permissionType: PermissionType): PermissionRule[] => {
    return localPermissions.filter(p => p.permission_type === permissionType);
  };

  const getPermissionLabel = (type: PermissionType): string => {
    const keyMap: Record<PermissionType, keyof typeof t.permissions> = {
      manage_wishes: 'manageWishes',
      manage_polls: 'managePolls',
      manage_rosters: 'manageRosters',
      view_activity_log: 'viewActivityLog',
      manage_members: 'manageMembers',
      manage_vault: 'manageVault',
      view_vault_audit: 'viewVaultAudit',
      manage_atlas: 'manageAtlas',
    };
    return t.permissions[keyMap[type]] || type;
  };

  const getPermissionDesc = (type: PermissionType): string => {
    const keyMap: Record<PermissionType, keyof typeof t.permissions> = {
      manage_wishes: 'manageWishesDesc',
      manage_polls: 'managePollsDesc',
      manage_rosters: 'manageRostersDesc',
      view_activity_log: 'viewActivityLogDesc',
      manage_members: 'manageMembersDesc',
      manage_vault: 'manageVaultDesc',
      view_vault_audit: 'viewVaultAuditDesc',
      manage_atlas: 'manageAtlasDesc',
    };
    return t.permissions[keyMap[type]] || '';
  };

  // Calculate summary stats
  const delegatedCount = new Set(localPermissions.map(p => p.permission_type)).size;
  const userRules = localPermissions.filter(p => p.access_type === 'user');
  const uniqueUsers = new Set(userRules.map(r => r.user_id)).size;

  // Permission types for individual access editor
  const permissionTypesForEditor = PERMISSION_TYPES.map(c => ({
    type: c.type,
    label: getPermissionLabel(c.type),
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
          <h3 className="font-sans text-base font-medium">{t.permissions.title}</h3>
          
          {/* Summary badges */}
          <div className="flex items-center gap-1.5">
            {delegatedCount > 0 ? (
              <>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {delegatedCount} {t.permissions.delegated}
                </Badge>
                {uniqueUsers > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    +{uniqueUsers} {t.permissions.users}
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
                {t.permissions.gmOnly}
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
                    {t.common.reset}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t.permissions.resetTooltip}</p>
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
        {PERMISSION_TYPES.map(({ type, isSensitive }) => (
          <PermissionRow
            key={type}
            label={getPermissionLabel(type)}
            description={getPermissionDesc(type)}
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
