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
import { translationsZhTw } from '@/i18n/translations.zh-TW';
import { buildVaultAuditDetails, getVaultAuditActionLabel } from '@/lib/guildVaultAuditLabels';

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
    const zhTwValue = await loadTranslations('zh-TW');
    const koValue = await loadTranslations('ko');

    expect(deValue).toBe(translationsDe);
    expect(esValue).toBe(translationsEs);
    expect(ptBrValue).toBe(translationsPtBr);
    expect(itValue).toBe(translationsIt);
    expect(ruValue).toBe(translationsRu);
    expect(zhTwValue).toBe(translationsZhTw);
    expect(koValue).toBe(translationsKo);
    expect(deValue.common.save).toBe('Speichern');
    expect(deValue.common.myGuilds).toBe('Meine Gilden');
    expect(deValue.battlenet.connect).toBe('Mein Battle.net-Konto verbinden');
    expect(deValue.guildSwitcher.search).toBe('Gilden suchen');
    expect(esValue.guildSwitcher.favorites).toBe('Favoritas');
    expect(esValue.dashboard.analytics).toBe('Análisis');
    expect(esValue.cookies.analytics).toBe('Cookies analíticas');
    expect(ptBrValue.guildSwitcher.recent).toBe('Guildas recentes');
    expect(ptBrValue.dashboard.analytics).toBe('Análises');
    expect(ptBrValue.cookies.analytics).toBe('Cookies analíticos');
    expect(itValue.common.save).toBe('Salva');
    expect(itValue.guildSwitcher.allGuilds).toBe('Tutte le gilde');
    expect(itValue.dashboard.analytics).toBe('Analisi');
    expect(itValue.cookies.analytics).toBe('Cookie di analisi');
    expect(ruValue.guildSwitcher.search).toBe('Поиск гильдий');
    expect(zhTwValue.guildSwitcher.empty).toBe('沒有可用公會');
    expect(zhTwValue.dashboard.analytics).toBe('分析');
    expect(zhTwValue.guild.guildMaster).toBe('公會會長');
    expect(zhTwValue.wishes.rosterDecision.bench).toBe('候補');
    expect(zhTwValue.legal.legalNotice).toBe('法律聲明');
    expect(zhTwValue.legal.privacyPolicy).toBe('隱私權政策');
    expect(zhTwValue.patchnotes.changelog).toBe('更新紀錄');
    expect(zhTwValue.bugReport.title).toBe('問題回報');
    expect(zhTwValue.bugReport.titlePlaceholder).toBe('簡短描述問題');
    expect(zhTwValue.profile.title).toBe('我的個人檔案');
    expect(zhTwValue.profile.accountConnection).toBe('帳號連結');
    expect(zhTwValue.profile.ui.viewPublicProfile).toBe('查看公開個人檔案');
    expect(zhTwValue.profile.battletagVisibility.guildOnly).toBe('僅公會成員');
    expect(zhTwValue.cookies.preferencesTitle).toBe('Cookie 偏好設定');
    expect(zhTwValue.cookies.essential).toBe('必要 Cookie');
    expect(zhTwValue.cookies.analytics).toBe('分析 Cookie');
    expect(zhTwValue.cookies.marketing).toBe('行銷 Cookie');
    expect(zhTwValue.cookies.savePreferences).toBe('儲存偏好設定');
    expect(zhTwValue.guildVault.title).toBe('公會保管庫');
    expect(zhTwValue.guildVault.addSecret).toBe('新增機密');
    expect(zhTwValue.guildVault.actions.reveal).toBe('顯示');
    expect(zhTwValue.guildSettings.guildInfo).toBe('公會資訊');
    expect(zhTwValue.guildSettings.rankLabels.title).toBe('階級標籤');
    expect(zhTwValue.guildSettings.rankLabels.placeholder).toBe('留空即可使用預設標籤');
    expect(zhTwValue.polls.resultsUi.controls).toBe('閱讀控制');
    expect(zhTwValue.polls.resultsUi.sort.original).toBe('原始順序');
    expect(zhTwValue.polls.resultsUi.cohortEmpty).toBe('尚無子群組篩選。新增一個或多個篩選以聚焦分析。');
    expect(koValue.guildSwitcher.removeFavorite).toBe('즐겨찾기에서 제거');
    expect(koValue.dashboard.analytics).toBe('분석');
  });

  it('localizes vault audit action and surface labels in every locale', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const locales = [
      await loadTranslations('en'),
      await loadTranslations('fr'),
      await loadTranslations('de'),
      await loadTranslations('es'),
      await loadTranslations('pt-BR'),
      await loadTranslations('it'),
      await loadTranslations('ru'),
      await loadTranslations('zh-TW'),
      await loadTranslations('ko'),
    ];

    for (const locale of locales) {
      expect(locale.activityLog.vaultSecretRevealed).toBeTruthy();
      expect(locale.activityLog.vaultSecretRevealed).not.toBe('revealed');
      expect(locale.activityLog.auditSurfaces.guild_vault).toBeTruthy();
      expect(locale.activityLog.auditSurfaces.guild_vault).not.toBe('guild_vault');
    }

    expect(getVaultAuditActionLabel('revealed', translationsKo.activityLog)).toBe('비밀 정보 표시됨');
    expect(
      buildVaultAuditDetails(
        { client_surface: 'guild_vault', version_number: 3 },
        translationsKo.activityLog,
      ),
    ).toBe('표면: 길드 금고 • 버전 3');
  });

  it('keeps DE release-scope dictionary out of EN fallback', () => {
    const scope = [
      'common',
      'routeMeta',
      'guildSwitcher',
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
