import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const DEFAULT_BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const DEFAULT_TIMEOUT_MINUTES = Number(process.env.E2E_AUTH_TIMEOUT_MINUTES ?? 10);

const parseArgs = argv => {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }

    const withoutPrefix = token.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split('=');
    const nextToken = argv[index + 1];
    const hasNextValue = typeof nextToken === 'string' && !nextToken.startsWith('--');

    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
      continue;
    }

    if (hasNextValue) {
      args[rawKey] = nextToken;
      index += 1;
      continue;
    }

    args[rawKey] = 'true';
  }

  return args;
};

const normalizeRole = value => {
  if (!value) return '';

  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return '';
  if (!/^[a-z0-9_-]+$/.test(trimmed)) return '';
  return trimmed;
};

const toPositiveNumber = (rawValue, fallback) => {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const usage = () => {
  console.log('Usage: npm run e2e:auth:record admin');
  console.log('Or:    npm run e2e:auth:record -- -- --role admin');
  console.log('Extra: node scripts/e2e/record-auth.mjs --role admin --baseUrl http://localhost:8080');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    usage();
    return;
  }

  const positionalRole = args._
    .flatMap(token => String(token).split(/[,\s]+/))
    .map(token => token.trim())
    .filter(Boolean)[0];
  const role = normalizeRole(args.role ?? positionalRole);
  if (!role) {
    usage();
    throw new Error('Missing or invalid --role. Allowed pattern: [a-z0-9_-]');
  }

  const timeoutMinutes = toPositiveNumber(args.timeoutMinutes, DEFAULT_TIMEOUT_MINUTES);
  const timeoutMs = timeoutMinutes * 60 * 1000;

  let baseUrl;
  try {
    baseUrl = new URL(args.baseUrl ?? DEFAULT_BASE_URL);
  } catch {
    throw new Error(`Invalid base URL: ${args.baseUrl ?? DEFAULT_BASE_URL}`);
  }

  const authDir = path.resolve(process.cwd(), 'e2e', '.auth');
  const authStatePath = path.join(authDir, `${role}.json`);
  await fs.mkdir(authDir, { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const authUrl = new URL('/auth', baseUrl).toString();
  const guildsUrl = new URL('/guilds', baseUrl).toString();
  const appOrigin = baseUrl.origin;
  console.log(`[e2e-auth] Role: ${role}`);
  console.log(`[e2e-auth] URL: ${authUrl}`);
  console.log(`[e2e-auth] Complete Battle.net OAuth in this browser window (timeout: ${timeoutMinutes} min).`);

  try {
    await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });

    await page.waitForFunction(
      expectedOrigin => (
        window.location.origin === expectedOrigin && window.location.pathname !== '/auth'
      ),
      appOrigin,
      { timeout: timeoutMs },
    );

    // Guard against false positives: ensure an authenticated app route survives
    // a direct navigation to a protected page.
    await page.goto(guildsUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

    const currentUrl = new URL(page.url());
    if (currentUrl.origin !== appOrigin || currentUrl.pathname === '/auth') {
      throw new Error(
        `OAuth callback did not produce an authenticated app session (current: ${page.url()}).`,
      );
    }

    await context.storageState({ path: authStatePath });

    const relativeStatePath = path.relative(process.cwd(), authStatePath);
    console.log(`[e2e-auth] Saved storage state: ${relativeStatePath}`);
    console.log(`[e2e-auth] Final URL: ${page.url()}`);
  } finally {
    await browser.close();
  }
};

main().catch(error => {
  console.error(`[e2e-auth] ${error.message}`);
  process.exit(1);
});
