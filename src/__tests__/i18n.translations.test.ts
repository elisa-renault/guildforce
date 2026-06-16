import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadTranslations } from '@/i18n/translations';
import { translationsDe } from '@/i18n/translations.de';
import { translationsEn } from '@/i18n/translations.en';
import { translationsEs } from '@/i18n/translations.es';
import { translationsFr } from '@/i18n/translations.fr';
import { translationsIt } from '@/i18n/translations.it';
import { translationsKo } from '@/i18n/translations.ko';
import { translationsPtBr } from '@/i18n/translations.pt-BR';
import { translationsRu } from '@/i18n/translations.ru';
import { translationsZhCn } from '@/i18n/translations.zh-CN';

const flatten = (value: unknown, prefix = '', acc: Record<string, string> = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) acc[prefix] = String(value ?? '');
    return acc;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, nextPrefix, acc);
    } else {
      acc[nextPrefix] = String(child ?? '');
    }
  }

  return acc;
};

describe('i18n translations loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads FR translations explicitly', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const value = await loadTranslations('fr');
    expect(value.common.loading).toBe(translationsFr.common.loading);
  });

  it('loads all configured locale packs', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const deValue = await loadTranslations('de');
    const esValue = await loadTranslations('es');
    const ptBrValue = await loadTranslations('pt-BR');
    const itValue = await loadTranslations('it');
    const ruValue = await loadTranslations('ru');
    const zhValue = await loadTranslations('zh-CN');
    const koValue = await loadTranslations('ko');

    expect(deValue).toBe(translationsDe);
    expect(esValue).toBe(translationsEs);
    expect(ptBrValue).toBe(translationsPtBr);
    expect(itValue).toBe(translationsIt);
    expect(ruValue).toBe(translationsRu);
    expect(zhValue).toBe(translationsZhCn);
    expect(koValue).toBe(translationsKo);
    expect(deValue.common.save).toBe('Speichern');
    expect(deValue.common.myGuilds).toBe('Meine Gilden');
    expect(deValue.battlenet.connect).toBe('Mein Battle.net-Konto verbinden');
    expect(itValue.common.save).toBe('Salva');
  });

  it('keeps DE release-scope dictionary out of EN fallback', () => {
    const scope = [
      'common',
      'routeMeta',
      'battlenet',
      'home',
      'auth',
      'guild',
      'wishes',
      'dashboard',
      'permissions',
      'rosters',
      'polls',
      'admin',
      'accessibility',
      'patchnotes',
      'legal',
      'cookies',
      'profile',
    ];
    const allowedIdentical = new Set([
      'common.filter',
      'battlenet.region',
      'battlenet.main',
      'home.title',
      'guild.server',
      'guild.horde',
      'guild.rank0',
      'dashboard.tank',
      'dashboard.dps',
      'profile.battletag',
      'profile.characterName',
      'profile.ui.avatarAlt',
      'rosters.rosterName',
      'polls.conditionOperator',
      'bugReport.priorities.medium',
      'bugReport.browser',
      'bugReport.admin.reporter',
      'admin.global',
      'admin.name',
      'admin.server',
      'admin.region',
      'admin.stats.groupModeration',
      'admin.stats.dauUsers',
      'admin.stats.wauUsers',
      'admin.stats.mauUsers',
      'patchnotes.version',
      'patchnotes.status',
    ]);

    const enFlat = flatten(translationsEn);
    const deFlat = flatten(translationsDe);

    const fallbackLeaks = Object.entries(enFlat).filter(([key, value]) => {
      if (!scope.some((prefix) => key === prefix || key.startsWith(`${prefix}.`))) return false;
      if (allowedIdentical.has(key)) return false;
      return deFlat[key] === value;
    });

    expect(fallbackLeaks).toEqual([]);
  });
});
