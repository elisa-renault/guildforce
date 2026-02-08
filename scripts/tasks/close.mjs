import fs from 'node:fs/promises';
import {
  asTaskRelativePath,
  dedupeEntries,
  formatTaskEntry,
  getSectionEntries,
  parseTitleFromRun,
  readTodo,
  removeEntryByPath,
  resolveRunFile,
  setSectionLines,
  todayISODate,
  writeTodo,
} from './common.mjs';

const rawTarget = process.argv.slice(2).join(' ').trim();

if (!rawTarget) {
  console.error('Usage: npm run task:close -- "<run-file-path>"');
  process.exit(1);
}

const runFilePath = await resolveRunFile(rawTarget);
const runRelativePath = asTaskRelativePath(runFilePath);
const closedDate = todayISODate();
const currentRun = await fs.readFile(runFilePath, 'utf8');
const title = parseTitleFromRun(currentRun);

const runLines = currentRun.split(/\r?\n/);
let statusIndex = runLines.findIndex((line) => line.startsWith('- Status:'));
if (statusIndex === -1) {
  runLines.splice(1, 0, '- Status: Closed');
  statusIndex = 1;
} else {
  runLines[statusIndex] = '- Status: Closed';
}

const closedIndex = runLines.findIndex((line) => line.startsWith('- Closed:'));
if (closedIndex === -1) {
  runLines.splice(statusIndex + 1, 0, `- Closed: ${closedDate}`);
} else {
  runLines[closedIndex] = `- Closed: ${closedDate}`;
}

const updatedIndex = runLines.findIndex((line) => line.startsWith('- Updated:'));
if (updatedIndex >= 0) {
  runLines[updatedIndex] = `- Updated: ${closedDate}`;
}

await fs.writeFile(runFilePath, `${runLines.join('\n').trimEnd()}\n`, 'utf8');

let todo = await readTodo();
const activeEntries = removeEntryByPath(getSectionEntries(todo, 'ACTIVE'), runRelativePath);
const backlogEntries = removeEntryByPath(getSectionEntries(todo, 'BACKLOG'), runRelativePath);
const doneEntries = removeEntryByPath(getSectionEntries(todo, 'DONE'), runRelativePath);

const doneEntry = formatTaskEntry({
  done: true,
  date: closedDate,
  title,
  taskPath: runRelativePath,
});

const nextDoneEntries = dedupeEntries([doneEntry, ...doneEntries]).slice(0, 20);

todo = setSectionLines(todo, 'ACTIVE', activeEntries);
todo = setSectionLines(todo, 'BACKLOG', backlogEntries);
todo = setSectionLines(todo, 'DONE', nextDoneEntries);
await writeTodo(todo);

console.log(`Closed ${runRelativePath} and moved it to Done in tasks/todo.md.`);
