import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AtlasEditorSurface, AtlasLibrarySurface } from '@/components/guild';
import { demoAtlasDocuments } from '@/demo/demoWorkspace';
import { translationsEn } from '@/i18n/translations.en';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { ...translationsEn, lang: 'en' },
  }),
}));

describe('Atlas shared surfaces', () => {
  it('renders the library surface with demo documents and manager actions', () => {
    render(
      <MemoryRouter initialEntries={['/demo/atlas?doc=demo-atlas-midnight-roster']}>
        <AtlasLibrarySurface
          documents={demoAtlasDocuments}
          canManageAtlas
          mutating={false}
          onCreate={vi.fn()}
          onEdit={vi.fn()}
          onPublish={vi.fn()}
          onUnpublish={vi.fn()}
          onArchive={vi.fn()}
          onRestore={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /atlas/i })).toBeTruthy();
    expect(screen.getAllByText('Midnight roster operating plan').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /edit/i })).toBeTruthy();
    expect(screen.getByText('New doc')).toBeTruthy();
  });

  it('renders the editor surface with roster visibility data', () => {
    render(
      <MemoryRouter>
        <AtlasEditorSurface
          resetKey="demo-atlas-midnight-roster-only"
          isEditing
          initialData={{
            title: 'Roster doc',
            summary: 'Roster-only document',
            content: '## Notes',
            collection: 'Raid planning',
            tags: ['roster'],
            status: 'published',
            visibility_type: 'roster',
            min_rank_index: null,
            roster_id: 'demo-midnight-mythic-team',
            owner_user_id: 'demo-user-nyx',
          }}
          selectedStatus="published"
          selectedDocumentStatus="published"
          rosters={[{ id: 'demo-midnight-mythic-team', name: 'Midnight Mythic Team' }]}
          mutating={false}
          onBack={vi.fn()}
          onSave={vi.fn()}
          onPublish={vi.fn()}
          onUnpublish={vi.fn()}
          onArchive={vi.fn()}
          onRestore={vi.fn()}
          uploadImage={async () => 'https://guildforce.local/demo/atlas-images/image.png'}
        />
      </MemoryRouter>,
    );

    expect(screen.getByDisplayValue('Roster doc')).toBeTruthy();
    expect(screen.getByText('Markdown')).toBeTruthy();
    expect(screen.getByRole('button', { name: /unpublish/i })).toBeTruthy();
  });
});
