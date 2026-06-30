import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import GuildAtlasEditor from '@/pages/GuildAtlasEditor';

const mockLoadDocument = vi.fn();

const atlasDocument = {
  id: '91294ca9-3f68-4771-b82a-1e8781579914',
  guild_id: 'guild-1',
  title: 'Atlas Draft',
  summary: 'Draft summary',
  content: 'Draft body',
  collection: null,
  tags: ['raid'],
  status: 'draft',
  visibility_type: 'members',
  min_rank_index: null,
  roster_id: null,
  owner_user_id: 'user-1',
  created_by: 'user-1',
  updated_by: 'user-1',
  slug: 'atlas-draft',
  created_at: '2026-06-29T00:00:00.000Z',
  updated_at: '2026-06-29T00:00:00.000Z',
  owner_username: 'Elisa',
  owner_avatar_url: null,
  roster_name: null,
} as const;
let mockDocuments: Array<typeof atlasDocument> = [];

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: {
      auto: {},
      common: {
        cancel: 'Cancel',
        save: 'Save',
        publish: 'Publish',
      },
    },
  }),
}));

vi.mock('@/hooks/useGuildAccessState', () => ({
  useGuildAccessState: () => ({
    loading: false,
    requiresAuth: false,
    notFound: false,
    guild: {
      id: 'guild-1',
      name: 'Les Galactiques',
      server: 'archimonde',
      region: 'eu',
      faction: 'alliance',
      avatar_url: null,
      officer_rank_threshold: 2,
    },
    isMember: true,
    isGM: true,
    hasManageRosters: false,
    hasViewActivityLog: false,
    hasManageVault: false,
    hasViewVaultAudit: false,
    hasManageAtlas: false,
    hasVaultAccess: false,
  }),
}));

vi.mock('@/hooks/useGuildAtlas', () => ({
  useGuildAtlas: () => ({
    documents: mockDocuments,
    rosters: [],
    loading: false,
    mutating: false,
    saveDocument: vi.fn(),
    unpublishDocument: vi.fn(),
    archiveDocument: vi.fn(),
    restoreDocument: vi.fn(),
    uploadAtlasImage: vi.fn(),
    loadDocument: mockLoadDocument,
  }),
}));

vi.mock('@/components/CosmicBackground', () => ({
  CosmicBackground: () => null,
}));

vi.mock('@/components/GlowCard', () => ({
  GlowCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/guild', () => ({
  GuildWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AtlasEditorSurface: ({ initialData }: { initialData: { title: string; content: string } }) => (
    <div>
      <input aria-label="Title" readOnly value={initialData.title} />
      <textarea aria-label="Content" readOnly value={initialData.content} />
    </div>
  ),
}));

vi.mock('@/components/layout/PageContainer', () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/markdown/MarkdownEditor', () => ({
  MarkdownEditor: ({ value }: { value: string }) => <textarea aria-label="Content" readOnly value={value} />,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

afterEach(() => {
  cleanup();
  mockLoadDocument.mockReset();
  mockDocuments = [];
});

describe('GuildAtlasEditor', () => {
  it('loads the edited document by id before redirecting away from the edit route', async () => {
    mockLoadDocument.mockResolvedValue(atlasDocument);

    render(
      <MemoryRouter initialEntries={['/guild/eu/archimonde/les-galactiques/atlas/91294ca9-3f68-4771-b82a-1e8781579914/edit']}>
        <Routes>
          <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/atlas/:documentId/edit" element={<><LocationProbe /><GuildAtlasEditor /></>} />
          <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/atlas" element={<><LocationProbe /><div>Atlas library</div></>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Atlas Draft')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toHaveValue('Draft body');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/guild/eu/archimonde/les-galactiques/atlas/91294ca9-3f68-4771-b82a-1e8781579914/edit');
    });
    expect(mockLoadDocument).toHaveBeenCalledWith('91294ca9-3f68-4771-b82a-1e8781579914');
  });

  it('does not block editing when the document is already available from the Atlas list', async () => {
    mockDocuments = [atlasDocument];
    mockLoadDocument.mockReturnValue(new Promise(() => undefined));

    render(
      <MemoryRouter initialEntries={['/guild/eu/archimonde/les-galactiques/atlas/91294ca9-3f68-4771-b82a-1e8781579914/edit']}>
        <Routes>
          <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/atlas/:documentId/edit" element={<><LocationProbe /><GuildAtlasEditor /></>} />
          <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/atlas" element={<><LocationProbe /><div>Atlas library</div></>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Atlas Draft')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/guild/eu/archimonde/les-galactiques/atlas/91294ca9-3f68-4771-b82a-1e8781579914/edit');
    expect(mockLoadDocument).not.toHaveBeenCalled();
  });
});
