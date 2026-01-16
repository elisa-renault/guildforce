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

interface PermissionInfo {
  type: PermissionType;
  labelFr: string;
  labelEn: string;
  descFr: string;
  descEn: string;
}

const PERMISSIONS: PermissionInfo[] = [
  { 
    type: 'manage_wishes', 
    labelFr: 'Gérer les vœux', 
    labelEn: 'Manage Wishes',
    descFr: 'Approuver ou refuser les vœux des membres',
    descEn: 'Approve or reject member wishes',
  },
  { 
    type: 'manage_polls', 
    labelFr: 'Gérer les sondages', 
    labelEn: 'Manage Polls',
    descFr: 'Créer, modifier et publier des sondages',
    descEn: 'Create, edit and publish polls',
  },
  { 
    type: 'manage_rosters', 
    labelFr: 'Gérer les rosters', 
    labelEn: 'Manage Rosters',
    descFr: 'Créer et configurer les rosters',
    descEn: 'Create and configure rosters',
  },
  { 
    type: 'view_activity_log', 
    labelFr: 'Voir le journal', 
    labelEn: 'View Activity Log',
    descFr: 'Accéder à l\'historique d\'activité de la guilde',
    descEn: 'Access the guild activity history',
  },
];

export const MyPermissionsCard = ({ guildId, isGM }: MyPermissionsCardProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [myPermissions, setMyPermissions] = useState<PermissionType[]>([]);
  const [loading, setLoading] = useState(true);

  const isFrench = t.common.loading === 'Chargement...';

  useEffect(() => {
    const loadMyPermissions = async () => {
      if (!user || !guildId) {
        setLoading(false);
        return;
      }

      try {
        const permissionChecks = await Promise.all(
          PERMISSIONS.map(async (perm) => {
            const { data } = await supabase.rpc('has_guild_permission', {
              p_guild_id: guildId,
              p_user_id: user.id,
              p_permission: perm.type,
            });
            return { type: perm.type, hasPermission: !!data };
          })
        );

        const granted = permissionChecks
          .filter((p) => p.hasPermission)
          .map((p) => p.type);
        
        setMyPermissions(granted);
      } catch (error) {
        console.error('Error loading my permissions:', error);
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
            {isFrench ? 'Mes permissions' : 'My permissions'}
          </h3>
        </div>
        
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-primary">
              {isFrench ? 'Maître de Guilde' : 'Guild Master'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isFrench
                ? 'Vous avez accès à toutes les fonctionnalités de gestion de la guilde.'
                : 'You have access to all guild management features.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No permissions
  if (myPermissions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg">
            {isFrench ? 'Mes permissions' : 'My permissions'}
          </h3>
        </div>
        
        <p className="text-muted-foreground">
          {isFrench
            ? 'Vous n\'avez pas de permissions spécifiques accordées par le GM.'
            : 'You don\'t have any specific permissions granted by the GM.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Key className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg">
          {isFrench ? 'Mes permissions' : 'My permissions'}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {myPermissions.length}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        {isFrench
          ? 'Ces permissions vous ont été accordées par le GM de la guilde.'
          : 'These permissions were granted to you by the guild GM.'}
      </p>
      
      <div className="space-y-3">
        {PERMISSIONS.map((perm) => {
          const hasIt = myPermissions.includes(perm.type);
          if (!hasIt) return null;
          
          return (
            <div
              key={perm.type}
              className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
            >
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  {isFrench ? perm.labelFr : perm.labelEn}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isFrench ? perm.descFr : perm.descEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
