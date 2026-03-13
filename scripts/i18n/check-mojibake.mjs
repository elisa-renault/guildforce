#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SCAN_DIRS = ['src', 'scripts', 'docs', 'supabase'];
const ROOT_FILES = ['AGENTS.md', 'README.md', 'MIGRATION_SUPABASE.md', '.env.example'];
const FILE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.md',
  '.json',
  '.sql',
]);

const IGNORE_SEGMENTS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
]);

const toPosix = (value) => value.split(path.sep).join('/');
const SELF_RELATIVE_PATH = toPosix(path.join('scripts', 'i18n', 'check-mojibake.mjs'));

const MOJIBAKE_PATTERNS = [
  { label: 'replacement-character', regex: /\uFFFD/g },
  // Common mojibake signatures from UTF-8 read as Latin-1/Windows-1252.
  { label: 'utf8-latin1-mix', regex: /(?:\u00C3.|\u00C2.|\u00E2[\u0080-\u00BF])/g },
];

const shouldScanFile = (filePath) => FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const shouldIgnorePath = (filePath) => {
  const parts = filePath.split(path.sep);
  return parts.some((part) => IGNORE_SEGMENTS.has(part));
};

const walkFiles = (dirPath, acc = []) => {
  if (!fs.existsSync(dirPath)) return acc;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const absPath = path.join(dirPath, entry.name);
    if (shouldIgnorePath(absPath)) continue;

    if (entry.isDirectory()) {
      walkFiles(absPath, acc);
      continue;
    }

    if (entry.isFile() && shouldScanFile(absPath)) {
      acc.push(absPath);
    }
  }

  return acc;
};

const findings = [];

const scanFile = (relativePath) => {
  const filePath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(filePath) || !shouldScanFile(filePath)) return;

  const source = fs.readFileSync(filePath, 'utf8');

  for (const pattern of MOJIBAKE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match = pattern.regex.exec(source);

    while (match) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        file: toPosix(relativePath),
        line,
        token: match[0],
        label: pattern.label,
      });

      match = pattern.regex.exec(source);
    }
  }
};

for (const rootFile of ROOT_FILES) {
  scanFile(rootFile);
}

for (const scanDir of SCAN_DIRS) {
  const absScanDir = path.join(ROOT_DIR, scanDir);
  const files = walkFiles(absScanDir);

  for (const filePath of files) {
    const relativePath = toPosix(path.relative(ROOT_DIR, filePath));
    if (relativePath === SELF_RELATIVE_PATH) continue;
    scanFile(relativePath);
  }
}

if (findings.length > 0) {
  console.error(`[i18n:encoding] Found ${findings.length} suspicious encoding token(s).`);
  for (const entry of findings.slice(0, 200)) {
    console.error(`- ${entry.file}:${entry.line} (${entry.label}) -> ${JSON.stringify(entry.token)}`);
  }
  if (findings.length > 200) {
    console.error(`... truncated ${findings.length - 200} additional finding(s).`);
  }
  process.exitCode = 1;
} else {
  console.log('[i18n:encoding] OK: no suspicious mojibake tokens found.');
}
