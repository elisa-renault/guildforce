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

  it('keeps final auto compatibility keys for wishes/dashboard', () => {
    const value = resolveSemanticMessage({
      key: 'wishes.session_expired',
      language: 'it',
      translations: asTranslations({
        pages_Wishes_session_expired: 'Sitzung abgelaufen (legacy)',
      }),
    });

    expect(value).toBe('Sitzung abgelaufen (legacy)');
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
  });
});
