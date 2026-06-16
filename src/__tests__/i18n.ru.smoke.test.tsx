import { describe, expect, it } from 'vitest';

import type { Translations } from '@/i18n/translations';

import { listSemanticKeys, resolveSemanticMessage } from '@/i18n/semantic';
import { loadTranslations } from '@/i18n/translations';

describe('RU i18n smoke', () => {
  it('renders critical dictionary paths in Russian', async () => {
    const ru = await loadTranslations('ru');

    expect(ru.common.save).toBe('Сохранить');
    expect(ru.common.cancel).toBe('Отмена');
    expect(ru.routeMeta.home).toBe('Главная');
    expect(ru.routeMeta.guildPolls).toBe('Опросы');
    expect(ru.auth.loginWithBattleNet).toBe('Продолжить через Battle.net');
    expect(ru.guild.guildMaster).toBe('Гилд-мастер');
    expect(ru.polls.new).toBe('Новый опрос');
    expect(ru.admin.userManagement).toBe('Управление пользователями');
    expect(ru.admin.stats.users).toBe('Пользователи');
    expect(ru.admin.stats.chartActivityTrendTitle).toBe('Тренд активности (DAU / WAU / MAU)');
    expect(ru.battlenet.connect).toBe('Подключить аккаунт Battle.net');
    expect(ru.battlenet.resyncSuccess).toBe('Персонажи синхронизированы');
    expect(ru.battlenet.errorTokenExpired).toBe('Сессия Battle.net истекла. Требуется переподключение аккаунта.');
    expect(ru.home.subtitle).toBe('Планирование состава рейда к следующему дополнению');
    expect(ru.home.features.collect.title).toBe('Сбор пожеланий');
    expect(ru.home.features.export.description).toBe('Экспортируй CSV для таблиц и дополнительной аналитики.');
    expect(ru.dashboard.externalMember.addButton).toBe('Добавить внешнего');
    expect(ru.dashboard.externalMember.title).toBe('Добавить внешнего участника');
    expect(ru.dashboard.externalMember.classPlaceholder).toBe('Выбрать класс');
    expect(ru.activityLog.title).toBe('Журнал активности');
    expect(ru.activityLog.joinedGuild).toBe('Вступление в гильдию');
    expect(ru.activityLog.noActivity).toBe('Активность пока отсутствует');
    expect(ru.admin.loadingError).toBe('Ошибка загрузки');
    expect(ru.guildNav.overview).toBe('Обзор');
    expect(ru.guildNav.members).toBe('Участники');
    expect(ru.permissions.resetTooltip).toBe('Удалить все делегированные права');
    expect(ru.legal.privacyPolicy).toBe('Политика конфиденциальности');
    expect(ru.cookies.manageCookies).toBe('Управление cookie');
  });

  it('resolves RU semantic copy without EN fallback on core release keys', () => {
    const releasePrefixes = ['admin.', 'markdown.', 'polls.', 'guild.', 'settings.', 'ui.', 'globalnav.', 'activity.'];
    const keys = listSemanticKeys().filter((key) => releasePrefixes.some((prefix) => key.startsWith(prefix)));
    const translations = { auto: {} } as unknown as Translations;
    const requiredRu = new Set([
      'admin.user_manager.toast.role_removed',
      'admin.user_manager.toast.role_assigned',
      'admin.user_manager.search_placeholder',
      'polls.mutations.publish_success',
      'polls.editor.publish',
      'polls.results_access.title',
      'polls.respondent.title',
      'guild.polls.title',
      'dashboard.roster_analytics.wish_range',
      'dashboard.roster_filters.clear_all',
      'admin.sidebar.section.users',
      'ui.breadcrumb.aria_label',
      'globalnav.menu.label',
      'activity.log.title',
      'activity.log.action.wish_created',
      'activity.log.wish_created',
      'settings.guild_battlenet.resync_title',
      'settings.guild_battlenet.rename_cta',
      'settings.guild_battlenet.note',
      'guild.members.title',
      'guild.members.search_placeholder',
      'guild.members.all_ranks',
      'guild.members.main_alt',
      'guild.members.rank_label',
      'guild.members.table_rank',
      'guild.members.previous',
      'guild.members.next',
      'polls.sortable.type.single_choice',
      'polls.condition.operator.equals',
      'polls.results.datetime.responses',
    ]);

    const ruLeaks = keys.filter((key) => {
      if (!requiredRu.has(key)) return false;
      const ruValue = resolveSemanticMessage({ key, language: 'ru', translations });
      const enValue = resolveSemanticMessage({ key, language: 'en', translations });
      return ruValue === enValue;
    });

    expect(ruLeaks).toEqual([]);
  });

  it('keeps RU admin.stats copy out of raw EN fallback (except shared acronyms)', async () => {
    const ru = await loadTranslations('ru');
    const en = await loadTranslations('en');
    const allowedIdentical = new Set(['dauUsers', 'wauUsers', 'mauUsers']);

    const leaks = Object.keys(en.admin.stats).filter((key) => {
      if (allowedIdentical.has(key)) return false;
      const statKey = key as keyof typeof en.admin.stats;
      return ru.admin.stats[statKey] === en.admin.stats[statKey];
    });

    expect(leaks).toEqual([]);
  });

});
