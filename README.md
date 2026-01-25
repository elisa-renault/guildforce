# Guildforce

Guild management platform to centralize members, polls, forums, and profiles.

## URL

https://guildforce.app

## Key features

- Authentication and user profiles via Supabase.
- Guild directory, member management, and ranks.
- Advanced polls with drag-and-drop editor, sections, preview, respondent targeting, and results access control.
- Full forum (categories, topics, moderation/admin).
- Roster management and member wishes.
- Public pages, changelog, and legal pages.
- Bilingual UI (FR/EN).

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + data)
- TanStack Query
- Vitest

## Local development

```sh
npm install
npm run dev
```

## Environment variables

Create a `.env` file at the root with:

```sh
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
```

## Useful scripts

```sh
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

## Tests

Unit tests use Vitest and live in `src/__tests__`.

## Deployment

The GitHub Actions workflow `.github/workflows/deploy.yml`:

- syncs the code to the VPS via rsync
- installs dependencies and builds
- installs/reloads the Nginx config

Nginx config: `nginx/guildforce.conf`.

## Supabase

- Migrations: `supabase/migrations`
- Edge functions: `supabase/functions`
