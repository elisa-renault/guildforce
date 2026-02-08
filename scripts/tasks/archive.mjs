import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ARCHIVE_DIR,
  RUNS_DIR,
  asTaskRelativePath,
  dedupeEntries,
  extractPathFromEntry,
  formatTaskEntry,
  getSectionEntries,
  parseClosedDateFromRun,
  parseTitleFromRun,
  pathExists,
  readTodo,
  removeEntryByPath,
  resolveRunFile,
  setSectionLines,
  todayISODate,
  writeTodo,
} from './common.mjs';

function parseArgs(args) {
  const parsed = {
    closedOnly: false,
    targets: [],
  };

  for (const arg of args) {
    if (arg === '--closed') {
      parsed.closedOnly = true;
      continue;
    }
    parsed.targets.push(arg);
  }

  return parsed;
}

async function findArchiveTargetPath(date, fileName) {
  const [year, month] = date.split('-');
  const directory = path.join(ARCHIVE_DIR, year, month);
  await fs.mkdir(directory, { recursive: true });

  const extension = path.extname(fileName);
  const stem = path.basename(fileName, extension);
  let candidate = path.join(directory, fileName);
  let counter = 1;

  while (await pathExists(candidate)) {
    counter += 1;
    candidate = path.join(directory, `${stem}-${counter}${extension}`);
  }

  return candidate;
}

const parsed = parseArgs(process.argv.slice(2));
const todo = await readTodo();
const doneEntries = getSectionEntries(todo, 'DONE');
const doneRunPaths = doneEntries
  .map((line) => extractPathFromEntry(line))
  .filter((entry) => entry && entry.startsWith('runs/'));

let candidateTargets = parsed.targets;

if (parsed.closedOnly || candidateTargets.length === 0) {
  candidateTargets = [...new Set(doneRunPaths)];
}

if (candidateTargets.length === 0) {
  console.log('No run files to archive.');
  process.exit(0);
}

const moveMap = new Map();
const runMetadata = new Map();

for (const target of candidateTargets) {
  const resolved = await resolveRunFile(target);
  if (!resolved.startsWith(RUNS_DIR)) {
    continue;
  }

  const runContent = await fs.readFile(resolved, 'utf8');
  const title = parseTitleFromRun(runContent);
  const closedDate = parseClosedDateFromRun(runContent) || todayISODate();
  const destination = await findArchiveTargetPath(closedDate, path.basename(resolved));
  await fs.rename(resolved, destination);

  const oldTaskPath = asTaskRelativePath(resolved);
  const newTaskPath = asTaskRelativePath(destination);
  moveMap.set(oldTaskPath, newTaskPath);
  runMetadata.set(newTaskPath, { title, date: closedDate });
}

if (moveMap.size === 0) {
  console.log('No eligible run files were moved.');
  process.exit(0);
}

let nextTodo = todo;
let activeEntries = getSectionEntries(nextTodo, 'ACTIVE');
let backlogEntries = getSectionEntries(nextTodo, 'BACKLOG');
let doneList = getSectionEntries(nextTodo, 'DONE');

for (const [oldPath, newPath] of moveMap.entries()) {
  activeEntries = removeEntryByPath(activeEntries, oldPath);
  backlogEntries = removeEntryByPath(backlogEntries, oldPath);
  doneList = removeEntryByPath(doneList, oldPath);

  const metadata = runMetadata.get(newPath);
  doneList.unshift(
    formatTaskEntry({
      done: true,
      date: metadata?.date || todayISODate(),
      title: metadata?.title || path.basename(newPath, '.md'),
      taskPath: newPath,
    }),
  );
}

doneList = dedupeEntries(doneList).slice(0, 20);
nextTodo = setSectionLines(nextTodo, 'ACTIVE', activeEntries);
nextTodo = setSectionLines(nextTodo, 'BACKLOG', backlogEntries);
nextTodo = setSectionLines(nextTodo, 'DONE', doneList);
await writeTodo(nextTodo);

console.log(`Archived ${moveMap.size} run file(s) and updated tasks/todo.md.`);
