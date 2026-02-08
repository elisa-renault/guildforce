# Task Workflow (v2)

## Goal

Keep `tasks/todo.md` short while preserving full execution history.

## Model

- `tasks/todo.md` is an index only (Active, Backlog, Done latest 20).
- One task = one run file in `tasks/runs/`.
- Closed runs are moved to `tasks/archive/YYYY/MM/`.
- `tasks/lessons.md` stores prevention rules after corrections/failures.

## Commands

- `npm run task:new -- "Title"`: create a new run and add to Active.
- `npm run task:close -- "runs/YYYY-MM-DD_slug.md"`: close a run and move to Done.
- `npm run task:archive`: archive closed runs currently listed in Done.
- `npm run task:guard`: enforce size/structure constraints for `tasks/todo.md`.
- `npm run verify:quick`: task guard + lint changed files + i18n strict + targeted tests.
- `npm run verify:full`: full lint + full tests + build.

## CI Guard

`task:guard` and `ci:schema-triad` run in deploy workflow before build checks.
