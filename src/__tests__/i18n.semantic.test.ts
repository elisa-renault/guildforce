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

  it('uses legacy auto compatibility when locale semantic copy is missing', () => {
    const value = resolveSemanticMessage({
      key: 'admin.documentation.title',
      language: 'de',
      translations: asTranslations({
        components_admin_AdminDocumentation_405: 'Dokumentation (legacy)',
      }),
    });

    expect(value).toBe('Dokumentation (legacy)');
  });

  it('falls back to EN semantic copy when no compatibility key is available', () => {
    const value = resolveSemanticMessage({
      key: 'admin.patch.required_en_title',
      language: 'de',
      translations: asTranslations({}),
    });

    expect(value).toBe('An English title is required.');
  });

  it('resolves forum report copy with semantic FR text', () => {
    const value = resolveSemanticMessage({
      key: 'forum.report.dialog.title',
      language: 'fr',
      translations: asTranslations({}),
    });

    expect(value).toBe('Signaler ce contenu');
  });

  it('keeps poll mutation compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'polls.mutations.publish_success',
      language: 'de',
      translations: asTranslations({
        hooks_useGuildPolls_publish_success: 'Umfrage veroffentlicht (legacy)',
      }),
    });

    expect(value).toBe('Umfrage veroffentlicht (legacy)');
  });

  it('keeps poll editor compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'polls.editor.publish',
      language: 'de',
      translations: asTranslations({
        components_polls_PollEditor_911: 'Veroffentlichen (legacy)',
      }),
    });

    expect(value).toBe('Veroffentlichen (legacy)');
  });

  it('returns forum reports FR semantic copy', () => {
    const value = resolveSemanticMessage({
      key: 'forum.reports.title',
      language: 'fr',
      translations: asTranslations({}),
    });

    expect(value).toBe('Signalements');
  });

  it('keeps forum sanctions compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'forum.sanctions.dialog.title',
      language: 'de',
      translations: asTranslations({
        components_forum_SanctionDialog_98: 'Sanktion anwenden (legacy)',
      }),
    });

    expect(value).toBe('Sanktion anwenden (legacy)');
  });

  it('keeps poll results compatibility with legacy auto keys', () => {
    const value = resolveSemanticMessage({
      key: 'polls.results.anonymous_badge',
      language: 'de',
      translations: asTranslations({
        components_polls_PollResults_224: 'Anonyme Antworten (legacy)',
      }),
    });

    expect(value).toBe('Anonyme Antworten (legacy)');
  });

  it('exposes semantic keys for migration checks', () => {
    expect(listSemanticKeys()).toContain('admin.legal.saved');
    expect(listSemanticKeys()).toContain('admin.documentation.search_placeholder');
    expect(listSemanticKeys()).toContain('forum.report.dialog.title');
    expect(listSemanticKeys()).toContain('forum.sanctions.dialog.title');
    expect(listSemanticKeys()).toContain('polls.sortable.type.scale');
    expect(listSemanticKeys()).toContain('polls.mutations.publish_success');
    expect(listSemanticKeys()).toContain('polls.editor.publish');
    expect(listSemanticKeys()).toContain('polls.condition.operator.equals');
    expect(listSemanticKeys()).toContain('polls.results.anonymous_badge');
    expect(listSemanticKeys()).toContain('forum.reports.title');
    expect(listSemanticKeys()).toContain('guild.members.title');
    expect(listSemanticKeys()).toContain('admin.backup.title');
    expect(listSemanticKeys()).toContain('admin.sidebar.section.dashboard');
    expect(listSemanticKeys()).toContain('settings.sidebar.section.profile');
    expect(listSemanticKeys()).toContain('ui.breadcrumb.aria_label');
    expect(listSemanticKeys()).toContain('globalnav.home.aria_label');
    expect(listSemanticKeys()).toContain('footer.brand');
    expect(listSemanticKeys()).toContain('forum.new_topic.title');
    expect(listSemanticKeys()).toContain('forum.topic.toast.reply_created');
    expect(listSemanticKeys()).toContain('guild.polls.title');
    expect(listSemanticKeys()).toContain('activity.log.title');
  });
});
