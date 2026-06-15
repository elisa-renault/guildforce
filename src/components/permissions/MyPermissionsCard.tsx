import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, Key, Loader2 } from 'lucide-react';
import type { PermissionType } from '@/hooks/useGuildPermissions';

interface MyPermissionsCardProps {
  guildId: string;
  isGM: boolean;
}

const PERMISSION_TYPES: PermissionType[] = [
  'manage_wishes',
  'manage_polls',
  'manage_rosters',
  'view_activity_log',
  'manage_vault',
  'view_vault_audit',
  'manage_atlas',
];

export const MyPermissionsCard = ({ guildId, isGM }: MyPermissionsCardProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [myPermissions, setMyPermissions] = useState<PermissionType[]>([]);
  const [hasVaultAccess, setHasVaultAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper to get permission label and description from translations
  const getPermissionLabel = (type: PermissionType): string => {
    const keyMap: Record<PermissionType, keyof typeof t.permissions> = {
      manage_wishes: 'manageWishes',
      manage_polls: 'managePolls',
      manage_rosters: 'manageRosters',
      view_activity_log: 'viewActivityLog',
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
      manage_vault: 'manageVaultDesc',
      view_vault_audit: 'viewVaultAuditDesc',
      manage_atlas: 'manageAtlasDesc',
    };
    return t.permissions[keyMap[type]] || '';
  };

  useEffect(() => {
    const loadMyPermissions = async () => {
      if (!user || !guildId) {
        setLoading(false);
        return;
      }

      try {
        const [permissionChecks, vaultAccessResult] = await Promise.all([
          PERMISSION_TYPES.map(async (type) => {
            const { data } = await supabase.rpc('has_guild_permission', {
              p_guild_id: guildId,
              p_user_id: user.id,
              p_permission: type,
            });
            return { type, hasPermission: !!data };
          }),
          supabase.rpc('has_any_guild_secret_access', {
            p_guild_id: guildId,
            p_user_id: user.id,
          }),
        ]);

        const granted = permissionChecks
          .filter((p) => p.hasPermission)
          .map((p) => p.type);
        
        setMyPermissions(granted);
        setHasVaultAccess(Boolean(vaultAccessResult.data));
      } catch {
        // Permission loading error handled silently
        setHasVaultAccess(false);
      } finally {
        setLoading(false);
      }
    };

    loadMyPermissions();
  }, [user, guildId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // GM has all permissions
  if (isGM) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg">
            {t.permissions.myPermissions}
          </h3>
        </div>
        
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-primary">
              {t.permissions.guildMaster}
            </p>
            <p className="text-sm text-muted-foreground">
              {t.permissions.guildMasterDesc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No permissions
  if (myPermissions.length === 0 && !hasVaultAccess) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg">
            {t.permissions.myPermissions}
          </h3>
        </div>
        
        <p className="text-muted-foreground">
          {t.permissions.noPermissions}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg">
          {t.permissions.myPermissions}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {myPermissions.length + (hasVaultAccess ? 1 : 0)}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        {t.permissions.grantedByGm}
      </p>
      
      <div className="space-y-3">
        {hasVaultAccess && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">
                {t.permissions.vaultAccess}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.permissions.vaultAccessDesc}
              </p>
            </div>
          </div>
        )}
        {PERMISSION_TYPES.map((type) => {
          const hasIt = myPermissions.includes(type);
          if (!hasIt) return null;
          
          return (
            <div
              key={type}
              className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
            >
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  {getPermissionLabel(type)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getPermissionDesc(type)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
