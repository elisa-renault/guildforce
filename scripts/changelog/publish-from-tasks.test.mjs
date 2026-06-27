import { describe, expect, it } from 'vitest';

import {
  buildFeaturePackMarkdown,
  createWeeklyPatchNotes,
  createFeaturePack,
  filterRuns,
  getIsoWeekKey,
  groupRunsByIsoWeek,
  incrementVersion,
  parseClosedRun,
  parsePublishedRunPaths,
  parsePublishedFeaturePackTitles,
  parsePublishedDateKeys,
  parsePublishedWeekKeys,
  parseArgs,
} from './publish-from-tasks.mjs';

const runContent = (overrides = {}) => `# Task Run - ${overrides.title || 'Fix poll results'}

- Status: ${overrides.status || 'Closed'}
- Closed: ${overrides.closed || '2026-06-20'}
- Created: 2026-06-20
- Updated: 2026-06-20
- Owner: codex

## Review
- Summary: ${overrides.summary || 'Fixed poll result visibility for members.'}
- Risks: ${overrides.risks || 'None.'}
- Follow-ups: ${overrides.followUps || ''}
`;

describe('weekly changelog publishing helpers', () => {
  it('parses closed run files and extracts review summary', () => {
    expect(parseClosedRun(runContent(), 'archive/2026/06/fix-polls.md')).toEqual({
      path: 'archive/2026/06/fix-polls.md',
      title: 'Fix poll results',
      closedDate: '2026-06-20',
      summary: 'Fixed poll result visibility for members.',
      risks: 'None.',
      followUps: '',
    });
  });

  it('ignores active runs', () => {
    expect(parseClosedRun(runContent({ status: 'Active' }), 'runs/active.md')).toBeNull();
  });

  it('groups runs by ISO week and dates the group with the last run', () => {
    const groups = groupRunsByIsoWeek([
      { path: 'a.md', title: 'A', closedDate: '2026-06-15', summary: '', followUps: '' },
      { path: 'b.md', title: 'B', closedDate: '2026-06-21', summary: '', followUps: '' },
      { path: 'c.md', title: 'C', closedDate: '2026-06-22', summary: '', followUps: '' },
    ]);

    expect(getIsoWeekKey('2026-06-15')).toBe('2026-W25');
    expect(groups).toHaveLength(2);
    expect(groups[0].weekKey).toBe('2026-W25');
    expect(groups[0].publishedAtDate).toBe('2026-06-21');
    expect(groups[0].runs.map((run) => run.path)).toEqual(['a.md', 'b.md']);
  });

  it('filters by date range and already published run markers', () => {
    const runs = [
      { path: 'old.md', closedDate: '2026-02-06' },
      { path: 'published.md', closedDate: '2026-02-07' },
      { path: 'new.md', closedDate: '2026-02-08' },
      { path: 'late.md', closedDate: '2026-02-20' },
      {
        path: 'draft-release-note.md',
        title: 'Draft release note',
        summary: 'Drafted the next English-only changelog entry.',
        closedDate: '2026-02-08',
      },
    ];

    expect(filterRuns(runs, {
      since: '2026-02-06',
      to: '2026-02-10',
      publishedRunPaths: new Set(['published.md']),
    }).map((run) => run.path)).toEqual(['new.md']);
  });

  it('extracts already published run paths from changelog markers', () => {
    const paths = parsePublishedRunPaths([
      {
        patch_note_translations: [
          {
            content: '<!-- guildforce-changelog-runs:archive/2026/06/a.md, archive/2026/06/b.md -->',
          },
        ],
      },
    ]);

    expect([...paths]).toEqual(['archive/2026/06/a.md', 'archive/2026/06/b.md']);
  });

  it('extracts already published week keys from generated titles', () => {
    const weekKeys = parsePublishedWeekKeys([
      {
        version: '0.1.12',
        patch_note_translations: [
          { title: 'Weekly update 2026-W25', content: '' },
          { title: 'Mise à jour hebdomadaire 2026-W24', content: '' },
        ],
      },
    ]);

    expect([...weekKeys]).toEqual(['2026-W25', '2026-W24']);
  });

  it('increments versions and builds one English feature-pack note per week', () => {
    const notes = createWeeklyPatchNotes([
      {
        weekKey: '2026-W06',
        publishedAtDate: '2026-02-08',
        runs: [
          {
            path: 'archive/2026/02/fix.md',
            title: 'Fix auth',
            closedDate: '2026-02-08',
            summary: 'Fixed Battle.net login.',
            followUps: '',
          },
        ],
      },
      {
        weekKey: '2026-W07',
        publishedAtDate: '2026-02-15',
        runs: [
          {
            path: 'archive/2026/02/feature.md',
            title: 'Add roster view',
            closedDate: '2026-02-15',
            summary: '',
            followUps: '',
          },
        ],
      },
    ], { baseVersion: '0.4.9' });

    expect(incrementVersion('0.4.9')).toBe('0.4.10');
    expect(notes.map((note) => note.version)).toEqual(['0.4.10', '0.4.11']);
    expect(notes[0].status).toBe('published');
    expect(notes[0].published_at).toBe('2026-02-08T12:00:00.000Z');
    expect(notes[0].translations.map((translation) => translation.language)).toEqual(['en']);
    expect(notes[0].translations[0].title).toBe('Battle.net Login and Guild Sync Improvements');
    expect(notes[0].translations[0].content).toContain('Authentication and Sync');
    expect(notes[0].translations[0].content).not.toContain('guildforce-changelog-runs');
  });

  it('keeps generated content concise for large weeks', () => {
    const runs = Array.from({ length: 40 }, (_, index) => ({
      path: `archive/2026/06/run-${index}.md`,
      title: index % 2 === 0 ? `Fix poll issue ${index}` : `Commit maintenance ${index}`,
      closedDate: '2026-06-20',
      summary: index % 2 === 0 ? `Fixed poll issue ${index}.` : `Commit maintenance ${index}.`,
      followUps: '',
    }));
    const content = createWeeklyPatchNotes([
      { weekKey: '2026-W25', publishedAtDate: '2026-06-20', runs },
    ], { baseVersion: '0.0.0' })[0].translations[0].content;
    const bulletCount = content.split('\n').filter((line) => line.startsWith('- ')).length;

    expect(bulletCount).toBeLessThanOrEqual(10);
    expect(content).not.toContain('Commit maintenance');
  });

  it('builds feature packs from the strongest theme', () => {
    const pack = createFeaturePack([
      {
        path: 'archive/2026/03/poll.md',
        title: 'Poll results visibility overhaul',
        closedDate: '2026-03-14',
        summary: 'Poll results are easier to scan with improved filters and reader controls.',
        followUps: '',
      },
      {
        path: 'archive/2026/03/poll-fix.md',
        title: 'Fix poll response recovery',
        closedDate: '2026-03-14',
        summary: 'Several response recovery and protection fixes prevent accidental data loss.',
        followUps: '',
      },
    ]);

    expect(pack.title).toBe('Poll Results and Access Overhaul');
    expect(pack.sections[0].heading).toBe('Polls');
  });

  it('prioritizes wish analytics and spell coverage over weak localization or privacy matches', () => {
    const pack = createFeaturePack([
      {
        path: 'archive/2026/06/composition-catalog.md',
        title: 'Add seeded composition catalog analytics',
        closedDate: '2026-06-23',
        summary: 'Added the seeded composition catalog schema, helper, tests, RosterAnalytics utility/defensive coverage card, spell sync integration, generated types, docs, and locale labels.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/buff-debuff.md',
        title: 'Enable roster buff debuff analytics',
        closedDate: '2026-06-23',
        summary: 'Added raid effect metadata migration, extracted/tested buff/debuff aggregation, activated active DB-backed roster analytics card, and updated admin docs/types.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/aoe-cc.md',
        title: 'Add callable AOE CC coverage',
        closedDate: '2026-06-23',
        summary: 'Split knockback/knockup normalization, added AoE stun/root/slow labels and translations, and verified the remote composition rows.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/tooltips.md',
        title: 'Polish roster buff debuff analytics UI',
        closedDate: '2026-06-23',
        summary: 'The buff/debuff analytics card now shows compact rows with status icon, count badge, localized spell name, and covered/total ratios per group.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/smoke.md',
        title: 'Smoke roster buff debuff analytics refreshed auth',
        closedDate: '2026-06-23',
        summary: 'Authenticated roster analytics smoke found localized spell names visible, no Spell {id} fallback, 0 console errors, and 0 failed responses.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/filters.md',
        title: 'Remove roster analytics comp outcome filters',
        closedDate: '2026-06-23',
        summary: 'Removed redundant outcome filters from the analytics toolbar and kept selected filter options toggleable.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/source-counts.md',
        title: 'Show utility coverage source counts only',
        closedDate: '2026-06-23',
        summary: 'Required major buff/debuff rows retain missing, covered, and secured states while optional utility rows show localized source counts.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/archived-wish-seasons.md',
        title: 'Allow editing archived wish seasons',
        closedDate: '2026-06-22',
        summary: 'Wish managers can update archived roster wish seasons, linked wishes, external wishes, row removals, roster decisions, and reactivate the season when needed.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/wish-activity-history.md',
        title: 'Add season id to wish activity logs',
        closedDate: '2026-06-22',
        summary: 'Wish and roster decision logging now carries season_id, actor, target, and exact member wish history context.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/deduplicate.md',
        title: 'Refine utility coverage labels and duplicates',
        closedDate: '2026-06-23',
        summary: 'Utility/defensive coverage now hides entries represented by major buffs/debuffs and prevents duplicate coverage reporting.',
        followUps: '',
      },
      {
        path: 'archive/2026/06/draft-release-note.md',
        title: 'Draft release note',
        closedDate: '2026-06-27',
        summary: 'Drafted the next English-only changelog entry. The generated draft initially over-weighted localization.',
        followUps: '',
      },
    ]);
    const markdown = buildFeaturePackMarkdown(pack);

    expect(pack.title).toBe('Wish Analytics and Spell Coverage Pack');
    expect(pack.sections.map((section) => section.heading)).toEqual([
      'Wish Analytics',
      'Spell Coverage',
      'Roster Wish Workflow',
      'Review Workflow',
      'Verification',
    ]);
    expect(markdown).toContain('spell-backed coverage checks');
    expect(markdown).toContain('correct archived wish seasons');
    expect(markdown).toContain('localized spell names render in the Analytics tab');
    expect(markdown).not.toContain('Korean and Traditional Chinese');
    expect(markdown).not.toContain('Analytics are consent-gated');
  });

  it('extracts published feature-pack titles', () => {
    const titles = parsePublishedFeaturePackTitles([
      {
        patch_note_translations: [
          { language: 'en', title: 'Guild Atlas and Workspace Pack', content: '' },
          { language: 'fr', title: 'Ancien titre', content: '' },
        ],
      },
    ]);

    expect([...titles]).toEqual(['Guild Atlas and Workspace Pack']);
  });

  it('extracts published date keys for duplicate prevention without public markers', () => {
    const dates = parsePublishedDateKeys([
      { published_at: '2026-06-21T12:00:00.000Z', patch_note_translations: [] },
      { published_at: null, patch_note_translations: [] },
    ]);

    expect([...dates]).toEqual(['2026-06-21']);
  });

  it('honors an explicit first version', () => {
    const notes = createWeeklyPatchNotes([
      { weekKey: '2026-W06', publishedAtDate: '2026-02-08', runs: [] },
      { weekKey: '2026-W07', publishedAtDate: '2026-02-15', runs: [] },
    ], { baseVersion: '9.9.9', firstVersion: '1.2.3' });

    expect(notes.map((note) => note.version)).toEqual(['1.2.3', '1.2.4']);
  });

  it('supports printing generated draft content during changelog review', () => {
    expect(parseArgs(['--dry-run', '--print-content'])).toMatchObject({
      dryRun: true,
      printContent: true,
    });
  });
});
