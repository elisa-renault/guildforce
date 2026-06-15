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

## 4) Authenticated smoke tests

Use authenticated smoke tests when a feature needs role-sensitive proof before release. Screenshots show that pages render; smoke tests also perform the critical actions and confirm permissions.

Typical flow:

1. Start or verify the local app:

```bash
npm run dev
```

2. Record the needed auth state:

```bash
npm run e2e:auth:record admin
npm run e2e:auth:record member
```

If only one Battle.net account is available, it can still cover multiple roles when that account has different permissions in different guilds. For example, the same `admin.json` can be a GM in one guild and a regular member in another guild.

3. Verify the auth state and discover exact guild routes:

```bash
node - <<'NODE'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: 'e2e/.auth/admin.json' });
  const page = await context.newPage();

  await page.goto('http://localhost:8080/guilds', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  console.log('URL:', page.url());
  console.log((await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1000));

  await browser.close();
})();
NODE
```

Use `http://localhost:8080` if the auth state was recorded on `localhost`. `127.0.0.1` is a different browser origin and may not reuse the same local storage.

4. Run the manager path with Playwright:

- open the target feature route
- create temporary data named `Smoke <feature> <timestamp>`
- save it
- publish or activate it if the feature has lifecycle states
- exercise the important actions
- verify the rendered result in the UI
- collect browser console errors and page errors

5. Run the member/read-only path:

- open the same feature in a guild where the auth state is only a member, or use `member.json`
- verify the expected published data is readable
- verify privileged controls are absent
- verify direct protected URLs redirect or deny access

6. Clean up:

- delete all `Smoke <feature> <timestamp>` rows
- delete uploaded assets from storage buckets
- verify cleanup with a DB query or a fresh UI reload

7. Record the result in the task run:

- guild routes used
- auth state file used
- temporary row ids and storage paths
- actions tested
- cleanup proof
- remaining browser console errors, even if non-blocking

### Atlas smoke checklist

Manager guild:

- open `/guild/<region>/<server>/<guild>/atlas`
- create an Atlas document
- save or publish it
- upload an image through the Markdown image tool
- verify the image renders in the reader
- archive and restore the document

Member guild:

- open the member guild Atlas route
- verify a published `members` document is visible
- verify no New/Edit/actions controls are visible
- verify `/atlas/new` redirects to `/atlas`
- verify `/atlas/:documentId/edit` redirects to `/atlas`

Cleanup:

```sql
delete from public.guild_atlas_documents
where title like 'Smoke Atlas%';

select count(*)
from public.guild_atlas_documents
where title like 'Smoke Atlas%';
```

When an image was uploaded, remove the corresponding object from `guild-atlas-images` before deleting the document if the document content is the easiest way to recover the storage path.

## 5) Useful flags

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
- Use DB/admin access for smoke data injection only with explicit approval.
- Always clean up injected smoke data and uploaded storage objects.
