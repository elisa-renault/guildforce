import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SOURCE_FILE_RE = /^src\/.*\.(ts|tsx)$/i;
const JS_TS_EXT = /\.(c|m)?(j|t)sx?$/i;

// Hardcoded palette classes we want to block for new code.
// Use semantic tokens/classes instead (warning/info/destructive/healer/tank/etc).
const FORBIDDEN_CLASS_RE =
  /\b(?:text|bg|border|ring|from|via|to|fill|stroke)-(?:amber|sky|red|green|yellow|orange|blue|purple|pink|rose|lime|emerald|teal|cyan|indigo|violet|fuchsia)-(?:50|100|200|300|400|500|600|700|800|900)(?:\/\d{1,3})?\b/g;

const readLines = (value) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const runGit = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

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
const changedFiles = getChangedFiles()
  .filter((filePath) => SOURCE_FILE_RE.test(filePath))
  .filter((filePath) => JS_TS_EXT.test(filePath))
  .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());

if (changedFiles.length === 0) {
  console.log('No changed src TS/TSX files to check for forbidden color hardcodes.');
  process.exit(0);
}

const violations = [];

for (const filePath of changedFiles) {
  const addedLines = trackedSet.has(filePath)
    ? getAddedLinesForTrackedFile(filePath)
    : getAddedLinesForUntrackedFile(filePath);

  addedLines.forEach((line, index) => {
    const matches = [...line.matchAll(FORBIDDEN_CLASS_RE)];
    if (matches.length === 0) return;

    matches.forEach((match) => {
      violations.push({
        filePath,
        addedLineIndex: index + 1,
        token: match[0],
        line: line.trim(),
      });
    });
  });
}

if (violations.length === 0) {
  console.log('Design token guard passed: no new forbidden color hardcodes detected.');
  process.exit(0);
}

console.error('\nDesign token guard failed. New hardcoded palette classes detected:\n');
for (const violation of violations) {
  console.error(`- ${violation.filePath} (+line ${violation.addedLineIndex}): ${violation.token}`);
  console.error(`  ${violation.line}`);
}

console.error('\nUse semantic helpers/tokens from `src/lib/design-tokens.ts` instead.');
process.exit(1);
