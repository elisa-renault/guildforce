import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuildAtlasDocument } from '@/hooks/useGuildAtlas';

import { useGuildAtlas } from '@/hooks/useGuildAtlas';

const fromMock = vi.fn();
const deleteCalls: Array<{ table: string; filters: Array<[string, unknown]> }> = [];

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const createQuery = (table: string) => {
  let isDelete = false;
  const filters: Array<[string, unknown]> = [];
  const query = {
    select: vi.fn(() => query),
    delete: vi.fn(() => {
      isDelete = true;
      return query;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return query;
    }),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    then: (resolve: (value: { data?: unknown[]; error: null }) => unknown, reject?: (reason?: unknown) => unknown) => {
      if (isDelete) {
        deleteCalls.push({ table, filters });
        return Promise.resolve({ error: null }).then(resolve, reject);
      }

      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    },
  };

  return query;
};

const document = {
  id: 'doc-1',
  guild_id: 'guild-1',
  title: 'Atlas document',
  summary: null,
  content: '',
  collection: null,
  tags: [],
  status: 'draft',
  visibility_type: 'members',
  min_rank_index: null,
  roster_id: null,
  owner_user_id: 'user-1',
  created_by: 'user-1',
  updated_by: 'user-1',
  slug: 'atlas-document',
  created_at: '2026-06-29T00:00:00.000Z',
  updated_at: '2026-06-29T00:00:00.000Z',
  owner_username: 'Elisa',
  owner_avatar_url: null,
  roster_name: null,
} as GuildAtlasDocument;

beforeEach(() => {
  deleteCalls.length = 0;
  fromMock.mockImplementation((table: string) => createQuery(table));
});

describe('useGuildAtlas', () => {
  it('permanently deletes Atlas documents scoped to the current guild', async () => {
    const { result } = renderHook(() => useGuildAtlas({ guildId: 'guild-1', canManage: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteDocument(document);
    });

    expect(deleteCalls).toContainEqual({
      table: 'guild_atlas_documents',
      filters: [
        ['guild_id', 'guild-1'],
        ['id', 'doc-1'],
      ],
    });
  });
});
