#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

const CHECKS = [
  {
    locale: 'fr',
    files: [
      'src/i18n/semantic.ts',
      'src/i18n/translations.fr.ts',
      'src/pages/RosterWishes.tsx',
      'src/components/admin/AdminDocumentation.tsx',
      'src/components/admin/LegalPagesEditor.tsx',
      'src/components/dashboard/RosterAnalytics.tsx',
      'src/lib/exportWishes.ts',
    ],
    patterns: [
      /\bVoeux\b/g,
      /\bvoeux\b/g,
      /\bVoeu\b/g,
      /\bvoeu\b/g,
      /\bSelectionner\b/g,
      /\bconfidentialite\b/g,
      /\blegales\b/g,
      /\benregistree\b/g,
      /\bsucces\b/g,
      /\bdeverrouille\b/g,
      /\bdeverrouilles\b/g,
      /\bsupprimee\b/g,
      /\bsupprimees\b/g,
      /\breinitialisees\b/g,
      /\bfrancais\b/g,
    ],
  },
  {
    locale: 'de',
    files: ['src/i18n/translations.de.ts', 'src/__tests__/i18n.de.smoke.test.tsx', 'src/__tests__/contentTranslations.test.ts', 'src/__tests__/i18n.semantic.test.ts'],
    patterns: [
      /\bOffentliches\b/g,
      /\bDatenschutzerklaerung\b/g,
      /\bzuruck\b/g,
      /\bPrufe\b/g,
      /\bgewahlt\b/g,
      /\bauswahlen\b/g,
      /\bUngultige\b/g,
      /\bPassworter\b/g,
      /\buberein\b/g,
      /\bveroffentlicht\b/g,
      /\bfur\b/g,
    ],
  },
  {
    locale: 'it',
    files: ['src/i18n/translations.it.ts'],
    patterns: [
      /\battivita\b/g,
      /\bgia\b/g,
      /\be richiesto\b/g,
      /\be bloccato\b/g,
      /\be in configurazione\b/g,
      /\bSi e verificato\b/g,
    ],
  },
];

const findings = [];

const sliceSemanticLocaleBlock = (source, locale) => {
  if (locale !== 'fr') return source;

  const startMarker = 'const FR_SEMANTIC_MESSAGES';
  const endMarker = 'const IT_SEMANTIC_MESSAGES';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);

  if (start === -1 || end === -1 || end <= start) return source;
  return source.slice(start, end);
};

for (const check of CHECKS) {
  for (const relPath of check.files) {
    const absPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(absPath)) continue;

    const fullSource = fs.readFileSync(absPath, 'utf8');
    const source = relPath === 'src/i18n/semantic.ts'
      ? sliceSemanticLocaleBlock(fullSource, check.locale)
      : fullSource;
    for (const rx of check.patterns) {
      rx.lastIndex = 0;
      const match = rx.exec(source);
      if (!match) continue;
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      findings.push({ locale: check.locale, file: relPath, line, token: match[0] });
    }
  }
}

if (findings.length > 0) {
  console.error(`[i18n:diacritics] Found ${findings.length} discouraged token(s).`);
  for (const entry of findings) {
    console.error(`- [${entry.locale}] ${entry.file}:${entry.line} -> ${JSON.stringify(entry.token)}`);
  }
  process.exitCode = 1;
} else {
  console.log('[i18n:diacritics] OK: no discouraged tokens found in tracked locales.');
}
