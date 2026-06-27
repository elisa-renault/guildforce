import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const REPO_ROOT = process.cwd();
const ARCHIVE_DIR = path.join(REPO_ROOT, 'tasks', 'archive');
const MARKER_PREFIX = 'guildforce-changelog-runs';
const MAX_BULLETS_PER_SECTION = 4;
const MAX_TOTAL_BULLETS = 10;
const MIN_SECONDARY_FEATURE_PACK_SCORE = 3;
const SECONDARY_FEATURE_PACK_SCORE_RATIO = 0.35;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VERSION_RE = /^\d+\.\d+\.\d+$/;

export function parseArgs(argv) {
  const options = {
    dryRun: false,
    since: null,
    to: null,
    version: null,
    repairGenerated: false,
    repairFeaturePacks: false,
    deleteNonEnglishTranslations: false,
    printContent: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--repair-generated') {
      options.repairGenerated = true;
      continue;
    }

    if (arg === '--repair-feature-packs') {
      options.repairFeaturePacks = true;
      continue;
    }

    if (arg === '--delete-non-english-translations') {
      options.deleteNonEnglishTranslations = true;
      continue;
    }

    if (arg === '--print-content') {
      options.printContent = true;
      continue;
    }

    if (arg === '--since' || arg === '--to' || arg === '--version') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${arg}`);
      }
      options[arg.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.since && !ISO_DATE_RE.test(options.since)) {
    throw new Error('--since must use YYYY-MM-DD');
  }

  if (options.to && !ISO_DATE_RE.test(options.to)) {
    throw new Error('--to must use YYYY-MM-DD');
  }

  if (options.version && !VERSION_RE.test(options.version)) {
    throw new Error('--version must use X.Y.Z');
  }

  return options;
}

export function parseClosedRun(content, relativePath) {
  const title = parseLineValue(content, '# Task Run - ');
  const status = parseLineValue(content, '- Status: ');
  const closedDate = parseLineValue(content, '- Closed: ');

  if (status !== 'Closed' || !closedDate || !ISO_DATE_RE.test(closedDate)) {
    return null;
  }

  return {
    path: normalizePath(relativePath),
    title: title || path.basename(relativePath, '.md'),
    closedDate,
    summary: parseReviewField(content, 'Summary') || '',
    risks: parseReviewField(content, 'Risks') || '',
    followUps: parseReviewField(content, 'Follow-ups') || '',
  };
}

export function parsePublishedRunPaths(notes) {
  const paths = new Set();

  for (const note of notes) {
    const translations = note.patch_note_translations || [];
    for (const translation of translations) {
      parseRunPathsFromContent(translation.content || '')
        .forEach((entry) => paths.add(entry));
    }
  }

  return paths;
}

export function parseRunPathsFromContent(content) {
  const paths = new Set();
  const markerRegex = new RegExp(`<!--\\s*${MARKER_PREFIX}:([^>]*)-->`, 'g');
  let match = markerRegex.exec(content);

  while (match) {
    decodeMarkerPayload(match[1])
      .forEach((entry) => paths.add(entry));
    match = markerRegex.exec(content);
  }

  return paths;
}

export function stripChangelogAutomationMarkers(content) {
  return content
    .replace(new RegExp(`<!--\\s*${MARKER_PREFIX}:[\\s\\S]*?-->`, 'g'), '')
    .trim();
}

export function getIsoWeekKey(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function groupRunsByIsoWeek(runs) {
  const groups = new Map();

  for (const run of runs) {
    const key = getIsoWeekKey(run.closedDate);
    const group = groups.get(key) || {
      weekKey: key,
      runs: [],
      publishedAtDate: run.closedDate,
    };
    group.runs.push(run);
    if (run.closedDate > group.publishedAtDate) {
      group.publishedAtDate = run.closedDate;
    }
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      runs: group.runs.sort((a, b) => a.closedDate.localeCompare(b.closedDate) || a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.publishedAtDate.localeCompare(b.publishedAtDate));
}

export function filterRuns(runs, { since = null, to = null, publishedRunPaths = new Set() } = {}) {
  return runs
    .filter((run) => !since || run.closedDate > since)
    .filter((run) => !to || run.closedDate <= to)
    .filter((run) => !publishedRunPaths.has(run.path))
    .filter(isChangelogSourceRun)
    .sort((a, b) => a.closedDate.localeCompare(b.closedDate) || a.title.localeCompare(b.title));
}

export function incrementVersion(version, offset = 1) {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + offset}`;
}

export function createWeeklyPatchNotes(groups, { baseVersion = '0.0.0', firstVersion = null } = {}) {
  return groups.map((group, index) => {
    const version = index === 0 && firstVersion
      ? firstVersion
      : incrementVersion(firstVersion ? firstVersion : baseVersion, firstVersion ? index : index + 1);
    const publishedAt = `${group.publishedAtDate}T12:00:00.000Z`;
    const pack = createFeaturePack(group.runs);
    const titleEn = pack.title;

    return {
      version,
      status: 'published',
      published_at: publishedAt,
      translations: [
        {
          language: 'en',
          title: titleEn,
          content: buildFeaturePackMarkdown(pack),
        },
      ],
      runPaths: group.runs.map((run) => run.path),
      weekKey: group.weekKey,
      pack,
    };
  });
}

export function buildWeeklyMarkdown(group, language = 'en') {
  const labels = language === 'fr'
    ? {
        intro: `Cette mise à jour regroupe les améliorations livrées pendant la semaine ${group.weekKey}.`,
        sections: {
          features: 'Nouveautés',
          fixes: 'Corrections',
          uiI18n: 'Interface et langues',
          docsChore: 'Maintenance',
        },
        extra: 'Autres améliorations',
      }
    : {
        intro: `This update groups ${group.runs.length} change${group.runs.length > 1 ? 's' : ''} shipped during week ${group.weekKey}.`,
        sections: {
          features: 'Features',
          fixes: 'Fixes',
          uiI18n: 'UI and localization',
          docsChore: 'Maintenance',
        },
        extra: 'Other improvements',
      };

  const categorized = categorizeRuns(group.runs);
  const lines = [labels.intro, ''];
  let totalBullets = 0;
  const addedBullets = new Set();

  for (const [category, runs] of Object.entries(categorized)) {
    const publicRuns = selectPublicRuns(runs, MAX_BULLETS_PER_SECTION);
    if (publicRuns.length === 0 || totalBullets >= MAX_TOTAL_BULLETS) {
      continue;
    }

    const available = Math.min(publicRuns.length, MAX_TOTAL_BULLETS - totalBullets);
    const sectionBullets = [];
    for (const run of publicRuns) {
      if (totalBullets + sectionBullets.length >= MAX_TOTAL_BULLETS || sectionBullets.length >= available) {
        break;
      }
      const text = formatRunBullet(run, language);
      const dedupeKey = text.toLowerCase();
      if (addedBullets.has(dedupeKey)) {
        continue;
      }
      sectionBullets.push(sanitizeMarkdownListText(text));
      addedBullets.add(dedupeKey);
    }

    if (sectionBullets.length === 0) {
      continue;
    }

    lines.push(`## ${labels.sections[category]}`);
    for (const text of sectionBullets) {
      lines.push(`- ${text}`);
    }
    totalBullets += sectionBullets.length;
    lines.push('');
  }

  if (totalBullets === 0) {
    lines.push(`## ${labels.extra}`);
    lines.push(language === 'fr'
      ? '- Améliorations internes et stabilisation continue de Guildforce.'
      : '- Internal improvements and continued Guildforce stabilization.');
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function createFeaturePack(runs) {
  const editorialRuns = runs.filter(isEditorialSignalRun);
  const sourceRuns = editorialRuns.length > 0 ? editorialRuns : runs;
  const scores = FEATURE_PACK_DEFINITIONS
    .map((definition) => ({
      ...definition,
      score: sourceRuns.reduce((total, run) => total + scoreFeaturePackRun(run, definition), 0),
    }))
    .sort((a, b) => b.score - a.score);
  const primary = scores[0]?.score > 0 ? scores[0] : FEATURE_PACK_DEFINITIONS.at(-1);
  const secondary = scores
    .filter((definition) => definition.key !== primary.key && isMeaningfulSecondaryFeaturePack(definition, primary))
    .slice(0, 3);
  const sections = [
    ...buildFeaturePackSections(sourceRuns, primary),
    ...secondary.flatMap((definition) => buildFeaturePackSections(sourceRuns, definition)),
  ];

  if (sections.length === 0) {
    sections.push({
      heading: 'Updates',
      bullets: ['General improvements and maintenance across Guildforce.'],
    });
  }

  return {
    key: primary.key,
    title: primary.title,
    intro: primary.intro,
    sections,
  };
}

function buildFeaturePackSections(runs, definition) {
  const sectionDefinitions = definition.sections || [
    {
      heading: definition.heading,
      bullets: definition.bullets,
    },
  ];

  return sectionDefinitions
    .map((section) => ({
      heading: section.heading,
      bullets: selectPackBullets(runs, section),
    }))
    .filter((section) => section.bullets.length > 0);
}

function isMeaningfulSecondaryFeaturePack(definition, primary) {
  if (primary.suppressSecondary) {
    return false;
  }

  return definition.score >= MIN_SECONDARY_FEATURE_PACK_SCORE
    && definition.score >= primary.score * SECONDARY_FEATURE_PACK_SCORE_RATIO;
}

export function buildFeaturePackMarkdown(pack) {
  const lines = [pack.intro, ''];

  for (const section of pack.sections) {
    lines.push(`## ${section.heading}`);
    for (const bullet of section.bullets) {
      lines.push(`- ${bullet}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function categorizeRuns(runs) {
  const result = {
    features: [],
    fixes: [],
    uiI18n: [],
    docsChore: [],
  };

  for (const run of runs) {
    const haystack = `${run.title} ${run.summary}`.toLowerCase();
    if (/\b(fix|corrig|prevent|stabiliz|bug|error|fallback)\b/.test(haystack)) {
      result.fixes.push(run);
    } else if (/\b(i18n|locale|localiz|translat|language|typograph|ui|layout|spacing|calendar|date|placeholder)\b/.test(haystack)) {
      result.uiI18n.push(run);
    } else if (/\b(doc|ci|verify|audit|guard|task|deploy|commit|organize|maintenance)\b/.test(haystack)) {
      result.docsChore.push(run);
    } else {
      result.features.push(run);
    }
  }

  return result;
}

export function parsePublishedWeekKeys(notes) {
  const weekKeys = new Set();
  const weekRegex = /\b\d{4}-W\d{2}\b/g;

  for (const note of notes) {
    const values = [
      note.version,
      ...(note.patch_note_translations || []).flatMap((translation) => [
        translation.title || '',
        translation.content || '',
      ]),
    ];

    for (const value of values) {
      const matches = value.match(weekRegex) || [];
      matches.forEach((match) => weekKeys.add(match));
    }
  }

  return weekKeys;
}

export function parsePublishedDateKeys(notes) {
  return new Set(
    notes
      .map((note) => note.published_at?.slice(0, 10))
      .filter((value) => value && ISO_DATE_RE.test(value)),
  );
}

export function parsePublishedFeaturePackTitles(notes) {
  const titles = new Set();

  for (const note of notes) {
    for (const translation of note.patch_note_translations || []) {
      if (translation.language === 'en' && translation.title) {
        titles.add(translation.title);
      }
    }
  }

  return titles;
}

export function selectPublicRuns(runs, limit) {
  return runs
    .filter(isPublicWorthyRun)
    .sort((a, b) => scoreRun(b) - scoreRun(a) || a.closedDate.localeCompare(b.closedDate))
    .slice(0, limit);
}

function isPublicWorthyRun(run) {
  const haystack = `${run.title} ${run.summary}`.toLowerCase();
  return !/\b(commit|push|deploy|audit|task|workflow|codex|repo|github|lint|ci|verify|verification|archive|backup|python|nettoyage|cleanup|organize|organise|migration history)\b/.test(haystack);
}

function isChangelogSourceRun(run) {
  const title = (run.title || '').toLowerCase();
  const haystack = `${run.title || ''} ${run.summary || ''}`.toLowerCase();
  const isPatchNoteProcess = /\b(changelog|patch note|patchnote|release note)\b/.test(haystack)
    && /\b(draft|revise|publish|publishing|repair|generated|generate|automate|curate|convert|force|delete|drafting workflow)\b/.test(haystack);

  if (isPatchNoteProcess) {
    return false;
  }

  return !/\b(draft|revise)\b/.test(title) || !/\brelease note\b/.test(title);
}

function isEditorialSignalRun(run) {
  const haystack = `${run.title || ''} ${run.summary || ''}`.toLowerCase();
  return !/\b(changelog|patch note|patchnote|release note|draft release|commit|push|deploy|codex|repo|github|archive|backup|python|organize|organise|task index)\b/.test(haystack);
}

function scoreRun(run) {
  const haystack = `${run.title} ${run.summary}`.toLowerCase();
  let score = 0;
  if (/\b(add|added|implement|create|new|nouveau|ajout|feature)\b/.test(haystack)) score += 6;
  if (/\b(fix|fixed|corrig|restore|prevent|stabiliz|hardening)\b/.test(haystack)) score += 5;
  if (/\b(auth|battle\.net|poll|sondage|roster|wishes|voeux|guild|guilde|atlas|members|membres)\b/.test(haystack)) score += 4;
  if (/\b(i18n|locale|translation|langue|localiz|zh-tw|korean|italian|spanish|pt-br)\b/.test(haystack)) score += 3;
  if ((run.summary || '').length > 0) score += 2;
  return score;
}

const FEATURE_PACK_DEFINITIONS = [
  {
    key: 'polls',
    title: 'Poll Results and Access Overhaul',
    heading: 'Polls',
    intro: 'A focused update for poll creation, result review, visibility controls, and answer recovery.',
    keywords: ['poll', 'sondage', 'response', 'result', 'visibility', 'answer', 'question'],
    bullets: [
      ['visibility', 'access', 'permission'],
      'Poll result visibility controls are clearer and safer for guild managers.',
      ['results', 'viewer', 'highlight', 'cohort', 'filter'],
      'Poll results are easier to scan with improved filters, navigation, and reader controls.',
      ['response', 'answer', 'restore', 'cleared'],
      'Several response recovery and protection fixes prevent accidental data loss.',
      ['ai', 'summary', 'keyword'],
      'AI summaries and generated labels are cleaner and less noisy.',
    ],
  },
  {
    key: 'wishAnalytics',
    title: 'Wish Analytics and Spell Coverage Pack',
    intro: 'A focused update for roster wish analytics, spell coverage checks, and composition review.',
    suppressSecondary: true,
    keywords: [
      'rosteranalytics',
      'roster analytics',
      'wishlist analytics',
      'wish analytics',
      'coverage',
      'spell',
      'spells',
      'composition',
      'buff',
      'debuff',
      'raid_effects',
      'wow_spells',
      'utility',
      'defensive',
      'external',
      'interrupt',
      'crowd control',
      'aoe',
      'knockback',
      'knockup',
      'soothe',
      'purge',
      'mortal strike',
      'sync-wow-spells',
    ],
    sections: [
      {
        heading: 'Wish Analytics',
        bullets: [
          ['rosteranalytics', 'roster analytics', 'wishlist analytics', 'wish analytics', 'coverage'],
          'The roster Analytics tab now exposes spell-backed coverage checks for major buffs, major debuffs, defensive tools, externals, crowd control, interrupts, mobility, purge and soothe effects, anti-healing, shield damage, cheat death, and other raid utilities.',
          ['wish range', 'wish ranges', 'first-approved', 'first approved', 'selected wish'],
          'Coverage is computed from the roster wish data managers already review, including selected wish ranges and the first-approved-per-player view.',
          ['composition kpi', 'role breakdown', 'melee', 'ranged', 'tank', 'heal', 'dps'],
          'Composition KPIs and role breakdowns are easier to scan, with clearer tank, healer, DPS, melee, and ranged counts.',
        ],
      },
      {
        heading: 'Spell Coverage',
        bullets: [
          ['composition catalog', 'seeded composition catalog', 'spell mappings', 'composition_abilities'],
          'A normalized composition catalog now powers utility and defensive coverage rows from seeded spell mappings.',
          ['major buff', 'major buffs', 'major debuff', 'major debuffs', 'raid_effects', 'wow_spells', 'buff/debuff'],
          'Major buffs and debuffs are backed by active database rows and localized spell metadata instead of static labels.',
          ['tooltip', 'tooltips', 'provider', 'class pill', 'class chips', 'localized spell'],
          'Spell tooltips now show grouped provider lists, class chips, localized spell names, and compact rows without the old wrapping issues.',
          ['aoe', 'crowd control', 'knockback', 'knockup', 'aoe stun', 'aoe root', 'aoe slow'],
          'Callable AoE crowd control coverage now separates knockbacks, knockups, AoE stuns, AoE roots, and AoE slows.',
        ],
      },
      {
        heading: 'Roster Wish Workflow',
        bullets: [
          ['archived wish season', 'archived roster wish season', 'reactivate', 'unarchive'],
          'Wish managers can correct archived wish seasons without reopening member self-service, including linked wishes, external wishes, row removals, roster decisions, and reactivation.',
          ['season_id', 'member wish history', 'activity log', 'actor', 'target', 'roster decision logging'],
          'Wish and roster decision history now carries exact season context with clearer actor and target wording for member audit trails.',
          ['assignment ui', 'retire roster wish assignment', 'assignment dependencies', 'assignments were retired'],
          'The retired assignment flow was removed from roster tables, mobile cards, member detail, analytics, and read paths so planning stays centered on approved wishes and roster decisions.',
          ['compact', 'dense', 'layout shift', 'badge', 'badges', 'member detail'],
          'Roster wish tables and member detail screens are denser and more stable, with aligned badges, compact rows, and fewer layout shifts.',
        ],
      },
      {
        heading: 'Review Workflow',
        bullets: [
          ['filter', 'filters', 'wish scope', 'outcome filters', 'toggle'],
          'Analytics filters were simplified and polished: wish scope is clearer, selected filters can be toggled directly, and redundant outcome filters were removed.',
          ['missing', 'covered', 'secured', 'source counts', 'required'],
          'Required coverage rows now distinguish missing, covered, and secured states, while optional utility rows focus on available source counts.',
          ['duplicate', 'deduplicate', 'represented by major buffs', 'double-report'],
          'Duplicate or misleading coverage rows were cleaned up so major buffs, major debuffs, and utility checks do not double-report the same capability.',
        ],
      },
      {
        heading: 'Verification',
        bullets: [
          ['sync-wow-spells', 'synced', 'spell metadata', 'official battle.net'],
          'Spell metadata was refreshed through sync-wow-spells, including major buff/debuff rows and callable AoE crowd control spells.',
          ['smoke', 'authenticated', 'console errors', 'failed responses', 'spell {id}'],
          'Authenticated roster analytics smoke checks confirmed localized spell names render in the Analytics tab with no Spell {id} fallbacks, console errors, or failed responses.',
        ],
      },
    ],
  },
  {
    key: 'rosters',
    title: 'Roster and Wish Management Pack',
    heading: 'Rosters and Wishes',
    intro: 'A feature pack for roster planning, wish workflows, member decisions, and rank-aware access.',
    keywords: ['roster', 'wish', 'wishes', 'voeux', 'member', 'rank', 'selection', 'guild member'],
    bullets: [
      ['wish', 'external', 'claim', 'automation'],
      'Wish automations handle self-edits, manager edits, and external member claims more reliably.',
      ['selection', 'validated', 'approved'],
      'Selected and validated roster views make approved wish planning easier to review.',
      ['rank', 'permission', 'access'],
      'Rank labels and roster permissions are more consistent across guild surfaces.',
      ['mobile', 'card', 'table'],
      'Mobile roster and wish screens are denser and easier to use.',
    ],
  },
  {
    key: 'atlas',
    title: 'Guild Atlas and Workspace Pack',
    heading: 'Guild Workspace',
    intro: 'A product update around Guild Atlas, workspace navigation, settings, and connected guild pages.',
    keywords: ['atlas', 'workspace', 'guild settings', 'navigation', 'profile', 'vault', 'guild list'],
    bullets: [
      ['atlas', 'image', 'document', 'editor'],
      'Guild Atlas now has a richer dedicated editor with image support and simpler document management.',
      ['workspace', 'navigation', 'shell'],
      'Guild pages use a more consistent workspace shell and navigation model.',
      ['settings', 'profile', 'rank'],
      'Guild settings and profile pages are more compact and easier to scan.',
      ['vault'],
      'Guild vault access, labels, and audit presentation were refined.',
    ],
  },
  {
    key: 'auth',
    title: 'Battle.net Login and Guild Sync Improvements',
    heading: 'Authentication and Sync',
    intro: 'A reliability update for Battle.net login, guild discovery, diagnostics, and background sync behavior.',
    keywords: ['battle.net', 'auth', 'oauth', 'login', 'sync', 'diagnostic', 'token', 'guild discovery'],
    bullets: [
      ['diagnostic', 'flow_id', 'login'],
      'Battle.net login diagnostics now provide safer troubleshooting data for failed OAuth flows.',
      ['sync', 'resync', 'throttle', 'deduplicate'],
      'Background Battle.net resyncs are deduplicated to avoid repeated sync storms.',
      ['guild', 'discovery', 'rename', 'realm'],
      'Guild discovery and renamed guild handling are more reliable.',
      ['token', 'refresh'],
      'Token refresh and missing-token paths are handled more defensively.',
    ],
  },
  {
    key: 'localization',
    title: 'Localization and Mobile Polish Pack',
    heading: 'Localization',
    intro: 'A broad localization and interface polish release covering new languages, locale-aware inputs, and mobile screens.',
    keywords: ['i18n', 'locale', 'translation', 'language', 'korean', 'italian', 'spanish', 'pt-br', 'zh-tw', 'calendar'],
    bullets: [
      ['korean', 'ko', 'zh-tw', 'traditional chinese'],
      'Korean and Traditional Chinese support were expanded with dedicated fonts and localized product copy.',
      ['italian', 'spanish', 'pt-br', 'locale'],
      'Italian, Spanish, and Portuguese coverage was expanded across guild, roster, poll, and Battle.net screens.',
      ['calendar', 'date', 'datetime'],
      'Date and calendar inputs now follow the active locale more consistently.',
      ['mobile', 'spacing', 'layout'],
      'Mobile layouts were tightened across auth, guilds, members, polls, and roster wishes.',
    ],
  },
  {
    key: 'privacy',
    title: 'Analytics, Privacy, and Public Release Hardening',
    heading: 'Privacy and Release Readiness',
    intro: 'A maintenance-oriented release focused on analytics hygiene, privacy controls, repository readiness, and deployment reliability.',
    keywords: ['posthog', 'privacy', 'consent', 'public repo', 'deploy', 'release', 'security', 'sanitiz'],
    bullets: [
      ['posthog', 'analytics', 'consent'],
      'Analytics are consent-gated and use safer event payloads.',
      ['privacy', 'sanitize', 'auth'],
      'Authentication and analytics events avoid leaking sensitive URL or state data.',
      ['deploy', 'production', 'workflow'],
      'Production deployment and release workflows were hardened.',
      ['public repo', 'github', 'history'],
      'Repository publication readiness and public-history cleanup were completed.',
    ],
  },
  {
    key: 'maintenance',
    title: 'Platform Maintenance Pack',
    heading: 'Maintenance',
    intro: 'A maintenance release with internal cleanup, documentation, and stability improvements.',
    keywords: ['doc', 'documentation', 'maintenance', 'cleanup', 'task', 'workflow', 'ci'],
    bullets: [
      ['documentation', 'docs'],
      'Admin and workflow documentation were updated.',
      ['workflow', 'task'],
      'Local task tracking and automation workflows were improved.',
      ['maintenance', 'cleanup'],
      'Internal cleanup reduced stale task and repository noise.',
    ],
  },
];

function scoreFeaturePackRun(run, definition) {
  const haystack = `${run.title} ${run.summary}`.toLowerCase();
  return definition.keywords.reduce((total, keyword) => (
    haystack.includes(keyword) ? total + 1 : total
  ), 0);
}

function selectPackBullets(runs, definition) {
  const bullets = [];
  const haystack = runs
    .map((run) => `${run.title} ${run.summary}`.toLowerCase())
    .join('\n');

  for (let index = 0; index < definition.bullets.length; index += 2) {
    const keywords = definition.bullets[index];
    const bullet = definition.bullets[index + 1];
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      bullets.push(bullet);
    }
  }

  return bullets.slice(0, MAX_BULLETS_PER_SECTION);
}

function formatRunBullet(run, language) {
  if (language !== 'fr') {
    return run.summary || run.title;
  }

  const haystack = `${run.title} ${run.summary}`.toLowerCase();
  if (/\b(auth|battle\.net|oauth|login|connexion|token|diagnostic)\b/.test(haystack)) {
    return "Amélioration de l'authentification Battle.net et des diagnostics de connexion.";
  }
  if (/\b(poll|sondage|results|résultat|reponse|réponse)\b/.test(haystack)) {
    return 'Amélioration des sondages, de la lecture des résultats et des réponses.';
  }
  if (/\b(roster|wish|wishes|voeu|voeux|membre|member|rank|rang)\b/.test(haystack)) {
    return 'Amélioration des rosters, des vœux et de la gestion des membres.';
  }
  if (/\b(atlas|document|image)\b/.test(haystack)) {
    return "Amélioration de l'Atlas de guilde et de l'édition de documents.";
  }
  if (/\b(i18n|locale|translation|traduction|langue|korean|italian|spanish|pt-br|zh-tw|chinese|russe|allemand)\b/.test(haystack)) {
    return 'Extension des traductions et du support multilingue.';
  }
  if (/\b(ui|ux|layout|mobile|spacing|toolbar|navigation|header|button|menu|interface)\b/.test(haystack)) {
    return "Ajustements d'interface, de navigation et d'ergonomie.";
  }
  if (/\b(analytics|posthog|privacy|confidentialit)\b/.test(haystack)) {
    return 'Amélioration des mesures produit et de la confidentialité.';
  }
  if (/\b(guild|guilde|settings|parametre|paramètre|profile|profil)\b/.test(haystack)) {
    return 'Amélioration des pages de guilde, de profil et de paramètres.';
  }

  return run.summary || run.title;
}

const CURATED_FEATURE_PACKS = {
  '0.1.0': {
    title: 'First Alpha Release - Fix & Improvements',
    intro: 'The first public alpha pass focused on stabilizing the core Guildforce experience and making the main guild workflows usable end to end.',
    sections: [
      {
        heading: 'Alpha Foundations',
        bullets: [
          'Core guild, roster, member, and administration screens were connected into the first usable product flow.',
          'The initial Battle.net-backed account and guild experience was prepared for early testers.',
          'Navigation, page structure, and shared UI surfaces were tightened for the alpha release.',
        ],
      },
      {
        heading: 'Fixes and Polish',
        bullets: [
          'Early layout, state, and data-loading issues were cleaned up across the main screens.',
          'Several rough edges in forms, lists, and empty states were corrected before wider testing.',
        ],
      },
    ],
  },
  '0.1.1': {
    title: 'Early Guildforce Improvements',
    intro: 'A follow-up alpha release with small but important improvements across the first Guildforce workflows.',
    sections: [
      {
        heading: 'Core Experience',
        bullets: [
          'Guild and member views were refined to make repeated navigation and review easier.',
          'Early roster and wish-management surfaces received quality-of-life improvements.',
          'Admin and product copy was cleaned up for clearer day-to-day usage.',
        ],
      },
      {
        heading: 'Stability',
        bullets: [
          'Initial alpha regressions and display issues were addressed across shared screens.',
          'Data presentation was made more consistent in compact guild management views.',
        ],
      },
    ],
  },
  '0.1.2': {
    title: 'Polls & Quality of Life Improvements',
    intro: 'A quality-of-life release centered on poll workflows, cleaner guild operations, and smoother repeated usage.',
    sections: [
      {
        heading: 'Polls',
        bullets: [
          'Poll creation and response flows were refined for clearer guild feedback collection.',
          'Poll result and answer displays became easier to scan and review.',
          'Question and option handling was cleaned up around common poll editing paths.',
        ],
      },
      {
        heading: 'Quality of Life',
        bullets: [
          'Small navigation, layout, and copy improvements were applied across guild screens.',
          'Shared list and card behavior was tightened for better day-to-day guild management.',
        ],
      },
    ],
  },
  '0.1.3': {
    title: 'Translations, Polls & UX',
    intro: 'A product polish release that expanded translation coverage while continuing to improve polls and shared interface behavior.',
    sections: [
      {
        heading: 'Translations',
        bullets: [
          'Additional product copy was moved into translation-ready content.',
          'Guild, poll, and roster screens received broader language coverage.',
          'Fallback behavior was improved so missing translations are less disruptive.',
        ],
      },
      {
        heading: 'Polls and UX',
        bullets: [
          'Poll-related screens were refined for clearer reading and interaction.',
          'Interface spacing, labels, and repeated controls were polished across core workflows.',
        ],
      },
    ],
  },
  '0.1.4': {
    title: 'Roster Control, Sync Hardening & German Support',
    intro: 'A release focused on roster control, wish locking, Battle.net sync hardening, and the first broader German-language coverage.',
    sections: [
      {
        heading: 'Wishes and Rosters',
        bullets: [
          'Roster and member wish locking gained clearer locked states, scheduling behavior, and activity log entries.',
          'Class wishes can be ordered by spec priority, with reorder controls and a main-spec badge.',
          'Roster tables and member cards now show the main character under the member name.',
          'Overflow actions were added when multiple row actions are available on desktop and mobile.',
        ],
      },
      {
        heading: 'Roster Analytics',
        bullets: [
          'KPI counting now respects filters and avoids double counting.',
          'Token distribution labels, colors, armor types, and default analytics tuning were refreshed.',
        ],
      },
      {
        heading: 'Sync and Localization',
        bullets: [
          'Battle.net and guild sync behavior was hardened around roster and membership data.',
          'German support was expanded across key guild-management surfaces.',
        ],
      },
    ],
  },
  '0.1.5': {
    title: 'OAuth Testing and Role Screenshot Foundations',
    intro: 'A foundation release for safer authenticated testing, local workflow tracking, and role-based screenshot review.',
    sections: [
      {
        heading: 'Testing Workflow',
        bullets: [
          'Role screenshot packs make it easier to verify member and admin experiences without manual route hopping.',
          'The OAuth recorder handles Battle.net redirects more reliably during local end-to-end setup.',
          'Task run files and the compact task index became the source of truth for implementation notes.',
        ],
      },
    ],
  },
  '0.1.6': {
    title: 'Guild Sync and Rename Management',
    intro: 'A guild operations release focused on Blizzard roster sync, renamed guild handling, and manual membership actions.',
    sections: [
      {
        heading: 'Guild Sync',
        bullets: [
          'Admins can trigger per-guild roster cache synchronization from the back office.',
          'Guild rename aliases and reconciliation logic help preserve access after Battle.net name changes.',
          'Guild lists and admin filters handle missing or unavailable member counts more cleanly.',
        ],
      },
      {
        heading: 'Roster Wishes',
        bullets: [
          'External members can be added manually to wish workflows.',
          'Managers can remove member rows from wish planning when needed.',
        ],
      },
    ],
  },
  '0.1.7': {
    title: 'Multilingual Foundations',
    intro: 'A broad internationalization release that hardened runtime fallbacks and expanded non-English product coverage.',
    sections: [
      {
        heading: 'Localization',
        bullets: [
          'Runtime i18n fallbacks were hardened to avoid raw keys and accidental French or English leaks.',
          'Russian coverage was expanded across guild, forum, poll, Battle.net, and activity surfaces.',
          'Admin documentation and product copy were audited for multilingual readiness.',
        ],
      },
      {
        heading: 'Admin Content',
        bullets: [
          'Admin documentation moved closer to full English coverage.',
          'Translation checks were tightened around semantic strings and locale-specific content.',
        ],
      },
    ],
  },
  '0.1.8': {
    title: 'Roster Planning and Wish Decisions',
    intro: 'A feature pack for validated roster planning, rank-aware access, and wish decision workflows.',
    sections: [
      {
        heading: 'Roster Planning',
        bullets: [
          'Selected and validated roster views make approved wish planning easier to review.',
          'Roster selection can be backfilled from confirmed validated wishes.',
          'Admins get read-only access to roster selection data where appropriate.',
        ],
      },
      {
        heading: 'Permissions and Labels',
        bullets: [
          'Cross-guild membership lookups and rank labels are more reliable.',
          'French semantic copy and schema documentation were cleaned up around roster workflows.',
        ],
      },
    ],
  },
  '0.1.9': {
    title: 'Poll Results and Access Overhaul',
    intro: 'A focused update for poll creation, result review, visibility controls, and answer recovery.',
    sections: [
      {
        heading: 'Poll Results',
        bullets: [
          'Poll results are easier to scan with improved filters, navigation, and reader controls.',
          'Result visibility controls are clearer and safer for guild managers.',
          'AI summaries and generated keywords are cleaner and less noisy.',
        ],
      },
      {
        heading: 'Data Recovery',
        bullets: [
          'Several response recovery and protection fixes prevent accidental poll response loss.',
          'Closed polls route users more reliably to answer review screens.',
        ],
      },
    ],
  },
  '0.1.10': {
    title: 'Guild Atlas and Workspace Launch',
    intro: 'A product release around Guild Atlas, workspace navigation, guild settings, and connected guild pages.',
    sections: [
      {
        heading: 'Guild Atlas',
        bullets: [
          'Guild Atlas introduces a dedicated document experience for guild knowledge and planning.',
          'The Atlas editor supports richer images and simpler document management.',
          'Atlas write and image upload flows were stabilized for production use.',
        ],
      },
      {
        heading: 'Workspace Navigation',
        bullets: [
          'Guild pages use a more consistent workspace shell and navigation model.',
          'Roster wishes, guild settings, and profile surfaces are more compact and easier to scan.',
        ],
      },
    ],
  },
  '0.1.11': {
    title: 'Public Release Hardening',
    intro: 'A maintenance-oriented release focused on repository readiness, deployment reliability, and production diagnostics.',
    sections: [
      {
        heading: 'Release Readiness',
        bullets: [
          'Public repository history and publication readiness were reviewed and cleaned up.',
          'Production deployment behavior was hardened around built assets and runtime configuration.',
          'Battle.net login diagnostics were deployed for safer troubleshooting.',
        ],
      },
    ],
  },
  '0.1.12': {
    title: 'Localization and Mobile Polish Pack',
    intro: 'A broad localization and interface polish release covering new languages, locale-aware inputs, and mobile screens.',
    sections: [
      {
        heading: 'Localization',
        bullets: [
          'Korean and Traditional Chinese support were expanded with dedicated fonts and localized product copy.',
          'Italian, Spanish, and Portuguese coverage was expanded across guild, roster, poll, and Battle.net screens.',
          'Date and calendar inputs now follow the active locale more consistently.',
        ],
      },
      {
        heading: 'Mobile Polish',
        bullets: [
          'Mobile layouts were tightened across auth, guilds, members, polls, and roster wishes.',
          'Navigation, badges, filters, and compact cards were refined for repeated guild management workflows.',
        ],
      },
    ],
  },
};

export async function collectRunFiles() {
  const files = [];

  if (await pathExists(ARCHIVE_DIR)) {
    files.push(...await walkMarkdownFiles(ARCHIVE_DIR));
  }

  return files.sort((a, b) => a.localeCompare(b));
}

export async function readClosedRuns() {
  const files = await collectRunFiles();
  const runs = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    const relativePath = normalizePath(path.relative(path.join(REPO_ROOT, 'tasks'), filePath));
    const run = parseClosedRun(content, relativePath);
    if (run) {
      runs.push(run);
    }
  }

  return runs;
}

async function publishPatchNotes(supabase, notes) {
  for (const note of notes) {
    const { data, error } = await supabase
      .from('patch_notes')
      .insert({
        version: note.version,
        status: 'published',
        published_at: note.published_at,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to insert patch note ${note.version}: ${error?.message || 'missing id'}`);
    }

    const { error: translationError } = await supabase
      .from('patch_note_translations')
      .insert(note.translations.map((translation) => ({
        patch_note_id: data.id,
        language: translation.language,
        title: translation.title,
        content: translation.content,
      })));

    if (translationError) {
      throw new Error(`Failed to insert translations for ${note.version}: ${translationError.message}`);
    }
  }
}

async function getExistingPatchNotes(supabase) {
  const { data, error } = await supabase
    .from('patch_notes')
    .select('id, version, published_at, patch_note_translations(id, language, title, content)')
    .order('published_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch existing patch notes: ${error.message}`);
  }

  return data || [];
}

async function repairGeneratedPatchNotes(supabase, { dryRun }) {
  const existingNotes = await getExistingPatchNotes(supabase);
  const runsByPath = new Map((await readClosedRuns()).map((run) => [run.path, run]));
  const repairs = [];

  for (const note of existingNotes) {
    const noteRunPaths = new Set();
    for (const translation of note.patch_note_translations || []) {
      parseRunPathsFromContent(translation.content || '')
        .forEach((entry) => noteRunPaths.add(entry));
    }

    if (noteRunPaths.size === 0) {
      continue;
    }

    const runs = [...noteRunPaths]
      .map((entry) => runsByPath.get(entry))
      .filter(Boolean);

    if (runs.length === 0) {
      continue;
    }

    const groups = groupRunsByIsoWeek(runs);
    if (groups.length !== 1) {
      throw new Error(`Patch note ${note.version} spans ${groups.length} weeks; refusing automatic repair.`);
    }

    const generated = createWeeklyPatchNotes(groups, {
      firstVersion: note.version,
    })[0];

    repairs.push({
      note,
      generated,
    });
  }

  if (repairs.length === 0) {
    console.log('No generated changelog entries found to repair.');
    return;
  }

  console.log(`${dryRun ? 'Dry run:' : 'Repairing'} ${repairs.length} generated changelog entr${repairs.length === 1 ? 'y' : 'ies'}.`);
  for (const repair of repairs.sort((a, b) => compareVersions(a.note.version, b.note.version))) {
    console.log(`- ${repair.note.version} (${repair.generated.weekKey}, ${repair.generated.runPaths.length} runs)`);
  }

  if (dryRun) {
    return;
  }

  for (const repair of repairs) {
    for (const translation of repair.generated.translations) {
      const existingTranslation = repair.note.patch_note_translations
        ?.find((entry) => entry.language === translation.language);

      if (existingTranslation?.id) {
        const { error } = await supabase
          .from('patch_note_translations')
          .update({
            title: translation.title,
            content: translation.content,
          })
          .eq('id', existingTranslation.id);

        if (error) {
          throw new Error(`Failed to repair ${repair.note.version} ${translation.language}: ${error.message}`);
        }
      } else {
        const { error } = await supabase
          .from('patch_note_translations')
          .insert({
            patch_note_id: repair.note.id,
            language: translation.language,
            title: translation.title,
            content: translation.content,
          });

        if (error) {
          throw new Error(`Failed to add ${repair.note.version} ${translation.language}: ${error.message}`);
        }
      }
    }
  }

  console.log(`Repaired ${repairs.length} generated changelog entr${repairs.length === 1 ? 'y' : 'ies'}.`);
}

async function repairFeaturePackPatchNotes(supabase, { dryRun }) {
  const generatedVersions = Object.keys(CURATED_FEATURE_PACKS);
  const existingNotes = await getExistingPatchNotes(supabase);
  const runs = await readClosedRuns();
  const runsByWeek = new Map(groupRunsByIsoWeek(runs).map((group) => [group.weekKey, group.runs]));
  const repairs = existingNotes
    .filter((note) => generatedVersions.includes(note.version))
    .map((note) => {
      const weekKey = parsePublishedWeekKeys([note]).values().next().value || inferWeekKeyFromVersion(note.version);
      const packRuns = runsByWeek.get(weekKey) || [];
      const pack = CURATED_FEATURE_PACKS[note.version] || createFeaturePack(packRuns);
      return {
        note,
        weekKey,
        generated: {
          title: pack.title,
          content: buildFeaturePackMarkdown(pack),
        },
      };
    });

  if (repairs.length === 0) {
    console.log('No generated feature-pack entries found to repair.');
    return;
  }

  console.log(`${dryRun ? 'Dry run:' : 'Repairing'} ${repairs.length} changelog entr${repairs.length === 1 ? 'y' : 'ies'} as English feature packs.`);
  for (const repair of repairs.sort((a, b) => compareVersions(a.note.version, b.note.version))) {
    console.log(`- ${repair.note.version} | ${repair.generated.title}`);
  }

  if (dryRun) {
    return;
  }

  for (const repair of repairs) {
    const enTranslation = repair.note.patch_note_translations
      ?.find((entry) => entry.language === 'en');

    if (enTranslation?.id) {
      const { error } = await supabase
        .from('patch_note_translations')
        .update({
          title: repair.generated.title,
          content: repair.generated.content,
        })
        .eq('id', enTranslation.id);

      if (error) {
        throw new Error(`Failed to update ${repair.note.version} English content: ${error.message}`);
      }
    } else {
      const { error } = await supabase
        .from('patch_note_translations')
        .insert({
          patch_note_id: repair.note.id,
          language: 'en',
          title: repair.generated.title,
          content: repair.generated.content,
        });

      if (error) {
        throw new Error(`Failed to insert ${repair.note.version} English content: ${error.message}`);
      }
    }

    const nonEnglishIds = repair.note.patch_note_translations
      ?.filter((entry) => entry.language !== 'en' && entry.id)
      .map((entry) => entry.id) || [];

    if (nonEnglishIds.length > 0) {
      const { error } = await supabase
        .from('patch_note_translations')
        .delete()
        .in('id', nonEnglishIds);

      if (error) {
        throw new Error(`Failed to remove non-English translations for ${repair.note.version}: ${error.message}`);
      }
    }
  }

  console.log(`Repaired ${repairs.length} changelog entr${repairs.length === 1 ? 'y' : 'ies'} as English feature packs.`);
}

async function deleteNonEnglishPatchNoteTranslations(supabase, { dryRun }) {
  const { data, error } = await supabase
    .from('patch_note_translations')
    .select('id, language, title')
    .neq('language', 'en');

  if (error) {
    throw new Error(`Failed to fetch non-English patch note translations: ${error.message}`);
  }

  const translations = data || [];
  if (translations.length === 0) {
    console.log('No non-English patch note translations found.');
    return;
  }

  console.log(`${dryRun ? 'Dry run:' : 'Deleting'} ${translations.length} non-English patch note translation${translations.length === 1 ? '' : 's'}.`);
  const byLanguage = translations.reduce((counts, translation) => {
    counts[translation.language] = (counts[translation.language] || 0) + 1;
    return counts;
  }, {});
  Object.entries(byLanguage)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([language, count]) => console.log(`- ${language}: ${count}`));

  if (dryRun) {
    return;
  }

  const { error: deleteError } = await supabase
    .from('patch_note_translations')
    .delete()
    .neq('language', 'en');

  if (deleteError) {
    throw new Error(`Failed to delete non-English patch note translations: ${deleteError.message}`);
  }

  console.log(`Deleted ${translations.length} non-English patch note translation${translations.length === 1 ? '' : 's'}.`);
}


function inferWeekKeyFromVersion(version) {
  const fallback = {
    '0.1.5': '2026-W06',
    '0.1.6': '2026-W07',
    '0.1.7': '2026-W08',
    '0.1.8': '2026-W09',
    '0.1.9': '2026-W11',
    '0.1.10': '2026-W21',
    '0.1.11': '2026-W24',
    '0.1.12': '2026-W25',
  };

  return fallback[version] || null;
}

function getLatestPublishedDate(notes) {
  return notes
    .map((note) => note.published_at?.slice(0, 10))
    .filter((value) => value && ISO_DATE_RE.test(value))
    .sort()
    .at(-1) || null;
}

function getLatestVersion(notes) {
  return notes
    .map((note) => note.version)
    .filter((version) => VERSION_RE.test(version))
    .sort(compareVersions)
    .at(-1) || '0.0.0';
}

function compareVersions(a, b) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

async function createSupabaseClientFromEnv(required) {
  await loadDotEnv();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    if (required) {
      throw new Error('SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SECRET_KEY are required for publishing.');
    }
    return null;
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function loadDotEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  return fs.readFile(envPath, 'utf8')
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
          continue;
        }
        const [key, ...valueParts] = trimmed.split('=');
        if (process.env[key]) {
          continue;
        }
        process.env[key] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    })
    .catch(() => undefined);
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));
  const supabase = await createSupabaseClientFromEnv(!options.dryRun);
  if (options.dryRun && !supabase) {
    console.log('Dry run without SUPABASE_SECRET_KEY: using local archive data only and base version 0.0.0.');
  }

  if (options.repairGenerated) {
    if (!supabase) {
      throw new Error('SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SECRET_KEY are required for repair.');
    }
    await repairGeneratedPatchNotes(supabase, { dryRun: options.dryRun });
    return;
  }

  if (options.repairFeaturePacks) {
    if (!supabase) {
      throw new Error('SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SECRET_KEY are required for feature-pack repair.');
    }
    await repairFeaturePackPatchNotes(supabase, { dryRun: options.dryRun });
    return;
  }

  if (options.deleteNonEnglishTranslations) {
    if (!supabase) {
      throw new Error('SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SECRET_KEY are required to delete non-English translations.');
    }
    await deleteNonEnglishPatchNoteTranslations(supabase, { dryRun: options.dryRun });
    return;
  }

  const existingNotes = supabase ? await getExistingPatchNotes(supabase) : [];
  const since = options.since || getLatestPublishedDate(existingNotes) || '2026-02-06';
  const publishedRunPaths = parsePublishedRunPaths(existingNotes);
  const publishedDateKeys = parsePublishedDateKeys(existingNotes);
  const publishedFeaturePackTitles = parsePublishedFeaturePackTitles(existingNotes);
  const runs = filterRuns(await readClosedRuns(), {
    since,
    to: options.to,
    publishedRunPaths,
  });
  const groups = groupRunsByIsoWeek(runs)
    .filter((group) => !publishedDateKeys.has(group.publishedAtDate));
  const patchNotes = createWeeklyPatchNotes(groups, {
    baseVersion: getLatestVersion(existingNotes),
    firstVersion: options.version,
  }).filter((note) => !publishedFeaturePackTitles.has(note.translations[0].title));

  if (patchNotes.length === 0) {
    console.log(`No unpublished closed runs found after ${since}.`);
    return;
  }

  printPlan(patchNotes, {
    dryRun: options.dryRun,
    since,
    printContent: options.printContent || options.dryRun,
  });

  if (options.dryRun) {
    return;
  }

  await publishPatchNotes(supabase, patchNotes);
  console.log(`Published ${patchNotes.length} changelog entr${patchNotes.length === 1 ? 'y' : 'ies'}.`);
}

function printPlan(notes, { dryRun, since, printContent = false }) {
  console.log(`${dryRun ? 'Dry run:' : 'Publishing'} ${notes.length} changelog entr${notes.length === 1 ? 'y' : 'ies'} after ${since}.`);

  for (const note of notes) {
    console.log(`\n${note.version} | ${note.translations[0].title} | ${note.published_at.slice(0, 10)} | ${note.runPaths.length} runs`);
    if (printContent) {
      console.log('\n--- Draft content ---');
      console.log(note.translations[0].content.trimEnd());
      console.log('\n--- Source runs ---');
    }
    for (const runPath of note.runPaths) {
      console.log(`- ${runPath}`);
    }
  }
}

function parseLineValue(content, prefix) {
  const line = content.split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

function parseReviewField(content, label) {
  const lines = content.split(/\r?\n/);
  const reviewIndex = lines.findIndex((line) => line.trim() === '## Review');
  if (reviewIndex === -1) {
    return null;
  }

  const prefix = `- ${label}:`;
  const line = lines.slice(reviewIndex + 1).find((entry) => entry.startsWith(prefix));
  if (!line) {
    return null;
  }

  return line.slice(prefix.length).trim();
}

function sanitizeMarkdownListText(value) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^\s*[-*]\s+/, '')
    .trim();
}

function decodeMarkerPayload(payload) {
  const trimmed = payload.trim();

  try {
    const parsed = JSON.parse(Buffer.from(trimmed, 'base64url').toString('utf8'));
    if (Array.isArray(parsed)) {
      return parsed
        .filter((entry) => typeof entry === 'string')
        .map(normalizePath);
    }
  } catch {
    // Fall back to the original comma-separated marker format.
  }

  return trimmed
    .split(',')
    .map((entry) => normalizePath(entry.trim()))
    .filter(Boolean);
}

async function walkMarkdownFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
