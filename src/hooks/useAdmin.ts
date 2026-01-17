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

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .order('display_order');

    if (error) throw error;
    return data;
  }, []);

  const createCategory = useCallback(async (category: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    display_order?: number;
    is_global?: boolean;
    guild_id?: string;
  }) => {
    const { data, error } = await supabase
      .from('forum_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const updateCategory = useCallback(async (id: string, updates: {
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    display_order?: number;
  }) => {
    const { data, error } = await supabase
      .from('forum_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('forum_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }, []);

  const reorderCategories = useCallback(async (categoryIds: string[]) => {
    // Update display_order for each category based on position in array
    const updates = categoryIds.map((id, index) => 
      supabase
        .from('forum_categories')
        .update({ display_order: index })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    const error = results.find(r => r.error)?.error;
    if (error) throw error;
  }, []);

  const fetchModerators = useCallback(async () => {
    const { data, error } = await supabase
      .from('forum_moderators')
      .select('*, profiles:user_id(id, username, avatar_url)');

    if (error) throw error;
    return data;
  }, []);

  const addModerator = useCallback(async (userId: string, options?: {
    categoryId?: string;
    guildId?: string;
    isGlobalMod?: boolean;
  }) => {
    const { data, error } = await supabase
      .from('forum_moderators')
      .insert({
        user_id: userId,
        category_id: options?.categoryId || null,
        guild_id: options?.guildId || null,
        is_global_mod: options?.isGlobalMod ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const removeModerator = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('forum_moderators')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }, []);

  return {
    fetchAllUsers,
    addRole,
    removeRole,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    fetchModerators,
    addModerator,
    removeModerator,
  };
}
