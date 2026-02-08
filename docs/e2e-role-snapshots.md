# E2E Role Snapshots (Battle.net OAuth)

This runbook captures authenticated screenshots for multiple roles (`member`, `admin`, etc.) without changing production auth flow.

Role packs source file:
- `e2e/role-packs.json`

## 1) Prerequisites

- Local app running (default `http://localhost:8080`):

```bash
npm run dev
```

- Playwright Chromium installed once:

```bash
npm run e2e:install
```

## 2) Record one OAuth session per role

Open a visible browser, complete Battle.net login, and save local storage state:

```bash
npm run e2e:auth:record member
npm run e2e:auth:record admin
```

Expected success: the script returns only after the browser comes back to your local app and an authenticated route is reachable.  
If it times out or stays on a `battle.net` URL, auth was not completed and you should rerun the command.

Saved files:

- `e2e/.auth/member.json`
- `e2e/.auth/admin.json`

These files are local-only and ignored by git.

## 3) Generate screenshots

Use all discovered roles from `e2e/.auth/*.json`:

```bash
npm run e2e:snapshots
```

Use default role pack (`core`, member + admin routes):

```bash
npm run e2e:snapshots:rolepack
```

List available packs:

```bash
npm run e2e:snapshots:rolepack list
```

Use explicit roles/routes:

```bash
npm run e2e:snapshots member,admin /guilds,/forum,/forum/admin,/profile,/admin
```

Use a named role pack:

```bash
npm run e2e:snapshots:rolepack admin_core
```

Outputs:

- Screenshots: `e2e/artifacts/<timestamp>/<role>/*.png`
- Summary: `e2e/artifacts/<timestamp>/summary.json`

If a role is redirected to `/auth`, the command exits with error so expired sessions are caught early.

## 4) Useful flags

- `--baseUrl http://localhost:8080` (default)
- `--baseUrl http://127.0.0.1:8080` (only if this exact URI is allowed in your Battle.net OAuth app)
- `--waitMs 1500`
- `--outDir e2e/artifacts/manual-run`
- `--headed` (show browser while taking screenshots)

If your shell strips flags passed to `npm run`, use `node` directly:

```bash
node scripts/e2e/record-auth.mjs --role admin
node scripts/e2e/snapshots.mjs --roles member,admin --routes /guilds,/admin
node scripts/e2e/rolepack.mjs --pack core
```

## Security notes

- Never commit session state files.
- Re-record role files when OAuth tokens expire.
