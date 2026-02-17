import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const SOURCE_FILE_RE = /^src\/(components|pages)\/.*\.(ts|tsx)$/i;
const EXCLUDED_RE = /^src\/components\/ui\//i;

const readLines = (value) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const runGit = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const isFullScan = process.argv.includes('--full');

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    const normalizedPath = fullPath.replace(/\\/g, '/');
    if (!SOURCE_FILE_RE.test(normalizedPath)) continue;
    if (EXCLUDED_RE.test(normalizedPath)) continue;
    out.push(normalizedPath);
  }
  return out;
};

const getChangedFiles = () => {
  const tracked = readLines(runGit(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']));
  const untracked = readLines(runGit(['ls-files', '--others', '--exclude-standard']));
  return [...new Set([...tracked, ...untracked])];
};

const getAddedLinesForTrackedFile = (filePath) => {
  const output = runGit(['diff', '--unified=0', '--', filePath]);
  return output
    .split(/\r?\n/)
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1));
};

const getAddedLinesForUntrackedFile = (filePath) =>
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

const trackedSet = new Set(
  readLines(runGit(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'])),
);

const changedFiles = isFullScan
  ? walkFiles('src')
  : getChangedFiles()
      .filter((filePath) => SOURCE_FILE_RE.test(filePath))
      .filter((filePath) => !EXCLUDED_RE.test(filePath))
      .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());

if (changedFiles.length === 0) {
  console.log(
    isFullScan
      ? 'No component/page TSX files to check for focus visibility regressions.'
      : 'No changed component/page TSX files to check for focus visibility regressions.',
  );
  process.exit(0);
}

const violations = [];

for (const filePath of changedFiles) {
  const lines = isFullScan
    ? fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    : trackedSet.has(filePath)
      ? getAddedLinesForTrackedFile(filePath)
      : getAddedLinesForUntrackedFile(filePath);

  lines.forEach((line, index) => {
    const hasFocusRingZero = /\bfocus(?::visible)?:ring-0\b/.test(line);
    if (hasFocusRingZero) {
      violations.push({
        filePath,
        lineIndex: index + 1,
        reason: 'Do not suppress focus rings with focus:ring-0/focus-visible:ring-0.',
        line: line.trim(),
      });
      return;
    }

    const hasFocusOutlineNone = /\bfocus:outline-none\b/.test(line);
    const hasVisibleFallback = /\bfocus-visible:/.test(line);
    if (hasFocusOutlineNone && !hasVisibleFallback) {
      violations.push({
        filePath,
        lineIndex: index + 1,
        reason: 'focus:outline-none requires a matching focus-visible style in the same class string.',
        line: line.trim(),
      });
    }
  });
}

if (violations.length === 0) {
  console.log('A11y focus guard passed: no new focus visibility regressions detected.');
  process.exit(0);
}

console.error('\nA11y focus guard failed. Problematic focus styles detected:\n');
for (const violation of violations) {
  const linePrefix = isFullScan ? 'line' : '+line';
  console.error(`- ${violation.filePath} (${linePrefix} ${violation.lineIndex})`);
  console.error(`  ${violation.reason}`);
  console.error(`  ${violation.line}`);
}

process.exit(1);
