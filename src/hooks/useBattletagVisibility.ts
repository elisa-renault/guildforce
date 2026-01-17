import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';

type BattletagVisibility = 'everyone' | 'guild_only' | 'nobody';

interface UseBattletagVisibilityResult {
  canSeeBattletag: boolean;
  isLoading: boolean;
}

/**
 * Hook to determine if the current user can see a target user's BattleTag
 * based on their visibility settings.
 * 
 * Rules:
 * - Admins always see BattleTags
 * - Users always see their own BattleTag
 * - 'everyone': visible to all
 * - 'guild_only': visible only to guild co-members
 * - 'nobody': visible only to admins
 */
export function useBattletagVisibility(targetUserId: string | undefined): UseBattletagVisibilityResult {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [canSeeBattletag, setCanSeeBattletag] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkVisibility() {
      if (!targetUserId) {
        setCanSeeBattletag(false);
        setIsLoading(false);
        return;
      }

      // Wait for admin check to complete
      if (adminLoading) return;

      // Users can always see their own BattleTag
      if (user?.id === targetUserId) {
        setCanSeeBattletag(true);
        setIsLoading(false);
        return;
      }

      // Admins always see BattleTags
      if (isAdmin) {
        setCanSeeBattletag(true);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch target profile's visibility setting
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('battletag, battletag_visibility')
          .eq('id', targetUserId)
          .single();

        if (error || !profile?.battletag) {
          setCanSeeBattletag(false);
          setIsLoading(false);
          return;
        }

        const visibility = (profile.battletag_visibility as BattletagVisibility) || 'everyone';

        switch (visibility) {
          case 'everyone':
            setCanSeeBattletag(true);
            break;
          case 'guild_only':
            // Check if current user shares a guild with target
            if (user) {
              const { data: sharesGuild } = await supabase.rpc('shares_wow_guild', {
                p_current_user_id: user.id,
                p_target_user_id: targetUserId,
              });
              setCanSeeBattletag(!!sharesGuild);
            } else {
              setCanSeeBattletag(false);
            }
            break;
          case 'nobody':
          default:
            setCanSeeBattletag(false);
            break;
        }
      } catch {
        setCanSeeBattletag(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkVisibility();
  }, [targetUserId, user, isAdmin, adminLoading]);

  return { canSeeBattletag, isLoading };
}
