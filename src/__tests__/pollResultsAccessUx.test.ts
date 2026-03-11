import { describe, expect, it } from 'vitest';

import type { PollResultsAccessConfig } from '@/types/poll';

import {
  buildConfigFromPreset,
  describeRule,
  getCanonicalSummary,
  getVisibilityPreset,
} from '@/components/polls/pollResultsAccessUx';

describe('pollResultsAccessUx', () => {
  it('recognizes the guild members non-text preset', () => {
    const config = buildConfigFromPreset('guild_members_non_text');

    expect(getVisibilityPreset(config)).toBe('guild_members_non_text');
    expect(getCanonicalSummary(config, 'fr')).toBe(
      'Les membres de guilde voient tous les résultats sauf les réponses en texte libre.',
    );
  });

  it('recognizes the managers-only preset', () => {
    const config = buildConfigFromPreset('managers_only');

    expect(getVisibilityPreset(config)).toBe('managers_only');
    expect(getCanonicalSummary(config, 'fr')).toBe('Seuls les gestionnaires du sondage voient les résultats.');
  });

  it('falls back to custom when config diverges from known presets', () => {
    const config: PollResultsAccessConfig = {
      base_audience: 'guild_members',
      base_visibility: 'full',
      rules: [
        {
          audience_type: 'base_audience',
          visibility_level: 'none',
          target_type: 'section',
          section_id: 'section-1',
        },
      ],
    };

    expect(getVisibilityPreset(config)).toBe('custom');
    expect(getCanonicalSummary(config, 'fr')).toContain('Configuration personnalisée');
  });

  it('builds a contextual sentence for a base-audience text exception', () => {
    const sentence = describeRule(
      {
        audience_type: 'base_audience',
        visibility_level: 'none',
        target_type: 'question_type',
        question_type: 'text',
      },
      { language: 'fr' },
    );

    expect(sentence).toBe('Pour la même audience que la politique globale, les questions de type texte libre sont masqués.');
  });
});
