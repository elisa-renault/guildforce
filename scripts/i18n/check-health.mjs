#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const EN_TRANSLATIONS_PATH = path.join(ROOT_DIR, 'src/i18n/translations.en.ts');
const FR_TRANSLATIONS_PATH = path.join(ROOT_DIR, 'src/i18n/translations.fr.ts');
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
  },
  missingInFr: toSortedArray(missingInFr),
  extraInFr: toSortedArray(extraInFr),
  unresolvedReferences: toSortedArray(unresolvedReferences),
  missingMappedLegacyKeys: toSortedArray(missingMappedLegacyKeys),
  orphanEnKeys: toSortedArray(orphanEnKeys),
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

const hasBlockingIssue =
  report.counts.unresolvedReferences > 0 ||
  (strictMode &&
    (report.counts.missingInFr > 0 ||
      report.counts.extraInFr > 0 ||
      report.counts.missingMappedLegacyKeys > 0 ||
      report.counts.orphanEnKeys > 0));

if (hasBlockingIssue) {
  process.exitCode = 1;
}
