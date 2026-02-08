import fs from 'node:fs/promises';
import path from 'node:path';

export const REPO_ROOT = process.cwd();
export const TASKS_DIR = path.join(REPO_ROOT, 'tasks');
export const RUNS_DIR = path.join(TASKS_DIR, 'runs');
export const ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');
export const TODO_PATH = path.join(TASKS_DIR, 'todo.md');

export const SECTION_MARKERS = {
  ACTIVE: ['<!-- ACTIVE_START -->', '<!-- ACTIVE_END -->'],
  BACKLOG: ['<!-- BACKLOG_START -->', '<!-- BACKLOG_END -->'],
  DONE: ['<!-- DONE_START -->', '<!-- DONE_END -->'],
};

const SECTION_PLACEHOLDERS = {
  ACTIVE: '- [ ] (none)',
  BACKLOG: '- [ ] (none)',
  DONE: '- [x] (none)',
};

export function todayISODate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function slugify(value) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'task'
  );
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function normalizeTaskPath(inputPath) {
  const normalized = inputPath.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.startsWith('tasks/') ? normalized.slice('tasks/'.length) : normalized;
}

export function escapeInlineMarkdown(value) {
  return value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\|/g, '\\|');
}

export function formatTaskEntry({ done, date, title, taskPath }) {
  const check = done ? 'x' : ' ';
  return `- [${check}] ${date} | [${escapeInlineMarkdown(title)}](${normalizeTaskPath(taskPath)})`;
}

export function parseTitleFromRun(content, fallback = 'Untitled task') {
  const line = content.split(/\r?\n/).find((entry) => entry.startsWith('# Task Run - '));
  return line ? line.replace('# Task Run - ', '').trim() : fallback;
}

export function parseClosedDateFromRun(content) {
  const closedLine = content.split(/\r?\n/).find((line) => line.startsWith('- Closed: '));
  if (!closedLine) {
    return null;
  }

  const value = closedLine.replace('- Closed: ', '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function getTaskIndexTemplate() {
  return `# Task Index

Ce fichier reste court. Les details live dans \`tasks/runs/\` et \`tasks/archive/\`.

## Active
<!-- ACTIVE_START -->
- [ ] (none)
<!-- ACTIVE_END -->

## Backlog
<!-- BACKLOG_START -->
- [ ] (none)
<!-- BACKLOG_END -->

## Done (latest 20)
<!-- DONE_START -->
- [x] (none)
<!-- DONE_END -->
`;
}

export async function ensureTaskStructure() {
  await fs.mkdir(TASKS_DIR, { recursive: true });
  await fs.mkdir(RUNS_DIR, { recursive: true });
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });

  if (!(await pathExists(TODO_PATH))) {
    await fs.writeFile(TODO_PATH, getTaskIndexTemplate(), 'utf8');
  }
}

export async function readTodo() {
  await ensureTaskStructure();
  return fs.readFile(TODO_PATH, 'utf8');
}

export async function writeTodo(content) {
  await fs.writeFile(TODO_PATH, `${content.trimEnd()}\n`, 'utf8');
}

function getMarkerBounds(lines, section) {
  const [startMarker, endMarker] = SECTION_MARKERS[section];
  const startIndex = lines.indexOf(startMarker);
  const endIndex = lines.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(`Missing or invalid markers for section "${section}" in tasks/todo.md`);
  }

  return { startIndex, endIndex };
}

export function getSectionLines(todoContent, section) {
  const lines = todoContent.split(/\r?\n/);
  const { startIndex, endIndex } = getMarkerBounds(lines, section);
  return lines.slice(startIndex + 1, endIndex);
}

function sanitizeSectionLines(section, lines) {
  const placeholder = SECTION_PLACEHOLDERS[section];
  const cleaned = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => line !== placeholder);

  if (cleaned.length === 0) {
    return [placeholder];
  }

  return cleaned;
}

export function setSectionLines(todoContent, section, lines) {
  const allLines = todoContent.split(/\r?\n/);
  const { startIndex, endIndex } = getMarkerBounds(allLines, section);
  const [startMarker] = SECTION_MARKERS[section];
  const [, endMarker] = SECTION_MARKERS[section];
  const nextLines = sanitizeSectionLines(section, lines);

  return [
    ...allLines.slice(0, startIndex),
    startMarker,
    ...nextLines,
    endMarker,
    ...allLines.slice(endIndex + 1),
  ].join('\n');
}

export function getSectionEntries(todoContent, section) {
  return getSectionLines(todoContent, section)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ['));
}

export function extractPathFromEntry(entryLine) {
  const match = entryLine.match(/\(([^)]+)\)/);
  return match ? normalizeTaskPath(match[1].trim()) : null;
}

export function dedupeEntries(entries) {
  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    const key = extractPathFromEntry(entry) || entry;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }

  return result;
}

export async function resolveRunFile(input) {
  const raw = input.trim();
  const candidates = [
    path.resolve(REPO_ROOT, raw),
    path.resolve(TASKS_DIR, raw),
    path.resolve(RUNS_DIR, raw),
    path.resolve(RUNS_DIR, `${raw}.md`),
    path.resolve(REPO_ROOT, normalizeTaskPath(raw)),
    path.resolve(REPO_ROOT, 'tasks', normalizeTaskPath(raw)),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) {
        return candidate;
      }
    }
  }

  const runFiles = await fs.readdir(RUNS_DIR);
  const needle = raw.replace(/\\/g, '/').replace(/\.md$/i, '').toLowerCase();
  const matches = runFiles.filter((fileName) => fileName.toLowerCase().includes(needle));

  if (matches.length === 1) {
    return path.join(RUNS_DIR, matches[0]);
  }

  throw new Error(`Unable to resolve run file "${input}". Provide a path like "runs/2026-02-07_my-task.md".`);
}

export function asTaskRelativePath(filePath) {
  return normalizeTaskPath(path.relative(TASKS_DIR, filePath));
}

export function removeEntryByPath(entries, taskPath) {
  const normalized = normalizeTaskPath(taskPath);
  return entries.filter((entry) => extractPathFromEntry(entry) !== normalized);
}
