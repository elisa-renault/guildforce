#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ['src', 'scripts', 'supabase/functions', 'supabase/migrations', 'docs', 'tasks'];
const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.sql',
  '.txt',
  '.yml',
  '.yaml',
]);

const SHOULD_SKIP_DIR = new Set(['node_modules', 'dist', '.git', '.next', '.turbo', 'coverage', 'e2e/artifacts']);

const SUSPICIOUS_REGEXES = [
  /Ã./g,
  /Â[^\n\r]/g,
  /Å[^\n\r]/g,
  /â€™/g,
  /â€˜/g,
  /â€œ/g,
  /â€\u009d/g,
  /â€“/g,
  /â€”/g,
  /â€¦/g,
  /â€¢/g,
  /â„¢/g,
  /â†./g,
  /ï»¿/g,
  /�/g,
];

const toPosix = (value) => value.split(path.sep).join('/');

const isTextFile = (filePath) => TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const shouldSkipPath = (fullPath) => {
  const rel = toPosix(path.relative(ROOT_DIR, fullPath));
  if (!rel) return true;
  if (rel === 'scripts/i18n/check-mojibake.mjs') return true;
  return [...SHOULD_SKIP_DIR].some((entry) => rel === entry || rel.startsWith(`${entry}/`));
};

const walk = (dirPath, acc = []) => {
  if (!fs.existsSync(dirPath)) return acc;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (shouldSkipPath(fullPath)) continue;
    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }
    if (isTextFile(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
};

const findings = [];

for (const target of TARGET_DIRS) {
  const absolute = path.join(ROOT_DIR, target);
  const files = walk(absolute);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const rx of SUSPICIOUS_REGEXES) {
      rx.lastIndex = 0;
      const match = rx.exec(source);
      if (!match) continue;

      const before = source.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      findings.push({
        file: toPosix(path.relative(ROOT_DIR, file)),
        line,
        snippet: match[0],
      });
      break;
    }
  }
}

if (findings.length > 0) {
  console.error(`[i18n:encoding] Suspicious mojibake sequences found (${findings.length} file(s)).`);
  for (const item of findings) {
    console.error(`- ${item.file}:${item.line} -> ${JSON.stringify(item.snippet)}`);
  }
  process.exitCode = 1;
} else {
  console.log('[i18n:encoding] OK: no suspicious mojibake sequences found.');
}
