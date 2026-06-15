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
      saving={false}
      maxWishes={13}
      onStartEditing={vi.fn()}
      onUpdateEditWish={vi.fn()}
      onEditStatusChange={vi.fn()}
      onSaveEditing={vi.fn()}
      onAddWish={vi.fn()}
      onRemoveWish={vi.fn()}
      onClearWish={vi.fn()}
      {...props}
    />,
  );

describe('RosterTable', () => {
  it('shows loading copy instead of the empty state while roster wishes are loading', () => {
    renderRosterTable({ loading: true, members: [] });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
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
});
