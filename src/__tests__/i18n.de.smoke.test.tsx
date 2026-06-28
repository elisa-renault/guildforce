import { describe, expect, it } from 'vitest';

import type { Translations } from '@/i18n/translations';

import { listSemanticKeys, resolveSemanticMessage } from '@/i18n/semantic';
import { loadTranslations } from '@/i18n/translations';


describe('DE i18n smoke', () => {
  it('renders critical dictionary paths in German', async () => {
    const de = await loadTranslations('de');

    expect(de.common.save).toBe('Speichern');
    expect(de.common.cancel).toBe('Abbrechen');
    expect(de.routeMeta.home).toBe('Startseite');
    expect(de.routeMeta.guildPolls).toBe('Umfragen');
    expect(de.auth.loginWithBattleNet).toBe('Mit Battle.net anmelden');
    expect(de.guild.guildMaster).toBe('Gildenmeister');
    expect(de.polls.new).toBe('Neue Umfrage');
    expect(de.admin.userManagement).toBe('Benutzerverwaltung');
    expect(de.legal.privacyPolicy).toBe('Datenschutzerklärung');
    expect(de.cookies.manageCookies).toBe('Cookie-Einstellungen');
  });

  it('resolves DE semantic copy without EN fallback on core namespaces', () => {
    const releasePrefixes = ['admin.', 'markdown.', 'polls.', 'guild.', 'settings.', 'ui.', 'globalnav.', 'activity.'];
    const keys = listSemanticKeys().filter((key) => releasePrefixes.some((prefix) => key.startsWith(prefix)));
    const translations = { auto: {} } as unknown as Translations;
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
      'guild.members.table_realm',
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

    for (const key of keys) {
      const deValue = resolveSemanticMessage({ key, language: 'de', translations });
      const enValue = resolveSemanticMessage({ key, language: 'en', translations });
      if (allowedIdentical.has(key)) continue;
      expect(deValue).not.toBe(enValue);
    }
  });

});
