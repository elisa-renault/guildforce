import { describe, expect, it } from 'vitest';

import type { PollResultsAccessConfig } from '@/types/poll';

import {
  buildConfigFromPreset,
  describeRule,
  getAudienceTypeLabel,
  getBaseAudienceLabel,
  getCanonicalSummary,
  getPresetLabel,
  getQuestionTypeLabel,
  getQuickPresetLabel,
  getTargetTypeLabel,
  getVisibilityLabel,
  getVisibilityPreset,
} from '@/components/polls/pollResultsAccessUx';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';

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

  it('returns Traditional Chinese labels for the results access editor', () => {
    const config = buildConfigFromPreset('everyone_full');

    expect(getPresetLabel('everyone_full', 'zh-TW')).toBe('所有人都能查看全部');
    expect(getCanonicalSummary(config, 'zh-TW')).toBe('公會成員可以查看所有結果。');
    expect(getQuestionTypeLabel('single_choice', 'zh-TW')).toBe('單選');
  });

  it('has dedicated results access labels for every supported language', () => {
    const englishValues = new Set([
      getPresetLabel('everyone_full', 'en'),
      getBaseAudienceLabel('guild_members', 'en'),
      getVisibilityLabel('full', 'en'),
      getAudienceTypeLabel('rank_range', 'en'),
      getTargetTypeLabel('question_type', 'en'),
      getQuestionTypeLabel('single_choice', 'en'),
      getQuickPresetLabel('mask_text', 'en'),
      getCanonicalSummary(buildConfigFromPreset('everyone_full'), 'en'),
    ]);

    for (const language of SUPPORTED_LANGUAGES) {
      const values = [
        getPresetLabel('everyone_full', language),
        getBaseAudienceLabel('guild_members', language),
        getVisibilityLabel('full', language),
        getAudienceTypeLabel('rank_range', language),
        getTargetTypeLabel('question_type', language),
        getQuestionTypeLabel('single_choice', language),
        getQuickPresetLabel('mask_text', language),
        getCanonicalSummary(buildConfigFromPreset('everyone_full'), language),
      ];

      for (const value of values) {
        expect(value).toBeTruthy();
        if (language !== 'en') {
          expect(englishValues.has(value)).toBe(false);
        }
      }
    }
  });

  it('builds localized custom summaries for every supported language', () => {
    const customConfig: PollResultsAccessConfig = {
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

    const summaries = SUPPORTED_LANGUAGES.map((language) => [language, getCanonicalSummary(customConfig, language)]);

    for (const [language, summary] of summaries) {
      expect(summary).toBeTruthy();
      if (language !== 'en') {
        expect(summary).not.toContain('Custom configuration');
      }
    }
  });

  it('builds a Traditional Chinese contextual sentence for a text exception', () => {
    const sentence = describeRule(
      {
        audience_type: 'base_audience',
        visibility_level: 'none',
        target_type: 'question_type',
        question_type: 'text',
      },
      { language: 'zh-TW' },
    );

    expect(sentence).toBe('對同全域政策的對象, 自由文字問題 已隱藏.');
  });
});
