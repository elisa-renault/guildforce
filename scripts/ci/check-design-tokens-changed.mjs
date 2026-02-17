import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const SOURCE_FILE_RE = /^src\/(components|pages|hooks|lib|contexts|data)\/.*\.(ts|tsx)$/i;
const JS_TS_EXT = /\.(c|m)?(j|t)sx?$/i;

// Hardcoded palette classes we want to block for new code.
// Use semantic tokens/classes instead (warning/info/destructive/healer/tank/etc).
const FORBIDDEN_CLASS_RE =
  /\b(?:text|bg|border|ring|from|via|to|fill|stroke)-(?:amber|sky|red|green|yellow|orange|blue|purple|pink|rose|lime|emerald|teal|cyan|indigo|violet|fuchsia)-(?:50|100|200|300|400|500|600|700|800|900)(?:\/\d{1,3})?\b/g;

// Tailwind arbitrary values embedding literal colors (hex/rgb/hsl) are discouraged.
const FORBIDDEN_ARBITRARY_COLOR_CLASS_RE =
  /\b(?:text|bg|border|ring|fill|stroke|from|via|to|shadow|drop-shadow)-\[[^\]]*(?:#(?:[0-9a-fA-F]{3,8})|(?:rgb|hsl)a?\([^)]*\))[^\]]*\]/g;

const STYLE_PROP_KEY_RE =
  /\b(?:color|background|backgroundColor|backgroundImage|borderColor|outlineColor|stroke|fill|boxShadow|textShadow)\s*:/;
const HEX_LITERAL_RE = /#(?:[0-9a-fA-F]{3,8})\b/;
const FUNCTION_COLOR_LITERAL_RE = /(?:rgb|hsl)a?\(/;

const ALLOWLIST = [
  // No exceptions currently. Keep explicit allowlist support for controlled deviations.
];

const readLines = (value) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const runGit = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const isFullScan = process.argv.includes('--full');

const isAllowlisted = (filePath, token, line) =>
  ALLOWLIST.some(
    (entry) =>
      filePath === entry.filePath &&
      (entry.tokenRe ? entry.tokenRe.test(token) : true) &&
      (entry.lineRe ? entry.lineRe.test(line) : true),
  );

const isTokenBasedArbitraryColor = (token) => {
  if (!token.includes('var(--')) return false;
  const hasHexLiteral = HEX_LITERAL_RE.test(token);
  const hasRgbLiteral = /rgba?\(/i.test(token);
  if (hasHexLiteral || hasRgbLiteral) return false;
  return true;
};

const hasForbiddenLiteralStyleColor = (line) => {
  if (!STYLE_PROP_KEY_RE.test(line)) return false;
  const hasColorLiteral = HEX_LITERAL_RE.test(line) || FUNCTION_COLOR_LITERAL_RE.test(line);
  if (!hasColorLiteral) return false;
  if (line.includes('var(--')) return false;
  return true;
};

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    if (!SOURCE_FILE_RE.test(fullPath.replace(/\\/g, '/'))) continue;
    if (!JS_TS_EXT.test(entry.name)) continue;
    out.push(fullPath);
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

const fullScanFiles = walkFiles('src').map((filePath) => filePath.replace(/\\/g, '/'));

const changedFiles = isFullScan
  ? fullScanFiles
  : getChangedFiles()
      .filter((filePath) => SOURCE_FILE_RE.test(filePath))
      .filter((filePath) => JS_TS_EXT.test(filePath))
      .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());

if (changedFiles.length === 0) {
  console.log(
    isFullScan
      ? 'No src TS/TSX files to check for forbidden color hardcodes.'
      : 'No changed src TS/TSX files to check for forbidden color hardcodes.',
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
    const checks = [
      { regex: FORBIDDEN_CLASS_RE, kind: 'palette-class' },
      { regex: FORBIDDEN_ARBITRARY_COLOR_CLASS_RE, kind: 'arbitrary-color-class' },
    ];

    for (const check of checks) {
      const matches = [...line.matchAll(check.regex)];
      if (matches.length === 0) continue;

      matches.forEach((match) => {
        const token = match[0];
        if (check.kind === 'arbitrary-color-class' && isTokenBasedArbitraryColor(token)) {
          return;
        }
        if (isAllowlisted(filePath, token, line)) return;
        violations.push({
          filePath,
          lineIndex: index + 1,
          token,
          kind: check.kind,
          line: line.trim(),
        });
      });
    }

    if (hasForbiddenLiteralStyleColor(line)) {
      const token = line.trim();
      if (!isAllowlisted(filePath, token, line)) {
        violations.push({
          filePath,
          lineIndex: index + 1,
          token,
          kind: 'literal-style-color',
          line: line.trim(),
        });
      }
    }
  });
}

if (violations.length === 0) {
  console.log('Design token guard passed: no new forbidden color hardcodes detected.');
  process.exit(0);
}

console.error('\nDesign token guard failed. New hardcoded palette classes detected:\n');
for (const violation of violations) {
  const linePrefix = isFullScan ? 'line' : '+line';
  console.error(
    `- ${violation.filePath} (${linePrefix} ${violation.lineIndex}) [${violation.kind}]: ${violation.token}`,
  );
  console.error(`  ${violation.line}`);
}

console.error(
  '\nUse semantic helpers/tokens from `src/lib/design-tokens.ts` or CSS vars (`hsl(var(--token))`) instead.',
);
process.exit(1);
