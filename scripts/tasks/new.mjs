import fs from 'node:fs/promises';
import path from 'node:path';
import {
  RUNS_DIR,
  asTaskRelativePath,
  dedupeEntries,
  ensureTaskStructure,
  formatTaskEntry,
  getSectionEntries,
  pathExists,
  readTodo,
  setSectionLines,
  slugify,
  todayISODate,
  writeTodo,
} from './common.mjs';

const title = process.argv.slice(2).join(' ').trim();

if (!title) {
  console.error('Usage: npm run task:new -- "<title>"');
  process.exit(1);
}

const date = todayISODate();
const slug = slugify(title);
await ensureTaskStructure();
let counter = 1;
let fileName = `${date}_${slug}.md`;
let filePath = path.join(RUNS_DIR, fileName);

while (await pathExists(filePath)) {
  counter += 1;
  fileName = `${date}_${slug}-${counter}.md`;
  filePath = path.join(RUNS_DIR, fileName);
}

const runTemplate = `# Task Run - ${title}

- Status: Active
- Created: ${date}
- Updated: ${date}
- Owner: codex

## Scope
- Describe the expected outcome.

## Plan
- [ ] Clarify implementation boundaries.
- [ ] Implement with minimal blast radius.
- [ ] Validate behavior and summarize review.

## Verification
- [ ] Add or update relevant tests.
- [ ] Run targeted checks (\`npm run lint\`, \`npm run test\`, etc.).

## Review
- Summary:
- Risks:
- Follow-ups:
`;

await fs.writeFile(filePath, runTemplate, 'utf8');

let todo = await readTodo();
const activeEntries = getSectionEntries(todo, 'ACTIVE');
const nextEntry = formatTaskEntry({
  done: false,
  date,
  title,
  taskPath: asTaskRelativePath(filePath),
});

const nextActiveEntries = dedupeEntries([nextEntry, ...activeEntries]);
todo = setSectionLines(todo, 'ACTIVE', nextActiveEntries);
await writeTodo(todo);

console.log(`Created ${asTaskRelativePath(filePath)} and added it to tasks/todo.md (Active).`);
