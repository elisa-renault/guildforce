import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RosterTable } from '@/components/dashboard/RosterTable';
import { translationsEn } from '@/i18n/translations.en';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({
    regionSlug: 'eu',
    serverSlug: 'archimonde',
    guildSlug: 'les-galactiques',
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { ...translationsEn, lang: 'en' },
  }),
}));

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

const member = {
  id: 'user-1',
  username: 'Yaya',
  mainCharacterName: 'Berthegarde',
  status: 'confirmed',
  wishes: [
    {
      choice_index: 1,
      class_id: 'warrior',
      spec_ids: ['warrior-arms'],
      comment: null,
      validation_status: 'approved',
    },
  ],
  selectionStatus: 'selected',
};

const renderRosterTable = (props = {}) =>
  render(
    <RosterTable
      members={[]}
      currentUserId="current-user"
      editingUserId={null}
      editWishes={[]}
      editStatus="undecided"
      editSelectionStatus="undecided"
      saving={false}
      maxWishes={13}
      onStartEditing={vi.fn()}
      onUpdateEditWish={vi.fn()}
      onEditStatusChange={vi.fn()}
      onEditSelectionStatusChange={vi.fn()}
      onEditGuildMainChange={vi.fn()}
      onSaveEditing={vi.fn()}
      onCancelEditing={vi.fn()}
      onAddWish={vi.fn()}
      onRemoveWish={vi.fn()}
      onClearWish={vi.fn()}
      {...props}
    />,
  );

describe('RosterTable', () => {
  it('shows loading skeletons instead of the empty state while roster wishes are loading', () => {
    const { container } = renderRosterTable({ loading: true, members: [] });

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('No data to display')).not.toBeInTheDocument();
  });

  it('shows the empty state when loading is complete and there are no members', () => {
    renderRosterTable({ loading: false, members: [] });

    expect(screen.getByText('No data to display')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders member rows when data is available', () => {
    renderRosterTable({ loading: false, members: [member] });

    expect(screen.getByText('Yaya')).toBeInTheDocument();
    expect(screen.queryByText('No data to display')).not.toBeInTheDocument();
  });

  it('renders roster decision controls for wish managers', () => {
    renderRosterTable({
      loading: false,
      members: [member],
      canManageWishes: true,
      onSelectionStatusChange: vi.fn(),
    });

    expect(screen.getByRole('button', { name: 'Selected' })).toBeInTheDocument();
  });

  it('renders inline edit controls without crashing', () => {
    renderRosterTable({
      loading: false,
      members: [member],
      currentUserId: 'user-1',
      editingUserId: 'user-1',
      editWishes: [
        { classId: 'warrior', specIds: ['warrior-arms'], comment: '' },
        { classId: '', specIds: [], comment: '' },
        { classId: '', specIds: [], comment: '' },
      ],
      editStatus: 'confirmed',
      editSelectionStatus: 'selected',
      canManageWishes: true,
      onSelectionStatusChange: vi.fn(),
    });

    expect(screen.getByRole('button', { name: 'Selected' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
