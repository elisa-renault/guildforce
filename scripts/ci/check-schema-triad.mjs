import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const REQUIRED_FILES = [
  'src/integrations/supabase/types.ts',
  'src/components/admin/AdminDocumentation.tsx',
];
const MIGRATIONS_PREFIX = 'supabase/migrations/';
const ZERO_SHA = '0000000000000000000000000000000000000000';
const SCHEMA_SQL_PATTERNS = [
  /\bcreate\s+(?:or\s+replace\s+)?(?:table|view|materialized\s+view|index|type|domain|policy|trigger|function|procedure|schema|extension|publication|subscription|role|sequence)\b/i,
  /\balter\s+(?:table|view|materialized\s+view|index|type|domain|policy|trigger|function|procedure|schema|extension|publication|subscription|role|sequence)\b/i,
  /\bdrop\s+(?:table|view|materialized\s+view|index|type|domain|policy|trigger|function|procedure|schema|extension|publication|subscription|role|sequence)\b/i,
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\bcomment\s+on\b/i,
  /\benable\s+row\s+level\s+security\b/i,
  /\bdisable\s+row\s+level\s+security\b/i,
  /\bsecurity\s+definer\b/i,
];

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function commitExists(ref) {
  if (!ref) {
    return false;
  }

  try {
    runGit(['cat-file', '-e', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function parseNameStatus(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t').filter(Boolean);
      if (parts.length < 2) {
        return null;
      }

      const status = parts[0];
      const path = status.startsWith('R') ? parts[2] : parts[1];
      if (!path) {
        return null;
      }

      return { status, path };
    })
    .filter(Boolean);
}

function getChangedEntriesFromRange(base, head) {
  const output = runGit(['diff', '--name-status', '--diff-filter=ACMRTD', `${base}..${head}`]);
  return parseNameStatus(output);
}

function getChangedEntriesFromWorkingTree() {
  const trackedOutput = runGit(['diff', '--name-status', '--diff-filter=ACMRTD', 'HEAD']);
  const trackedEntries = parseNameStatus(trackedOutput);
  const untrackedPaths = runGit(['ls-files', '--others', '--exclude-standard'])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const untrackedEntries = untrackedPaths.map((path) => ({ status: 'A', path }));

  const merged = new Map();
  for (const entry of [...trackedEntries, ...untrackedEntries]) {
    merged.set(entry.path, entry);
  }
  return [...merged.values()];
}

function resolveRange() {
  const base = (process.env.SCHEMA_TRIAD_BASE || '').trim();
  const head = (process.env.SCHEMA_TRIAD_HEAD || 'HEAD').trim();

  if (base && base !== ZERO_SHA && commitExists(base) && commitExists(head)) {
    return { base, head, reason: 'env' };
  }
  return null;
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ');
}

function isSchemaAffectingSql(sql) {
  const normalized = stripSqlComments(sql);
  return SCHEMA_SQL_PATTERNS.some((pattern) => pattern.test(normalized));
}

function readMigrationSql(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

const range = resolveRange();
let changedEntries;

if (range) {
  changedEntries = getChangedEntriesFromRange(range.base, range.head);
  console.log(`Schema triad check range: ${range.base}..${range.head} (${range.reason})`);
} else {
  changedEntries = getChangedEntriesFromWorkingTree();
  console.log('Schema triad check range: working tree (local fallback)');
}

const changedByPath = new Map(changedEntries.map((entry) => [entry.path, entry.status]));
const changedMigrationEntries = changedEntries.filter((entry) => entry.path.startsWith(MIGRATIONS_PREFIX));

if (changedMigrationEntries.length === 0) {
  console.log('No migration changes detected. Schema triad check skipped.');
  process.exit(0);
}

const schemaMigrationTouched = changedMigrationEntries.some((entry) => {
  if (entry.status.startsWith('D')) {
    return true;
  }

  const sql = readMigrationSql(entry.path);
  if (sql === null) {
    return true;
  }

  return isSchemaAffectingSql(sql);
});

if (!schemaMigrationTouched) {
  console.log('Only data-only migration changes detected. Schema triad check skipped.');
  process.exit(0);
}

const missingRequired = REQUIRED_FILES.filter((filePath) => !changedByPath.has(filePath));
const deletedRequired = REQUIRED_FILES.filter((filePath) => changedByPath.get(filePath)?.startsWith('D'));

if (missingRequired.length > 0 || deletedRequired.length > 0) {
  console.error('Schema triad policy failed: migration changes require related updates.');
  if (missingRequired.length > 0) {
    console.error(`Missing required file change(s): ${missingRequired.join(', ')}`);
  }
  if (deletedRequired.length > 0) {
    console.error(`Required file(s) cannot be deleted: ${deletedRequired.join(', ')}`);
  }
  process.exit(1);
}

console.log('Schema triad policy passed.');
