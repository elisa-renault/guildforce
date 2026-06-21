# Guildforce

## Project Context

Guildforce is a guild operations platform for World of Warcraft communities. It centralizes guild management, roster planning, class wishes, polls, forum discussions, moderation, notifications, and admin tooling.

Audit snapshot (repository state reviewed on 2026-02-03; verify against code before relying on operational details):
- Frontend: React 18 + TypeScript + Vite (port `8080` in `vite.config.ts`)
- Styling/UI: Tailwind CSS + shadcn/ui + custom "cosmic" components
- Backend: Supabase Postgres + RLS + Edge Functions
- Auth: Battle.net OAuth primary + email/password fallback for existing accounts
- Data fetching/state: TanStack React Query
- Realtime: Supabase realtime on forum/notifications flows

## Architecture Map

### Frontend structure

- `src/pages`: route-level screens (guild, polls, forum, admin, profile, auth)
- `src/components`: domain components (`admin`, `forum`, `polls`, `roster`, `dashboard`, `permissions`, `settings`, `ui`)
- `src/contexts`: `AuthContext`, `LanguageContext`
- `src/hooks`: data hooks (`useGuildPermissions`, `useGuildPolls`, `useNotifications`, etc.)
- `src/integrations/supabase`: typed Supabase client and generated DB types
- `src/i18n`: translation sources
- `src/routes.tsx`: canonical route map and breadcrumbs

### Backend structure

- `supabase/migrations`: database schema/RLS/RPC history
- `supabase/functions/battlenet-auth`: OAuth, Battle.net sync, guild auto-join/create, resync
- `supabase/functions/sync-wow-spells`: scheduled spell metadata sync (`wow_spells`)
- `supabase/functions/submit-bug-report`: report intake with rate limiting
- `supabase/functions/export-users`: admin-only auth-user CSV export
- `supabase/functions/full-backup`: admin-only SQL export of public tables

## Domain Overview (Behavior Snapshot, Verify In Code)

- Authentication
  - Battle.net is the primary login flow (`/functions/v1/battlenet-auth/auth-url` + `/login`).
  - Email/password login exists in UI as fallback (`Auth.tsx`), labeled for existing accounts.
  - Sessions persist in `localStorage` and are exposed via `AuthContext` (`user`, `session`, `profile`, `loading`, `signOut`, `refreshProfile`).

- Battle.net synchronization
  - User characters and memberships sync into `wow_characters` and `wow_guild_memberships`.
  - Guild roster cache syncs into `guild_roster_cache` for guild-level views and matching.
  - Profiles include `is_syncing` lock flag to avoid overlapping resyncs.
  - Spell/effect catalog uses `wow_spells` + `raid_effects`; sync function can be cron-triggered.

- Guild and membership model
  - Guilds can be auto-created/claimed from Battle.net GM detection.
  - Ownership can be transferred automatically when GM status changes in Battle.net.
  - `guild_members.status` includes `confirmed`, `potential`, and `withdrawn`.
  - `officer_rank_threshold` controls officer-level interpretation.

- Rosters and wishes
  - Multi-roster per guild, with per-roster access rules (`roster_access_rules`).
  - Wishes are roster-scoped and validated via `pending` / `approved` / `rejected` workflow.
  - Wishes include class/spec preferences, comments, and commitment state.

- Polls
  - Hierarchy: polls -> sections -> questions -> responses.
  - Question types: `single_choice`, `multiple_choice`, `text`, `rating`, `date`, `time`, `datetime`, `ranking`, `scale`.
  - Respondent targeting and result visibility are separate (`poll_respondent_rules` vs `poll_results_access_rules`).
  - Access helpers: `can_respond_to_poll` and `can_view_poll_results`.

- Forum and notifications
  - Forum supports categories, topics, posts, reactions, mentions, subscriptions, and moderation.
  - Moderation includes reports and sanctions (`timeout`, `ban`).
  - Notifications are persisted in `forum_notifications` and surfaced in `NotificationBell`.

- Admin and compliance
  - App roles: `admin`, `moderator`, `user` (`user_roles` table).
  - Admin UI includes user management, guild management, forum moderation tooling, bug reports, deletion requests, legal pages, patch notes, and backup/export actions.

## Security and RLS Guidelines

- RLS is enabled across the data model; never bypass policy logic from client code.
- Use helper RPCs instead of duplicating permission logic in frontend code:
  - `has_role`
  - `has_guild_permission`
  - `has_roster_access`
  - `is_guild_member`
  - `is_guild_gm`
  - `can_respond_to_poll`
  - `can_view_poll_results`
  - `is_user_forum_sanctioned` (forum restrictions)
- Sensitive data handling:
  - `battlenet_tokens` is highly sensitive; self-access only.
  - Never expose service-role keys in frontend code.
  - Edge functions with `verify_jwt = false` must perform explicit auth/role checks in function logic.

## Database Schema Alignment Rules

When schema changes are introduced, update all three surfaces:
1. Supabase migration(s) in `supabase/migrations`
2. Generated types in `src/integrations/supabase/types.ts`
3. Admin docs in `src/components/admin/AdminDocumentation.tsx` (DB + Security sections)

Current table grouping:
- Core identity/guild sync tables
  - `profiles`, `battlenet_tokens`, `wow_characters`, `wow_guild_memberships`, `guilds`, `guild_members`, `guild_roster_cache`
- Feature tables
  - `rosters`, `roster_access_rules`, `class_wishes`, `guild_permissions`, `guild_activity_logs`
  - `guild_polls`, `guild_poll_sections`, `guild_poll_questions`, `guild_poll_responses`
  - `poll_respondent_rules`, `poll_results_access_rules`
  - `wow_spells`, `raid_effects`
- Forum tables
  - `forum_categories`, `forum_topics`, `forum_posts`, `forum_reactions`, `forum_reports`, `forum_user_sanctions`, `forum_topic_subscriptions`, `forum_notifications`, `forum_moderators`
- Admin/content tables
  - `user_roles`, `bug_reports`, `account_deletion_requests`, `legal_pages`, `patch_notes`

Note: a legacy `characters` table still exists in migrations; avoid adding new product logic there unless a dedicated migration plan requires it.

## Documentation and Admin UI Requirements

- `src/components/admin/AdminDocumentation.tsx` is the canonical product documentation UI in-app.
- This component is presentation-only (no business logic).
- Any major feature or policy change must add/update a documented subsection.
- Keep entries multilingual by always filling all languages content/title fields.
- Preserve language-specific characters correctly in UTF-8, including accents and locale-specific punctuation.
- Use searchable tags (`auth`, `battlenet`, `wishes`, `polls`, `forum`, `security`, etc.).

## Text Encoding and I18n Safety

- Treat UTF-8 as mandatory for source files, translations, docs, JSON, SQL, and generated text assets.
- Prefer `apply_patch` for text edits. Avoid shell redirection or shell-based file rewrites for textual content unless the command guarantees UTF-8 output.
- Do not use PowerShell `Set-Content`, `Add-Content`, `Out-File`, or `>` / `>>` to rewrite user-facing text files unless encoding is explicitly controlled.
- If a script generates or rewrites text files, it must write UTF-8 explicitly.
- Keep user-facing UI copy in translation or content files; do not add inline FR/EN ternaries, hardcoded English fallback labels, or component-local user-facing strings for shipped UI.
- Any new or changed UI label, tooltip, toast, dialog copy, table header, menu item, empty state, or validation message must be translated in every supported locale under `src/i18n/translations.*.ts` before completion.
- After changing front-end copy, translations, docs, SQL content, or admin content, run `npm run i18n:check:encoding` and `npm run i18n:check:diacritics`.
- If mojibake appears in the terminal only, verify the file bytes and repository diff before changing application code.

## Workflow Orchestration

### 1) Planning discipline by default
- For non-trivial work (>=3 steps or design decisions), write or update a short plan before broad implementation.
- If the active runtime exposes a formal planning mode or planning tool, use it.
- If it does not, keep the plan in the task run file or in a concise working note.
- If implementation drifts or fails, stop and re-plan.
- Include verification steps in the plan (not only implementation).

### 1b) Local Codex budget and scope discipline
- Start narrow: inspect only the files, routes, scripts, or migrations directly related to the user request before broad searches.
- Prefer `rg` targeted by feature name, route, table, hook, or component. Avoid scanning `tasks/archive`, `dist`, `node_modules`, generated outputs, or large historical logs unless the task explicitly needs them.
- For normal implementation tasks, aim to modify 1-4 files. If the likely change exceeds 5 files, touches multiple layers (DB + Edge Function + UI + i18n + docs), or changes auth/RLS/dependencies, pause and provide a short plan before editing further.
- Do not combine unrelated work in one run. Split database/RLS, generated types/docs, API/hooks, UI, i18n, tests, and deployment into separate tasks unless the user explicitly asks for an end-to-end change.
- Use stop conditions: stop and ask for more context if the relevant files cannot be identified after targeted inspection, if behavior depends on missing credentials/external state, or if the requested fix becomes a product decision.
- Keep final diffs proportional to the prompt. Avoid opportunistic cleanup, broad refactors, route-wide restyling, or translation churn that is not required by the requested change.
- Choose verification by risk: run the narrowest relevant command first, then escalate only when the touched surface justifies it.

### 2) Task tracking discipline

1. Create one run file per task in `tasks/runs/YYYY-MM-DD_<slug>.md` (`npm run task:new -- "Title"`).
2. Keep detailed plan/progress/review inside the run file, not in `tasks/todo.md`.
3. Keep `tasks/todo.md` as a compact index only (Active/Backlog/Done latest 20).
4. Close completed runs via `npm run task:close -- "runs/<file>.md"` and archive with `npm run task:archive`.
5. After user corrections/failures, add prevention rules in `tasks/lessons.md`.

### 3) Verification before completion
- Validate changed behavior (tests, lint, or targeted checks).
- Confirm diffs are minimal and intentional.
- Ask: "Would this pass staff-level review?"

### 4) Elegance and pragmatism
- Prefer simple, maintainable solutions over clever shortcuts.
- Refactor hacky solutions when impact is significant.
- Do not over-engineer obvious fixes.

## Testing Requirements

Current repo baseline:
- Vitest + Testing Library are configured.
- Existing tests are minimal (`src/__tests__/routes.test.tsx` smoke coverage).

Required expectations for non-trivial changes:
- Unit tests for domain logic (wishes, permissions, poll access, security helpers).
- Integration tests for Supabase/RLS-heavy flows (auth sync, guild ownership, poll visibility).
- E2E coverage for core journeys when test infrastructure is added.

Use realistic fixtures (20-300 member guilds, mixed ranks/roles, multi-roster setups) for permission and scaling confidence.

## Build and Quality Commands

Shell guidance:
- Git Bash can be more convenient for commands that pass Unix-style routes such as `/guilds` or `/forum`.
- PowerShell is acceptable when it is the active environment, but avoid shell-based text rewrites unless UTF-8 encoding is explicit.

Use existing npm scripts (canonical):
- `npm run dev`
- `npm run build`
- `npm run build:dev`
- `npm run preview`
- `npm run lint`
- `npm run test`
- `npm run verify:quick`
- `npm run verify:full`
- `npm run ci:schema-triad`
- `npm run task:new -- "Title"`
- `npm run task:close -- "runs/<file>.md"`
- `npm run task:archive`
- `npm run task:guard`
- `npm run e2e:snapshots:rolepack`

Verification selection guidance:
- Copy/text/i18n changes: `npm run i18n:check:encoding` and `npm run i18n:check:diacritics`; add `npm run i18n:check:strict` when translation keys or fallback behavior changed.
- Local TS/React changes: prefer `npm run lint:changed` plus the most relevant Vitest file; use `npm run lint` when shared code or lint configuration changed.
- Schema/RLS changes: run `npm run ci:schema-triad`; add targeted tests or manual Supabase checks when policies/RPC behavior changed.
- UI behavior or layout changes: use targeted browser verification or role screenshots when authenticated states are available; avoid full E2E packs for tiny copy/layout tweaks.
- Release-critical or cross-cutting changes: finish with `npm run verify:quick`; use `npm run verify:full` before critical merges/deployments or when build/runtime boundaries changed.

## Autonomous E2E Role Screenshots

When authenticated role states exist, the agent may capture connected UI screenshots without user intervention.

Prerequisites:
- Local app is running (`npm run dev`) on `http://localhost:8080`.
- Role auth states exist in `e2e/.auth/` (for example `member.json`, `admin.json`).

Commands:
- Record role state (interactive Battle.net login once per role): `npm run e2e:auth:record member`
- Capture screenshots for one or many roles:
  - `npm run e2e:snapshots`
  - `npm run e2e:snapshots member,admin /guilds,/forum,/forum/admin,/profile,/admin`
- Capture screenshots via predefined pack config:
  - `npm run e2e:snapshots:rolepack`
  - `npm run e2e:snapshots:rolepack admin_core`
  - `npm run e2e:snapshots:rolepack list`
  - Pack file: `e2e/role-packs.json`

Outputs:
- Screenshots in `e2e/artifacts/<timestamp>/<role>/*.png`
- Run summary in `e2e/artifacts/<timestamp>/summary.json`

Operational notes:
- If a role redirects to `/auth`, treat session as expired and re-record with `npm run e2e:auth:record <role>`.
- In Git Bash, disable path conversion for `/route` arguments:
  - `MSYS_NO_PATHCONV=1 npm run e2e:snapshots member /guilds /forum /profile`
- Use `docs/permissions-matrix.md` as the role/access oracle during QA and debugging.

## Authenticated Role Smoke Tests

Use this when a release needs proof that a feature works with real authenticated permissions, not just unit tests or static screenshots.

Process:
1. Create a task run with `npm run task:new -- "Smoke <feature> authenticated roles"`.
2. Start the local app on the same origin used by the auth state, usually `http://localhost:8080`.
3. Record or refresh auth state with `npm run e2e:auth:record <role>`. If there is only one Battle.net account, it may still cover multiple roles when that account has different permissions in different guilds.
4. Resolve the real route by opening `/guilds` with the saved storage state and clicking the target guild card instead of guessing slugs.
5. Test the manager path first: open the feature, create temporary data, save, publish/activate if applicable, exercise critical actions, and verify rendered output.
6. Test the member/read-only path separately: use a guild where the same auth state is only a member, or use a distinct `member.json`. Verify visible data, absence of privileged controls, and direct protected-route redirects.
7. If test data must be injected for a read-only role, use DB/admin access only when explicitly approved and keep the inserted rows clearly named with a `Smoke <feature> <timestamp>` prefix.
8. Clean up all temporary rows and uploaded assets. Verify cleanup with a DB query or application reload.
9. Record exact routes, temporary ids, cleanup results, and any browser console errors in the task run; close and archive it.

Atlas smoke checklist:
- Manager guild: create Atlas document, save draft, publish, edit/read it, upload and render an image, archive, restore.
- Member guild: read a published members-visible document, confirm no create/edit/actions controls, confirm `/atlas/new` and `/atlas/:id/edit` redirect back to `/atlas`.
- Cleanup: delete the smoke Atlas documents and any uploaded `guild-atlas-images` object, then confirm no `Smoke Atlas%` rows remain.

Supabase references:
- Migrations: `supabase/migrations`
- Edge functions: `supabase/functions`
- Manual migration runbook: `MIGRATION_SUPABASE.md`

Deployment reference:
- `.github/workflows/deploy.yml` deploys on push to `main` via rsync, then `npm ci && npm run build`, then reloads Nginx.

## Core Principles

- Simplicity first: smallest safe change that solves the real problem.
- Root-cause mindset: no temporary patches without explicit tradeoff callout.
- Minimal blast radius: avoid regressions in adjacent guild/forum/admin flows.
- Security-first: RLS and role checks are product-critical, not optional.
