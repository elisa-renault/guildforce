# DE Translation Scope (Guildforce)

Date: 2026-02-05
Owner: i18n backlog T0
Target locale: `de`
Fallback locale: `en`

## Release scope (must be fully localized)

- Global shell and navigation:
  - `common`, `routeMeta`, `guildNav`, `accessibility`, `errors`
  - Global nav/footer/breadcrumb/pagination semantic strings
- Auth + onboarding:
  - `auth`, `battlenet`, high-visibility home strings (`home`)
- Guild operations:
  - `guild`, `wishes`, `dashboard`, `permissions`, `rosters`, `guildSettings`
- Polls:
  - `polls` dictionary + all poll-related semantic strings (`polls.*` in `semantic.ts`)
- Admin:
  - `admin`, `patchnotes`, `legal`, `cookies`, `notifications`, `activityLog`
  - all admin-related semantic strings (`admin.*` in `semantic.ts`)
- Dynamic content:
  - `legal_page_translations` DE rows for every legal page
  - key patch note entries seeded in `patch_note_translations`

## Out of scope (this ticket)

- Full editorial rewrite of historical patch notes (older notes may keep EN fallback if DE seed not available).
- New locale additions beyond current supported set.
- Reworking `auto` legacy namespace for content that is no longer surfaced in release flows.

## Completion criteria

- No intentional EN fallback in release-scope static dictionary keys.
- DE semantic copy exists for release-scope semantic keys.
- Legal public pages render in DE without EN fallback.
- CI blocks regressions on DE coverage.
