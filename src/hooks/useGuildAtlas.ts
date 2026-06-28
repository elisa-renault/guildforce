import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Tables } from '@/integrations/supabase/types';
import type { AtlasDocStatus, AtlasVisibilityType } from '@/lib/guildAtlas';

import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { normalizeAtlasCollection, normalizeAtlasTags } from '@/lib/guildAtlas';
import { toSlug } from '@/lib/guildSlug';

type GuildAtlasDocumentRow = Tables<'guild_atlas_documents'>;

const ATLAS_IMAGE_BUCKET = 'guild-atlas-images';
const ATLAS_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export interface GuildAtlasDocument extends GuildAtlasDocumentRow {
  status: AtlasDocStatus;
  visibility_type: AtlasVisibilityType;
  owner_username: string | null;
  owner_avatar_url: string | null;
  roster_name: string | null;
}

export interface GuildAtlasRosterOption {
  id: string;
  name: string;
}

export interface GuildAtlasDocumentInput {
  title: string;
  summary: string | null;
  content: string;
  collection: string | null;
  tags: string[];
  status: AtlasDocStatus;
  visibility_type: AtlasVisibilityType;
  min_rank_index: number | null;
  roster_id: string | null;
  owner_user_id: string | null;
}

interface UseGuildAtlasOptions {
  guildId: string | null;
  canManage: boolean;
}

const normalizeDocument = (
  row: GuildAtlasDocumentRow,
  profilesById: Map<string, { username: string | null; avatar_url: string | null }>,
  rostersById: Map<string, string>,
): GuildAtlasDocument => ({
  ...row,
  status: row.status as AtlasDocStatus,
  visibility_type: row.visibility_type as AtlasVisibilityType,
  owner_username: row.owner_user_id ? profilesById.get(row.owner_user_id)?.username ?? null : null,
  owner_avatar_url: row.owner_user_id ? profilesById.get(row.owner_user_id)?.avatar_url ?? null : null,
  roster_name: row.roster_id ? rostersById.get(row.roster_id) ?? null : null,
});

const createDocumentSlug = (title: string) => {
  const base = toSlug(title) || 'atlas-doc';
  return `${base}-${Date.now().toString(36)}`;
};

const getMutationErrorMessage = (error: unknown, fallback: string) => {
  // Supabase errors often contain fields like status, statusText, message, details
  try {
    if (error instanceof Error && error.message) return error.message;

    if (typeof error === 'object' && error && error !== null) {
      const e = error as Record<string, unknown>;
      const status = e.status ?? e.statusCode ?? null;
      const statusText = e.statusText ?? null;
      const message = e.message ?? e.error ?? e.details ?? null;
      if (status || statusText || message) {
        const parts = [] as string[];
        if (status) parts.push(String(status));
        if (statusText) parts.push(String(statusText));
        if (message) parts.push(String(message));
        return parts.join(': ');
      }
      // Fallback to JSON string if available
      try {
        return JSON.stringify(e);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return fallback;
};

export function useGuildAtlas({ guildId, canManage }: UseGuildAtlasOptions) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<GuildAtlasDocument[]>([]);
  const [rosters, setRosters] = useState<GuildAtlasRosterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const userId = user?.id ?? null;

  const loadRosters = useCallback(async () => {
    if (!guildId) {
      setRosters([]);
      return new Map<string, string>();
    }

    const { data, error } = await supabase
      .from('rosters')
      .select('id, name')
      .eq('guild_id', guildId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      setRosters([]);
      return new Map<string, string>();
    }

    const rows = data || [];
    setRosters(rows);
    return new Map(rows.map((roster) => [roster.id, roster.name]));
  }, [guildId]);

  const loadDocuments = useCallback(async () => {
    if (!guildId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const rostersById = await loadRosters();
      const { data, error } = await supabase
        .from('guild_atlas_documents')
        .select('*')
        .eq('guild_id', guildId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as GuildAtlasDocumentRow[];
      const ownerIds = Array.from(new Set(rows.map((row) => row.owner_user_id).filter(Boolean))) as string[];
      const profilesById = new Map<string, { username: string | null; avatar_url: string | null }>();

      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', ownerIds);

        (profilesData || []).forEach((profile) => {
          profilesById.set(profile.id, {
            username: profile.username,
            avatar_url: profile.avatar_url,
          });
        });
      }

      setDocuments(rows.map((row) => normalizeDocument(row, profilesById, rostersById)));
    } catch {
      setDocuments([]);
      toast.error('Failed to load Atlas documents');
    } finally {
      setLoading(false);
    }
  }, [guildId, loadRosters]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const loadDocument = useCallback(
    async (documentId: string): Promise<GuildAtlasDocument | null> => {
      if (!guildId) return null;

      const rostersById = await loadRosters();
      const { data, error } = await supabase
        .from('guild_atlas_documents')
        .select('*')
        .eq('guild_id', guildId)
        .eq('id', documentId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as GuildAtlasDocumentRow;
      const profilesById = new Map<string, { username: string | null; avatar_url: string | null }>();

      if (row.owner_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', row.owner_user_id)
          .maybeSingle();

        if (profile) {
          profilesById.set(profile.id, {
            username: profile.username,
            avatar_url: profile.avatar_url,
          });
        }
      }

      return normalizeDocument(row, profilesById, rostersById);
    },
    [guildId, loadRosters],
  );

  const withMutation = useCallback(async <T,>(fn: () => Promise<T>) => {
    setMutating(true);
    try {
      return await fn();
    } finally {
      setMutating(false);
    }
  }, []);

  const saveDocument = useCallback(
    async (input: GuildAtlasDocumentInput, documentId?: string | null) =>
      withMutation(async () => {
        if (!guildId || !userId || !canManage) {
          throw new Error('Not authorized to manage Atlas documents');
        }

        const nextDocumentId = documentId || crypto.randomUUID();
        const payload = {
          ...input,
          guild_id: guildId,
          collection: normalizeAtlasCollection(input.collection),
          tags: normalizeAtlasTags(input.tags),
          summary: input.summary?.trim() || null,
          min_rank_index: input.visibility_type === 'rank' ? input.min_rank_index : null,
          roster_id: input.visibility_type === 'roster' ? input.roster_id : null,
          owner_user_id: input.owner_user_id || userId,
          updated_by: userId,
        };

        const request = documentId
          ? supabase
              .from('guild_atlas_documents')
              .update(payload)
              .eq('id', documentId)
          : supabase
              .from('guild_atlas_documents')
              .insert({
                id: nextDocumentId,
                ...payload,
                slug: createDocumentSlug(input.title),
                created_by: userId,
              });

        const { error } = await request;
        if (error) throw error;

        await loadDocuments();
        toast.success(documentId ? 'Atlas document updated' : 'Atlas document created');
        return nextDocumentId;
      }).catch((error) => {
        toast.error(getMutationErrorMessage(error, 'Failed to save Atlas document'));
        throw error;
      }),
    [canManage, guildId, loadDocuments, userId, withMutation],
  );

  const updateDocumentState = useCallback(
    async (documentId: string, patch: Partial<GuildAtlasDocumentInput>) =>
      withMutation(async () => {
        if (!userId || !canManage) {
          throw new Error('Not authorized to manage Atlas documents');
        }

        const { error } = await supabase
          .from('guild_atlas_documents')
          .update({
            ...patch,
            updated_by: userId,
          })
          .eq('id', documentId);

        if (error) throw error;
        await loadDocuments();
        toast.success('Atlas document status updated');
      }).catch((error) => {
        toast.error(getMutationErrorMessage(error, 'Failed to update Atlas document'));
        throw error;
      }),
    [canManage, loadDocuments, userId, withMutation],
  );

  const publishDocument = useCallback(
    (document: GuildAtlasDocument) => updateDocumentState(document.id, { status: 'published' }),
    [updateDocumentState],
  );

  const unpublishDocument = useCallback(
    (document: GuildAtlasDocument) => updateDocumentState(document.id, { status: 'draft' }),
    [updateDocumentState],
  );

  const archiveDocument = useCallback(
    (document: GuildAtlasDocument) => updateDocumentState(document.id, { status: 'archived' }),
    [updateDocumentState],
  );

  const restoreDocument = useCallback(
    (document: GuildAtlasDocument) => updateDocumentState(document.id, { status: 'draft' }),
    [updateDocumentState],
  );

  const deleteDocument = useCallback(
    async (document: GuildAtlasDocument) =>
      withMutation(async () => {
        if (!guildId || !userId || !canManage) {
          throw new Error('Not authorized to delete Atlas documents');
        }

        const { error } = await supabase
          .from('guild_atlas_documents')
          .delete()
          .eq('guild_id', guildId)
          .eq('id', document.id);

        if (error) throw error;
        await loadDocuments();
      }),
    [canManage, guildId, loadDocuments, userId, withMutation],
  );

  const uploadAtlasImage = useCallback(
    async (file: File) =>
      withMutation(async () => {
        if (!guildId || !userId || !canManage) {
          throw new Error('Not authorized to upload Atlas images');
        }

        if (!file.type.startsWith('image/') || file.size > ATLAS_IMAGE_MAX_SIZE) {
          throw new Error('Invalid Atlas image');
        }

        const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
        const filePath = `${guildId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(ATLAS_IMAGE_BUCKET)
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(ATLAS_IMAGE_BUCKET).getPublicUrl(filePath);
        return data.publicUrl;
      }).catch((error) => {
        toast.error(getMutationErrorMessage(error, 'Failed to upload Atlas image'));
        throw error;
      }),
    [canManage, guildId, userId, withMutation],
  );

  return useMemo(
    () => ({
      documents,
      rosters,
      loading,
      mutating,
      reload: loadDocuments,
      loadDocument,
      saveDocument,
      publishDocument,
      unpublishDocument,
      archiveDocument,
      restoreDocument,
      deleteDocument,
      uploadAtlasImage,
    }),
    [
      archiveDocument,
      deleteDocument,
      documents,
      loadDocument,
      loadDocuments,
      loading,
      mutating,
      publishDocument,
      restoreDocument,
      rosters,
      saveDocument,
      unpublishDocument,
      uploadAtlasImage,
    ],
  );
}
