import {
  SECTION_MARKERS,
  getSectionEntries,
  readTodo,
} from './common.mjs';

const MAX_LINES = Number.parseInt(process.env.TASK_TODO_MAX_LINES ?? '120', 10);
const MAX_DONE_ENTRIES = Number.parseInt(process.env.TASK_DONE_MAX ?? '20', 10);

if (!Number.isFinite(MAX_LINES) || MAX_LINES < 40) {
  console.error('TASK_TODO_MAX_LINES must be a number >= 40');
  process.exit(1);
}

if (!Number.isFinite(MAX_DONE_ENTRIES) || MAX_DONE_ENTRIES < 1) {
  console.error('TASK_DONE_MAX must be a number >= 1');
  process.exit(1);
}

const todo = await readTodo();
const lines = todo.split(/\r?\n/);
const lineCount = lines.length;

if (lineCount > MAX_LINES) {
  console.error(`tasks/todo.md has ${lineCount} lines (max ${MAX_LINES}). Archive old runs and keep index compact.`);
  process.exit(1);
}

for (const [section, [startMarker, endMarker]] of Object.entries(SECTION_MARKERS)) {
  const startCount = lines.filter((line) => line.trim() === startMarker).length;
  const endCount = lines.filter((line) => line.trim() === endMarker).length;
  if (startCount !== 1 || endCount !== 1) {
    console.error(`Section markers for ${section} are missing or duplicated.`);
    process.exit(1);
  }
}

const doneEntries = getSectionEntries(todo, 'DONE');
if (doneEntries.length > MAX_DONE_ENTRIES) {
  console.error(`Done section has ${doneEntries.length} entries (max ${MAX_DONE_ENTRIES}).`);
  process.exit(1);
}

console.log(`Task index check passed (${lineCount} lines, ${doneEntries.length} done entries).`);
