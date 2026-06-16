#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const EN_TRANSLATIONS_PATH = path.join(ROOT_DIR, 'src/i18n/translations.en.ts');
const FR_TRANSLATIONS_PATH = path.join(ROOT_DIR, 'src/i18n/translations.fr.ts');
const DE_TRANSLATIONS_PATH = path.join(ROOT_DIR, 'src/i18n/translations.de.ts');
const SEMANTIC_PATH = path.join(ROOT_DIR, 'src/i18n/semantic.ts');

const args = process.argv.slice(2);
const strictMode = args.includes('--strict');
const outputPathArgIndex = args.indexOf('--out');
const outputPath =
  outputPathArgIndex >= 0
    ? args[outputPathArgIndex + 1]
    : args.find((arg) => arg && !arg.startsWith('--')) || '';

const toPosix = (value) => value.split(path.sep).join('/');

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

const isCodeFile = (filePath) => /\.(ts|tsx)$/.test(filePath);

const walk = (dirPath, acc = []) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }
    if (isCodeFile(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
};

const findMatchingBraceIndex = (source, openBraceIndex) => {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let escaped = false;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (!inDoubleQuote && !inTemplate && char === '\'') {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (!inSingleQuote && !inTemplate && char === '"') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === '`') {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingleQuote || inDoubleQuote || inTemplate) {
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
};

const extractObjectBlock = (source, markerRegex) => {
  const markerMatch = markerRegex.exec(source);
  if (!markerMatch || markerMatch.index < 0) {
    throw new Error(`Unable to find marker: ${markerRegex}`);
  }

  const markerIndex = markerMatch.index + markerMatch[0].length;
  const openBraceIndex = source.indexOf('{', markerIndex);
  if (openBraceIndex < 0) {
    throw new Error(`Unable to find opening brace after marker: ${markerRegex}`);
  }

  const closeBraceIndex = findMatchingBraceIndex(source, openBraceIndex);
  if (closeBraceIndex < 0) {
    throw new Error(`Unable to find closing brace after marker: ${markerRegex}`);
  }

  return source.slice(openBraceIndex + 1, closeBraceIndex);
};

const extractAutoKeysFromTranslations = (source) => {
  const autoBlock = extractObjectBlock(source, /\bauto\s*:\s*/m);
  const keyPattern = /^\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_]+))\s*:/gm;
  const keys = new Set();

  for (const match of autoBlock.matchAll(keyPattern)) {
    const key = match[1] || match[2] || match[3];
    if (key) keys.add(key);
  }

  return keys;
};

const parseJsonObjectBlock = (source, markerRegex) => {
  const block = extractObjectBlock(source, markerRegex).trim();
  try {
    return JSON.parse(`{${block}}`);
  } catch (error) {
    throw new Error(`Unable to parse JSON object block for marker ${markerRegex}: ${String(error)}`);
  }
};

const flattenObject = (value, prefix = '', acc = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) acc[prefix] = String(value ?? '');
    return acc;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenObject(child, nextPrefix, acc);
    } else {
      acc[nextPrefix] = String(child ?? '');
    }
  }

  return acc;
};

const extractReferencedAutoKeysInSource = (sourceRoot) => {
  const filePaths = walk(sourceRoot);
  const referencedAutoKeys = new Set();

  for (const filePath of filePaths) {
    const source = readFile(filePath);
    for (const match of source.matchAll(/\bt\.auto\.([A-Za-z0-9_]+)\b/g)) {
      referencedAutoKeys.add(match[1]);
    }
  }

  return { filePaths, referencedAutoKeys };
};

const extractLegacyKeysFromSemanticMap = (source) => {
  const mapBlock = extractObjectBlock(source, /\bLEGACY_AUTO_KEY_BY_SEMANTIC_KEY\b[\s\S]*?=\s*/m);
  const valuePattern = /:\s*'([A-Za-z0-9_]+)'/g;
  const keys = new Set();

  for (const match of mapBlock.matchAll(valuePattern)) {
    const key = match[1];
    if (/^(components|pages|hooks|contexts)_[A-Za-z0-9_]+$/.test(key)) {
      keys.add(key);
    }
  }

  return keys;
};

const extractSemanticKeys = (source, markerRegex) => {
  const block = extractObjectBlock(source, markerRegex);
  const keyPattern = /'([^']+)'\s*:/g;
  const keys = new Set();

  for (const match of block.matchAll(keyPattern)) {
    if (match[1]) keys.add(match[1]);
  }

  return keys;
};

const toSortedArray = (set) => [...set].sort((a, b) => a.localeCompare(b));

const difference = (left, right) => {
  const diff = new Set();
  for (const key of left) {
    if (!right.has(key)) diff.add(key);
  }
  return diff;
};

const enSource = readFile(EN_TRANSLATIONS_PATH);
const frSource = readFile(FR_TRANSLATIONS_PATH);
const deSource = readFile(DE_TRANSLATIONS_PATH);
const semanticSource = readFile(SEMANTIC_PATH);

const enAutoKeys = extractAutoKeysFromTranslations(enSource);
const frAutoKeys = extractAutoKeysFromTranslations(frSource);
const { filePaths, referencedAutoKeys } = extractReferencedAutoKeysInSource(SRC_DIR);
const semanticLegacyKeys = extractLegacyKeysFromSemanticMap(semanticSource);

const missingInFr = difference(enAutoKeys, frAutoKeys);
const extraInFr = difference(frAutoKeys, enAutoKeys);
const unresolvedReferences = difference(referencedAutoKeys, enAutoKeys);
const missingMappedLegacyKeys = difference(semanticLegacyKeys, enAutoKeys);
const allReferencedKeys = new Set([...referencedAutoKeys, ...semanticLegacyKeys]);
const orphanEnKeys = difference(enAutoKeys, allReferencedKeys);

const deObject = parseJsonObjectBlock(deSource, /\bcreateLocaleTranslations\(translationsEn,\s*/m);
const deFlat = flattenObject(deObject);
const requiredDeSections = [
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
  'notifications',
  'patchnotes',
  'legal',
  'cookies',
  'profile',
];

const missingDeSections = requiredDeSections.filter((section) =>
  !Object.keys(deObject).includes(section),
);

const deCriticalDictionaryExpectations = {
  'common.save': 'Speichern',
  'common.cancel': 'Abbrechen',
  'routeMeta.guildPolls': 'Umfragen',
  'auth.loginWithBattleNet': 'Mit Battle.net anmelden',
  'guild.guildMaster': 'Gildenmeister',
  'wishes.title': 'Meine Klassenwünsche',
  'dashboard.exportCSV': 'CSV exportieren',
  'permissions.title': 'Berechtigungen',
  'rosters.createRoster': 'Aufstellung erstellen',
  'polls.new': 'Neue Umfrage',
  'admin.userManagement': 'Benutzerverwaltung',
  'notifications.title': 'Benachrichtigungen',
  'patchnotes.changelog': 'Änderungsprotokoll',
  'legal.privacyPolicy': 'Datenschutzerklärung',
  'cookies.manageCookies': 'Cookie-Einstellungen',
};

const deDictionaryMismatches = Object.entries(deCriticalDictionaryExpectations).filter(
  ([key, expected]) => deFlat[key] !== expected,
);

const deSemanticObject = parseJsonObjectBlock(semanticSource, /\bDE_SEMANTIC_MESSAGES\b[\s\S]*?=\s*/m);
const deSemanticKeys = new Set(Object.keys(deSemanticObject));
const enSemanticKeys = extractSemanticKeys(semanticSource, /\bEN_SEMANTIC_MESSAGES\s*=\s*/m);
const missingDeSemanticKeys = [...difference(enSemanticKeys, deSemanticKeys)].sort((a, b) =>
  a.localeCompare(b),
);

const deCriticalSemanticExpectations = {
  'admin.documentation.title': 'Dokumentation',
  'polls.mutations.publish_success': 'Umfrage veröffentlicht!',
  'guild.members.title': 'Gildenmitglieder',
  'activity.log.title': 'Aktivitätsprotokoll',
};

const deSemanticMismatches = Object.entries(deCriticalSemanticExpectations).filter(
  ([key, expected]) => deSemanticObject[key] !== expected,
);

const report = {
  mode: strictMode ? 'strict' : 'soft',
  scannedFiles: filePaths.length,
  totals: {
    enAutoKeys: enAutoKeys.size,
    frAutoKeys: frAutoKeys.size,
    referencedAutoKeys: referencedAutoKeys.size,
  },
  counts: {
    missingInFr: missingInFr.size,
    extraInFr: extraInFr.size,
    unresolvedReferences: unresolvedReferences.size,
    missingMappedLegacyKeys: missingMappedLegacyKeys.size,
    orphanEnKeys: orphanEnKeys.size,
    missingDeSections: missingDeSections.length,
    deDictionaryMismatches: deDictionaryMismatches.length,
    missingDeSemanticKeys: missingDeSemanticKeys.length,
    deSemanticMismatches: deSemanticMismatches.length,
  },
  missingInFr: toSortedArray(missingInFr),
  extraInFr: toSortedArray(extraInFr),
  unresolvedReferences: toSortedArray(unresolvedReferences),
  missingMappedLegacyKeys: toSortedArray(missingMappedLegacyKeys),
  orphanEnKeys: toSortedArray(orphanEnKeys),
  de: {
    leafCount: Object.keys(deFlat).length,
    sectionCount: Object.keys(deObject).length,
    missingSections: missingDeSections,
    dictionaryMismatches: deDictionaryMismatches.map(([key, expected]) => ({
      key,
      expected,
      actual: deFlat[key] ?? '',
    })),
    semanticKeyCount: deSemanticKeys.size,
    semanticReferenceKeyCount: enSemanticKeys.size,
    missingSemanticKeys: missingDeSemanticKeys,
    semanticMismatches: deSemanticMismatches.map(([key, expected]) => ({
      key,
      expected,
      actual: deSemanticObject[key] ?? '',
    })),
  },
};

if (outputPath) {
  const absolutePath = path.isAbsolute(outputPath)
    ? outputPath
    : path.join(ROOT_DIR, outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`i18n health report saved to ${toPosix(path.relative(ROOT_DIR, absolutePath))}`);
}

console.log(
  [
    `mode=${report.mode}`,
    `scannedFiles=${report.scannedFiles}`,
    `enAutoKeys=${report.totals.enAutoKeys}`,
    `frAutoKeys=${report.totals.frAutoKeys}`,
    `referencedAutoKeys=${report.totals.referencedAutoKeys}`,
    `missingInFr=${report.counts.missingInFr}`,
    `extraInFr=${report.counts.extraInFr}`,
    `unresolvedReferences=${report.counts.unresolvedReferences}`,
    `missingMappedLegacyKeys=${report.counts.missingMappedLegacyKeys}`,
    `orphanEnKeys=${report.counts.orphanEnKeys}`,
    `missingDeSections=${report.counts.missingDeSections}`,
    `deDictionaryMismatches=${report.counts.deDictionaryMismatches}`,
    `missingDeSemanticKeys=${report.counts.missingDeSemanticKeys}`,
    `deSemanticMismatches=${report.counts.deSemanticMismatches}`,
  ].join(' ')
);

const showPreview = (label, items) => {
  if (!items.length) return;
  const preview = items.slice(0, 12).join(', ');
  const suffix = items.length > 12 ? ` ... (+${items.length - 12})` : '';
  console.log(`${label}: ${preview}${suffix}`);
};

showPreview('missingInFr', report.missingInFr);
showPreview('extraInFr', report.extraInFr);
showPreview('unresolvedReferences', report.unresolvedReferences);
showPreview('missingMappedLegacyKeys', report.missingMappedLegacyKeys);
showPreview('orphanEnKeys', report.orphanEnKeys);
showPreview('missingDeSections', report.de.missingSections);
showPreview('missingDeSemanticKeys', report.de.missingSemanticKeys);

const hasBlockingIssue =
  report.counts.unresolvedReferences > 0 ||
  (strictMode &&
    (report.counts.missingInFr > 0 ||
      report.counts.extraInFr > 0 ||
      report.counts.missingMappedLegacyKeys > 0 ||
      report.counts.orphanEnKeys > 0 ||
      report.counts.missingDeSections > 0 ||
      report.counts.deDictionaryMismatches > 0 ||
      report.counts.missingDeSemanticKeys > 0 ||
      report.counts.deSemanticMismatches > 0));

if (hasBlockingIssue) {
  process.exitCode = 1;
}
