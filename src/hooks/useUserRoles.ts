import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'user';

// Cache for user roles to avoid repeated queries
const rolesCache = new Map<string, AppRole[]>();

export function useUserRoles(userIds: string[]) {
  const [roles, setRoles] = useState<Map<string, AppRole[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoles() {
      if (userIds.length === 0) {
        setLoading(false);
        return;
      }

      // Filter out already cached users
      const uncachedIds = userIds.filter(id => !rolesCache.has(id));
      
      if (uncachedIds.length > 0) {
        try {
          const { data, error } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', uncachedIds);

          if (!error && data) {
            // Group roles by user_id
            const rolesByUser = new Map<string, AppRole[]>();
            data.forEach((r) => {
              const existing = rolesByUser.get(r.user_id) || [];
              existing.push(r.role as AppRole);
              rolesByUser.set(r.user_id, existing);
            });

            // Cache the results
            uncachedIds.forEach(id => {
              rolesCache.set(id, rolesByUser.get(id) || []);
            });
          }
        } catch (err) {
          // Error fetching roles handled silently
        }
      }

      // Build result from cache
      const result = new Map<string, AppRole[]>();
      userIds.forEach(id => {
        result.set(id, rolesCache.get(id) || []);
      });
      
      setRoles(result);
      setLoading(false);
    }

    fetchRoles();
  }, [userIds.join(',')]);

  return { roles, loading };
}

export function getUserRoleFromCache(userId: string): AppRole[] {
  return rolesCache.get(userId) || [];
}
