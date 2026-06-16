import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'admin' | 'moderator' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface UserWithRoles {
  id: string;
  username: string;
  avatar_url: string | null;
  roles: AppRole[];
}

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
}

// Combined hook to check both admin and moderator status in a single query
export function useAdminRoles() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRoles() {
      if (!user) {
        setIsAdmin(false);
        setIsModerator(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'moderator']);

        if (error) {
          setIsAdmin(false);
          setIsModerator(false);
        } else {
          const roles = (data || []).map(r => r.role);
          setIsAdmin(roles.includes('admin'));
          setIsModerator(roles.includes('admin') || roles.includes('moderator'));
        }
      } catch (err) {
        setIsAdmin(false);
        setIsModerator(false);
      } finally {
        setLoading(false);
      }
    }

    checkRoles();
  }, [user]);

  return { isAdmin, isModerator, loading };
}

export function useIsModerator() {
  const { user } = useAuth();
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkModerator() {
      if (!user) {
        setIsModerator(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Check if user has admin or moderator role
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'moderator']);

        if (error) {
          setIsModerator(false);
        } else {
          setIsModerator(data && data.length > 0);
        }
      } catch (err) {
        setIsModerator(false);
      } finally {
        setLoading(false);
      }
    }

    checkModerator();
  }, [user]);

  return { isModerator, loading };
}

export function useAdminActions() {
  const { user } = useAuth();

  const fetchAllUsers = useCallback(async (): Promise<UserWithRoles[]> => {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .order('username');

    if (error) throw error;

    // Get roles for all users
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map<string, AppRole[]>();
    (roles || []).forEach((r) => {
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role as AppRole);
      roleMap.set(r.user_id, existing);
    });

    return (profiles || []).map((p) => ({
      ...p,
      roles: roleMap.get(p.id) || [],
    }));
  }, []);

  const addRole = useCallback(async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role });

    if (error) throw error;
  }, []);

  const removeRole = useCallback(async (userId: string, role: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) throw error;
  }, []);

  return {
    fetchAllUsers,
    addRole,
    removeRole,
  };
}
