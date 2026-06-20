import { describe, expect, it } from 'vitest';

import type { Translations } from '@/i18n/translations';

import { listSemanticKeys, resolveSemanticMessage } from '@/i18n/semantic';

const asTranslations = (auto: Record<string, string>): Translations =>
  ({ auto } as unknown as Translations);

describe('semantic i18n', () => {
  it('returns semantic FR copy when available', () => {
    const value = resolveSemanticMessage({
      key: 'admin.legal.edit_action',
      language: 'fr',
      translations: asTranslations({}),
    });

    expect(value).toBe('Modifier');
  });

  it('prefers DE semantic copy over legacy compatibility when available', () => {
    const value = resolveSemanticMessage({
      key: 'admin.documentation.title',
      language: 'de',
      translations: asTranslations({
        components_admin_AdminDocumentation_405: 'Dokumentation (legacy)',
      }),
    });

    expect(value).toBe('Dokumentation');
  });

  it('falls back to EN semantic copy when the locale has no dedicated semantic pack', () => {
    const value = resolveSemanticMessage({
      key: 'admin.patch.required_en_title',
      language: 'it',
      translations: asTranslations({}),
    });

    expect(value).toBe('An English title is required.');
  });

  it('returns Italian semantic copy for guild members, Atlas, activity, and Battle.net settings', () => {
    const cases: Array<[Parameters<typeof resolveSemanticMessage>[0]['key'], string]> = [
      ['guild.members.search_placeholder', 'Cerca personaggio o giocatore...'],
      ['guild.members.all_ranks', 'Tutti i ranghi'],
      ['guild.members.on_guildforce', 'Su Guildforce'],
      ['guild.members.not_registered', 'Non registrato'],
      ['guild.members.main_alt', 'Main/Alt'],
      ['guild.atlas.empty.filtered_title', 'Nessun documento corrispondente'],
      ['guild.atlas.reader.empty_title', 'Seleziona un documento Atlas'],
      ['guild.atlas.new_doc', 'Nuovo doc'],
      ['polls.respondent.title', 'Chi può inviare desideri'],
      ['settings.guild_battlenet.resync_title', 'Sincronizza cache membri'],
      ['settings.guild_battlenet.rename_action', 'Gilda rinominata'],
      ['settings.guild_battlenet.rename_cta', 'Rinomina in Guildforce'],
      ['activity.log.title', 'Registro attività'],
      ['activity.log.action.member_joined', 'Membro entrato'],
      ['activity.log.action.roster_wishes_locked', 'Desideri roster bloccati'],
      ['activity.log.action.atlas_doc_restored', 'Doc Atlas ripristinato'],
    ];

    for (const [key, expected] of cases) {
      expect(resolveSemanticMessage({ key, language: 'it', translations: asTranslations({}) })).toBe(expected);
    }
  });

  it('returns Spanish semantic copy for guild members, Atlas, poll access, Battle.net, and activity', () => {
    const cases: Array<[Parameters<typeof resolveSemanticMessage>[0]['key'], string]> = [
      ['guild.members.search_placeholder', 'Buscar personaje o jugador...'],
      ['guild.members.table_rank', 'Rango'],
      ['guild.members.main_alt', 'Main/Alt'],
      ['guild.atlas.empty.filtered_title', 'No hay documentos coincidentes'],
      ['guild.atlas.editor.collection_placeholder', 'Banda, onboarding, addons...'],
      ['polls.results_access.rank_rule_title', 'Por rango de hermandad'],
      ['polls.respondent.title', 'Target de encuestados'],
      ['settings.guild_battlenet.resync_title', 'Sincronizar caché de miembros'],
      ['settings.guild_battlenet.rename_cta', 'Renombrar en Guildforce'],
      ['dashboard.roster_table.total_wishes_suffix', 'deseos en total'],
      ['roster_wishes.manual_entry_label', 'Entrada manual'],
      ['activity.log.title', 'Registro de actividad'],
      ['activity.log.action.atlas_doc_restored', 'Doc Atlas restaurado'],
      ['activity.log.filter.roster_wishes_locked', 'Bloqueos de roster'],
    ];

    for (const [key, expected] of cases) {
      expect(resolveSemanticMessage({ key, language: 'es', translations: asTranslations({}) })).toBe(expected);
    }
  });

  it('prefers Spanish semantic copy over legacy auto keys when available', () => {
    const value = resolveSemanticMessage({
      key: 'polls.respondent.title',
      language: 'es',
      translations: asTranslations({
        components_polls_PollRespondentEditor_263: 'Respondent targeting (legacy)',
      }),
    });

    expect(value).toBe('Target de encuestados');
  });

  it('returns Brazilian Portuguese semantic copy for guild, Atlas, poll access, Battle.net, and activity', () => {
    const cases: Array<[Parameters<typeof resolveSemanticMessage>[0]['key'], string]> = [
      ['guild.members.search_placeholder', 'Buscar personagem ou jogador...'],
      ['guild.members.table_rank', 'Ranque'],
      ['guild.atlas.editor.collection_placeholder', 'Raide, onboarding, addons...'],
      ['polls.results_access.rank_rule_title', 'Por ranque de guilda'],
      ['polls.respondent.title', 'Alvo dos respondentes'],
      ['settings.guild_battlenet.resync_title', 'Sincronizar cache de membros'],
      ['settings.guild_battlenet.rename_cta', 'Renomear no Guildforce'],
      ['dashboard.roster_table.total_wishes_suffix', 'desejos no total'],
      ['roster_wishes.manual_entry_label', 'Entrada manual'],
      ['activity.log.title', 'Registro de atividade'],
      ['activity.log.action.atlas_doc_restored', 'Doc Atlas restaurado'],
      ['activity.log.filter.roster_wishes_locked', 'Bloqueios de roster'],
    ];

    for (const [key, expected] of cases) {
      expect(resolveSemanticMessage({ key, language: 'pt-BR', translations: asTranslations({}) })).toBe(expected);
    }
  });

  it('prefers Brazilian Portuguese semantic copy over legacy auto keys when available', () => {
    const value = resolveSemanticMessage({
      key: 'polls.respondent.title',
      language: 'pt-BR',
      translations: asTranslations({
        components_polls_PollRespondentEditor_263: 'Respondent targeting (legacy)',
      }),
    });

    expect(value).toBe('Alvo dos respondentes');
  });

  it('returns Traditional Chinese semantic copy for guild members, Atlas, poll access, Battle.net, and activity', () => {
    const cases: Array<[Parameters<typeof resolveSemanticMessage>[0]['key'], string]> = [
      ['guild.members.title', '公會成員'],
      ['guild.members.search_placeholder', '搜尋角色或玩家...'],
      ['guild.members.table_rank', '階級'],
      ['guild.members.main_alt', 'Main/Alt'],
      ['guild.atlas.editor.collection_placeholder', '團隊副本、入會導覽、addons...'],
      ['guild.atlas.empty.filtered_title', '沒有符合條件的文件'],
      ['polls.results_access.rank_rule_title', '依公會階級'],
      ['polls.respondent.title', '回覆對象'],
      ['polls.editor.general_questions', '一般問題'],
      ['polls.editor.publish', '發布投票'],
      ['settings.sidebar.section.profile', '設定檔'],
      ['settings.sidebar.section.activity', '活動'],
      ['settings.sidebar.category.management', '管理'],
      ['settings.guild_battlenet.resync_title', '同步成員快取'],
      ['settings.guild_battlenet.rename_cta', '在 Guildforce 重新命名'],
      ['dashboard.roster_table.total_wishes_suffix', '總心願數'],
      ['roster_wishes.manual_entry_label', '手動項目'],
      ['activity.log.title', '活動紀錄'],
      ['activity.log.action.atlas_doc_restored', 'Atlas 文件已還原'],
      ['activity.log.filter.roster_wishes_locked', '名單鎖定'],
    ];

    for (const [key, expected] of cases) {
      expect(resolveSemanticMessage({ key, language: 'zh-TW', translations: asTranslations({}) })).toBe(expected);
    }
  });

  it('returns Korean semantic copy for guild members, Atlas, poll access, Battle.net, and activity', () => {
    const cases: Array<[Parameters<typeof resolveSemanticMessage>[0]['key'], string]> = [
      ['guild.members.title', '길드 멤버'],
      ['guild.members.search_placeholder', '캐릭터 또는 플레이어 검색...'],
      ['guild.members.table_rank', '등급'],
      ['guild.members.main_alt', '본캐/부캐'],
      ['guild.atlas.editor.collection_placeholder', '공격대, 온보딩, addons...'],
      ['guild.atlas.empty.filtered_title', '일치하는 문서 없음'],
      ['polls.results_access.rank_rule_title', '길드 등급별'],
      ['polls.respondent.title', '응답 대상'],
      ['settings.guild_battlenet.resync_title', '멤버 캐시 동기화'],
      ['settings.guild_battlenet.rename_cta', 'Guildforce에서 이름 변경'],
      ['dashboard.roster_table.total_wishes_suffix', '총 희망'],
      ['roster_wishes.manual_entry_label', '수동 항목'],
      ['activity.log.title', '활동 로그'],
      ['activity.log.action.wish_season_drafted', '희망 시즌 초안 생성됨'],
      ['activity.log.action.atlas_doc_restored', 'Atlas 문서 복원됨'],
      ['activity.log.filter.wish_season_drafted', '초안 시즌'],
      ['activity.log.filter.roster_wishes_locked', '로스터 잠금'],
    ];

    for (const [key, expected] of cases) {
      expect(resolveSemanticMessage({ key, language: 'ko', translations: asTranslations({}) })).toBe(expected);
    }
  });

  it('prefers Korean semantic copy over legacy auto keys when available', () => {
    const value = resolveSemanticMessage({
      key: 'polls.respondent.title',
      language: 'ko',
      translations: asTranslations({
        components_polls_PollRespondentEditor_263: 'Respondent targeting (legacy)',
      }),
    });

    expect(value).toBe('응답 대상');
  });

  it('prefers Traditional Chinese semantic copy over legacy auto keys when available', () => {
    const value = resolveSemanticMessage({
      key: 'polls.respondent.title',
      language: 'zh-TW',
      translations: asTranslations({
        components_polls_PollRespondentEditor_263: 'Respondent targeting (legacy)',
      }),
    });

    expect(value).toBe('回覆對象');
  });

  it('returns dedicated DE semantic copy for release-scope keys', () => {
    const releasePrefixes = ['admin.', 'markdown.', 'polls.', 'guild.', 'settings.', 'ui.', 'globalnav.', 'activity.'];
    const allowedIdentical = new Set([
      'footer.brand',
      'auth.brand',
      'admin.patch.version_placeholder',
      'admin.patch.content_placeholder.fr',
      'markdown.toolbar.separator',
      'markdown.toolbar.link',
      'polls.sortable.option_prefix',
      'polls.sortable.min_value_label',
      'polls.sortable.max_value_label',
      'guild.members.guildforce_label',
      'guild.members.alts',
      'guild.members.main_alt',
      'admin.user_manager.table.battletag',
      'admin.user_manager.table.region',
      'admin.sidebar.section.patchnotes',
      'admin.sidebar.category.overview',
      'admin.sidebar.category.management',
      'admin.sidebar.category.content',
      'admin.sidebar.category.support',
      'settings.sidebar.section.battlenet',
      'settings.sidebar.category.mypermissions',
      'settings.sidebar.category.guild',
      'settings.sidebar.category.management',
      'settings.sidebar.category.audit',
      'settings.sidebar.category.integration',
      'ui.pagination.aria_label',
      'settings.guild_battlenet.title',
      'polls.section.section_label',
      'admin.bug_reports.url_label',
      'activity.log.system',
    ]);
    const keysToCheck = listSemanticKeys().filter((key) =>
      releasePrefixes.some((prefix) => key.startsWith(prefix)),
    );

    const leaks = keysToCheck.filter((key) => {
      const deValue = resolveSemanticMessage({
        key,
        language: 'de',
        translations: asTranslations({}),
      });
      const enValue = resolveSemanticMessage({
        key,
        language: 'en',
        translations: asTranslations({}),
      });
      return !allowedIdentical.has(key) && deValue === enValue;
    });

    expect(leaks).toEqual([]);
  });


  it('keeps poll mutation compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'polls.mutations.publish_success',
      language: 'it',
      translations: asTranslations({
        hooks_useGuildPolls_publish_success: 'Umfrage veröffentlicht (legacy)',
      }),
    });

    expect(value).toBe('Umfrage veröffentlicht (legacy)');
  });

  it('keeps poll editor compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'polls.editor.publish',
      language: 'it',
      translations: asTranslations({
        components_polls_PollEditor_911: 'Veroffentlichen (legacy)',
      }),
    });

    expect(value).toBe('Veroffentlichen (legacy)');
  });



  it('keeps poll results compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'polls.results.anonymous_badge',
      language: 'it',
      translations: asTranslations({
        components_polls_PollResults_224: 'Anonyme Antworten (legacy)',
      }),
    });

    expect(value).toBe('Anonyme Antworten (legacy)');
  });

  it('keeps markdown editor compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'markdown.tab.write',
      language: 'it',
      translations: asTranslations({}),
    });

    expect(value).toBe('Write');
  });

  it('keeps admin deletion requests compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'admin.deletion.title',
      language: 'it',
      translations: asTranslations({
        components_admin_DeletionRequestsManager_126: 'Kontoloschanfragen (legacy)',
      }),
    });

    expect(value).toBe('Kontoloschanfragen (legacy)');
  });

  it('keeps admin user manager compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'admin.user_manager.table.username',
      language: 'it',
      translations: asTranslations({
        components_admin_UserManager_375: 'Benutzername (legacy)',
      }),
    });

    expect(value).toBe('Benutzername (legacy)');
  });

  it('keeps poll access editors compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'polls.results_access.title',
      language: 'it',
      translations: asTranslations({
        components_polls_PollResultsAccessEditor_276: 'Ergebniszugriff (legacy)',
      }),
    });

    expect(value).toBe('Ergebniszugriff (legacy)');
  });


  it('keeps public profile/overview compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'overview.admin_read_only',
      language: 'it',
      translations: asTranslations({
        pages_Overview_243: 'Admin Nur-Lese-Modus (legacy)',
      }),
    });

    expect(value).toBe('Admin Nur-Lese-Modus (legacy)');
  });

  it('returns Korean semantic copy for final wishes/dashboard keys', () => {
    const value = resolveSemanticMessage({
      key: 'wishes.session_expired',
      language: 'ko',
      translations: asTranslations({
        pages_Wishes_session_expired: 'Sitzung abgelaufen (legacy)',
      }),
    });

    expect(value).toBe('세션이 만료되었습니다');
  });

  it('exposes semantic keys for migration checks', () => {
    expect(listSemanticKeys()).toContain('admin.legal.saved');
    expect(listSemanticKeys()).toContain('admin.documentation.search_placeholder');
    expect(listSemanticKeys()).toContain('polls.sortable.type.scale');
    expect(listSemanticKeys()).toContain('polls.mutations.publish_success');
    expect(listSemanticKeys()).toContain('polls.editor.publish');
    expect(listSemanticKeys()).toContain('polls.condition.operator.equals');
    expect(listSemanticKeys()).toContain('polls.results.anonymous_badge');
    expect(listSemanticKeys()).toContain('markdown.tab.write');
    expect(listSemanticKeys()).toContain('guild.members.title');
    expect(listSemanticKeys()).toContain('admin.backup.title');
    expect(listSemanticKeys()).toContain('admin.deletion.title');
    expect(listSemanticKeys()).toContain('admin.user_manager.table.username');
    expect(listSemanticKeys()).toContain('polls.results_access.title');
    expect(listSemanticKeys()).toContain('polls.respondent.title');
    expect(listSemanticKeys()).toContain('admin.sidebar.section.dashboard');
    expect(listSemanticKeys()).toContain('settings.sidebar.section.profile');
    expect(listSemanticKeys()).toContain('ui.breadcrumb.aria_label');
    expect(listSemanticKeys()).toContain('globalnav.home.aria_label');
    expect(listSemanticKeys()).toContain('footer.brand');
    expect(listSemanticKeys()).toContain('public_profile.user_not_found');
    expect(listSemanticKeys()).toContain('overview.more_wishes');
    expect(listSemanticKeys()).toContain('dashboard.roster_filters.clear_all');
    expect(listSemanticKeys()).toContain('wishes.session_expired');
    expect(listSemanticKeys()).toContain('guild.polls.title');
    expect(listSemanticKeys()).toContain('activity.log.title');
    expect(listSemanticKeys()).toContain('activity.log.action.wish_season_drafted');
  });
});
