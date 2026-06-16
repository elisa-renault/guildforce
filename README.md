# Guildforce

◆ **Guildforce** is a guild operations platform for World of Warcraft communities.  
It helps guild leaders and officers manage rosters, wishes, polls, and forum discussions in one place.

**Live app:** `https://guildforce.app`

## Product Highlights

- Battle.net-based authentication with Supabase session handling.
- Guild-centric operations: members, ranks, roster access rules, and activity flows.
- Wish workflow with status lifecycle (pending, approved, rejected).
- Advanced polls with sections, question logic, respondent targeting, and result visibility rules.
- Full forum system with moderation, sanctions, and realtime notifications.
- Bilingual user experience (French / English).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, RLS, Edge Functions) |
| Data Fetching | TanStack Query |
| Testing | Vitest, Testing Library |

## Quick Start

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env` at the repository root (or copy from `.env.example`):

```bash
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_POSTHOG_PROJECT_TOKEN="your-posthog-project-token"
VITE_POSTHOG_HOST="https://eu.i.posthog.com"
VITE_POSTHOG_ENABLED="true"
```

### 3) Run locally

```bash
npm run dev
```

## Scripts

- `npm run dev` - start Vite dev server.
- `npm run build` - build production bundle.
- `npm run build:dev` - build in development mode.
- `npm run preview` - preview the production build locally.
- `npm run lint` - run ESLint.
- `npm run test` - run Vitest suite.
- `npm run e2e:install` - install Playwright Chromium.
- `npm run e2e:auth:record member` - record one OAuth session state.
- `npm run e2e:snapshots` - capture authenticated screenshots by role.
- `npm run e2e:snapshots:rolepack` - run predefined role screenshot packs.

Role snapshots runbook: `docs/e2e-role-snapshots.md`
Permissions matrix: `docs/permissions-matrix.md`

## Supabase

- Migrations: `supabase/migrations`
- Edge Functions: `supabase/functions`
- Migration procedure (manual): `MIGRATION_SUPABASE.md`

## Testing & Quality

◆ Main test folder: `src/__tests__`  
◆ Run checks before PR/merge:

```bash
npm run lint
npm run test
```

## Deployment

Deployment runs through GitHub Actions via `.github/workflows/deploy.yml`:

- Trigger: push to `main` (or manual dispatch).
- Syncs repository content to the VPS using `rsync`.
- Runs `npm ci` and `npm run build` on the server.
- The build regenerates `dist/env.js` from server env values (`.env` and process env) for runtime Supabase and PostHog config.
- Reloads Nginx service.

## Security Notes

- Never commit secrets (`.env`, service-role keys, tokens).
- Keep `.env.example` sanitized (placeholders only).
- Respect Supabase RLS-first design for all app features.

## License

◆ This project is **source-available and proprietary** ("All Rights Reserved").  
Public repository access does not grant rights to reuse or redistribute the code.  
See `LICENSE` for full terms.
