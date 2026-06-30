import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { GuildOverviewSurface } from '@/components/guild';
import { ActivePollWidgetSurface } from '@/components/polls';
import { DEMO_ACTIVE_POLL_ID, buildDemoPolls } from '@/demo/demoPolls';
import { demoGuild, demoMembers } from '@/demo/demoRoster';
import { translationsEn } from '@/i18n/translations.en';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { ...translationsEn, lang: 'en' },
  }),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

describe('overview shared surfaces', () => {
  it('renders the guild overview surface without backend data hooks', () => {
    const member = demoMembers[0];

    render(
      <MemoryRouter>
        <GuildOverviewSurface
          guild={demoGuild}
          greetingName="Nyx"
          commitmentStatus="confirmed"
          myWishes={member.wishes.map((wish) => ({
            choice_index: wish.choice_index,
            class_id: wish.class_id,
            spec_ids: wish.spec_ids,
            validation_status: wish.validation_status || 'pending',
          }))}
          totalMembers={demoMembers.length}
          confirmedMembers={demoMembers.filter((item) => item.status === 'confirmed').length}
          pollWidget={<div>Active Poll</div>}
          onEditWishes={vi.fn()}
          onOpenRoster={vi.fn()}
          onOpenMembers={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Welcome, Nyx')).toBeInTheDocument();
    expect(screen.getByText('My Status')).toBeInTheDocument();
    expect(screen.getByText('My Wishes')).toBeInTheDocument();
    expect(screen.getByText('Guild Overview')).toBeInTheDocument();
    expect(screen.getByText('Active Poll')).toBeInTheDocument();
    expect(screen.getByText('Quick Access')).toBeInTheDocument();
  });

  it('routes active poll results through the supplied demo base path', () => {
    const activePoll = buildDemoPolls(translationsEn).find((poll) => poll.id === DEMO_ACTIVE_POLL_ID);

    render(
      <MemoryRouter initialEntries={['/demo']}>
        <Routes>
          <Route
            path="*"
            element={(
              <>
                <ActivePollWidgetSurface activePoll={activePoll} basePath="/demo" isGM />
                <LocationProbe />
              </>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /results/i }));

    expect(screen.getByTestId('location')).toHaveTextContent(`/demo/poll/${DEMO_ACTIVE_POLL_ID}/results`);
  });
});
