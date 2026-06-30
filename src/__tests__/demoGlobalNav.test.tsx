import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { GlobalNav } from '@/components/GlobalNav';
import { translationsEn } from '@/i18n/translations.en';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    signOut: vi.fn(),
    isImpersonating: false,
    impersonationTarget: null,
    restoreAdminSession: vi.fn(),
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: translationsEn,
  }),
}));

vi.mock('@/features/command-palette', () => ({
  CommandPaletteTrigger: () => <button type="button">Search or navigate...</button>,
}));

vi.mock('@/hooks/useAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: false }),
}));

describe('GlobalNav demo chrome', () => {
  it('shows a connected demo identity on demo routes without a real auth user', () => {
    render(
      <MemoryRouter initialEntries={['/demo/poll/demo-poll-midnight-availability']}>
        <GlobalNav />
      </MemoryRouter>,
    );

    expect(screen.getByText('Astral Vanguard')).toBeInTheDocument();
    expect(screen.getByText('Nyx')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
  });
});
