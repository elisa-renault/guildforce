import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PollCard } from '@/components/polls/PollCard';
import { translationsEn } from '@/i18n/translations.en';
import type { GuildPoll } from '@/types/poll';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'fr',
    t: { ...translationsEn, lang: 'fr' },
  }),
}));

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

const closedPoll: GuildPoll = {
  id: 'poll-1',
  guild_id: 'guild-1',
  roster_id: null,
  created_by: 'user-1',
  title: 'Sondage fermé',
  description: 'Description',
  status: 'closed',
  is_anonymous: false,
  allow_multiple_responses: false,
  ends_at: null,
  created_at: '2026-03-11T10:00:00.000Z',
  updated_at: '2026-03-11T10:00:00.000Z',
};

describe('PollCard', () => {
  it('allows managers to open metadata settings for closed polls', () => {
    render(
      <PollCard
        poll={closedPoll}
        isGM={true}
        guildSlug="eu/hyjal/guildforce"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(navigateMock).toHaveBeenCalledWith('/guild/eu/hyjal/guildforce/polls/poll-1/edit?mode=metadata');
  });
});
