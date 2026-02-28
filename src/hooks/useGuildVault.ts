import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type {
  GuildSecretAccessRule,
  GuildSecretAuditEvent,
  GuildSecretPayload,
  GuildSecretSummary,
} from '@/lib/guildVault';

import { supabase } from '@/integrations/supabase/client';

interface UseGuildVaultOptions {
  guildId: string | null;
  includeAudit?: boolean;
  mode?: 'full' | 'audit-only';
}

export function useGuildVault({
  guildId,
  includeAudit = false,
  mode = 'full',
}: UseGuildVaultOptions) {
  const [secrets, setSecrets] = useState<GuildSecretSummary[]>([]);
  const [auditEvents, setAuditEvents] = useState<GuildSecretAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [mutating, setMutating] = useState(false);

  const loadSecrets = useCallback(async () => {
    if (mode === 'audit-only') {
      setSecrets([]);
      setLoading(false);
      return;
    }

    if (!guildId) {
      setSecrets([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('list_visible_guild_secrets', {
        p_guild_id: guildId,
      });

      if (error) throw error;
      setSecrets((data || []) as GuildSecretSummary[]);
    } catch {
      setSecrets([]);
      toast.error('Failed to load guild vault');
    } finally {
      setLoading(false);
    }
  }, [guildId, mode]);

  const loadAudit = useCallback(async (secretId?: string | null) => {
    if (!guildId || !includeAudit) {
      setAuditEvents([]);
      return;
    }

    setAuditLoading(true);

    try {
      const args: { p_guild_id: string; p_secret_id?: string | null } = { p_guild_id: guildId };
      if (secretId) {
        args.p_secret_id = secretId;
      }

      const { data, error } = await supabase.rpc('list_guild_secret_audit', args);

      if (error) throw error;
      setAuditEvents((data || []).map((event) => ({
        ...event,
        action_context: (event.action_context || {}) as Record<string, unknown>,
      })) as GuildSecretAuditEvent[]);
    } catch {
      setAuditEvents([]);
    } finally {
      setAuditLoading(false);
    }
  }, [guildId, includeAudit]);

  const loadSecretAccessRules = useCallback(async (secretId: string) => {
    const { data, error } = await supabase
      .from('guild_secret_access_rules')
      .select('capability, access_type, user_id, min_rank_index, max_rank_index')
      .eq('secret_id', secretId);

    if (error) {
      throw error;
    }

    return (data || []).map((rule) => ({
      capability: rule.capability as GuildSecretAccessRule['capability'],
      access_type: rule.access_type as GuildSecretAccessRule['access_type'],
      user_id: rule.user_id ?? null,
      min_rank_index: rule.min_rank_index ?? null,
      max_rank_index: rule.max_rank_index ?? null,
    })) as GuildSecretAccessRule[];
  }, []);

  const invokeVault = useCallback(async <T,>(action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('guild-vault', {
      body: {
        action,
        ...payload,
      },
    });

    if (error) {
      throw error;
    }

    return (data || {}) as T;
  }, []);

  const withMutation = useCallback(async <T,>(fn: () => Promise<T>) => {
    setMutating(true);
    try {
      return await fn();
    } finally {
      setMutating(false);
    }
  }, []);

  const createSecret = useCallback(
    (payload: Record<string, unknown>) =>
      withMutation(async () => {
        const response = await invokeVault<{ success?: boolean }>('create_secret', payload);
        await loadSecrets();
        if (includeAudit) {
          await loadAudit();
        }
        return response;
      }),
    [includeAudit, invokeVault, loadAudit, loadSecrets, withMutation],
  );

  const updateSecret = useCallback(
    (payload: Record<string, unknown>) =>
      withMutation(async () => {
        const response = await invokeVault<{ success?: boolean }>('update_secret', payload);
        await loadSecrets();
        if (includeAudit) {
          await loadAudit();
        }
        return response;
      }),
    [includeAudit, invokeVault, loadAudit, loadSecrets, withMutation],
  );

  const saveSecretAccessRules = useCallback(
    (secretId: string, accessRules: GuildSecretAccessRule[]) =>
      withMutation(async () => {
        const response = await invokeVault<{ success?: boolean }>('update_secret', {
          secret_id: secretId,
          access_rules: accessRules,
          client_surface: 'guild_vault',
        });
        await loadSecrets();
        if (includeAudit) {
          await loadAudit(secretId);
        }
        return response;
      }),
    [includeAudit, invokeVault, loadAudit, loadSecrets, withMutation],
  );

  const rotateSecret = useCallback(
    (payload: Record<string, unknown>) =>
      withMutation(async () => {
        const response = await invokeVault<{ success?: boolean }>('rotate_secret', payload);
        await loadSecrets();
        if (includeAudit) {
          await loadAudit();
        }
        return response;
      }),
    [includeAudit, invokeVault, loadAudit, loadSecrets, withMutation],
  );

  const archiveSecret = useCallback(
    (payload: Record<string, unknown>) =>
      withMutation(async () => {
        const response = await invokeVault<{ success?: boolean }>('archive_secret', payload);
        await loadSecrets();
        if (includeAudit) {
          await loadAudit();
        }
        return response;
      }),
    [includeAudit, invokeVault, loadAudit, loadSecrets, withMutation],
  );

  const deleteSecret = useCallback(
    (payload: Record<string, unknown>) =>
      withMutation(async () => {
        const response = await invokeVault<{ success?: boolean }>('delete_secret', payload);
        await loadSecrets();
        if (includeAudit) {
          await loadAudit();
        }
        return response;
      }),
    [includeAudit, invokeVault, loadAudit, loadSecrets, withMutation],
  );

  const revealSecret = useCallback(
    async (secretId: string, reason?: string) => {
      const response = await invokeVault<{
        payload: GuildSecretPayload;
        revealed_at: string;
        expires_client_at: string;
      }>(
        'reveal_secret',
        { secret_id: secretId, reason, client_surface: 'guild_vault' },
      );

      if (includeAudit) {
        await loadAudit(secretId);
      }

      return response;
    },
    [includeAudit, invokeVault, loadAudit],
  );

  const copySecret = useCallback(
    async (secretId: string, reason?: string) => {
      const response = await invokeVault<{
        payload: GuildSecretPayload;
        revealed_at: string;
        expires_client_at: string;
      }>(
        'copy_secret',
        { secret_id: secretId, reason, client_surface: 'guild_vault' },
      );

      if (includeAudit) {
        await loadAudit(secretId);
      }

      return response;
    },
    [includeAudit, invokeVault, loadAudit],
  );

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  useEffect(() => {
    if (!includeAudit) return;
    loadAudit();
  }, [includeAudit, loadAudit]);

  return {
    secrets,
    auditEvents,
    loading,
    auditLoading,
    mutating,
    loadSecrets,
    loadAudit,
    loadSecretAccessRules,
    createSecret,
    updateSecret,
    saveSecretAccessRules,
    rotateSecret,
    archiveSecret,
    deleteSecret,
    revealSecret,
    copySecret,
  };
}
