import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PollResultsAccessConfig } from '@/types/poll';

import { PollResultsAccessEditor } from '@/components/polls/PollResultsAccessEditor';
import { translationsEn } from '@/i18n/translations.en';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'fr',
    t: { ...translationsEn, lang: 'fr' },
  }),
}));

afterEach(() => {
  cleanup();
});

const baseConfig: PollResultsAccessConfig = {
  base_audience: 'guild_members',
  base_visibility: 'full',
  rules: [
    {
      audience_type: 'base_audience',
      visibility_level: 'none',
      target_type: 'question_type',
      question_type: 'text',
    },
  ],
};

describe('PollResultsAccessEditor', () => {
  it('renders the guided preset summary and system note', () => {
    render(
      <PollResultsAccessEditor
        config={baseConfig}
        members={[]}
        ranks={[]}
        sections={[]}
        questions={[]}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText('Politique globale')).toBeInTheDocument();
    expect(screen.getByText('Les membres voient seulement le non-texte')).toBeInTheDocument();
    expect(
      screen.getByText('Les membres de guilde voient tous les résultats sauf les réponses en texte libre.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Les GM et les membres avec manage_polls voient toujours tous les résultats.'),
    ).toBeInTheDocument();
  });

  it('keeps expert mode collapsed by default and reveals expert controls on demand', () => {
    render(
      <PollResultsAccessEditor
        config={{ ...baseConfig, rules: [] }}
        members={[]}
        ranks={[]}
        sections={[]}
        questions={[]}
        onChange={() => undefined}
      />,
    );

    expect(screen.queryByText('Audience globale')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le mode expert' }));

    expect(screen.getByText('Audience globale')).toBeInTheDocument();
    expect(screen.getByText('Aucune exception. Les résultats suivent uniquement la politique globale.')).toBeInTheDocument();
  });
});
