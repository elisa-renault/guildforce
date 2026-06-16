import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

const DEFAULT_BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const DEFAULT_ROUTES = ['/guilds', '/profile', '/admin'];
const DEFAULT_WAIT_MS = Number(process.env.E2E_WAIT_MS ?? 1200);

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

const normalizeRole = value => String(value).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

const normalizeRoute = value => {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const routeToFileName = route => {
  if (!route || route === '/') return 'root';

  return route
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\//, '')
    .replace(/[/?&=:#]+/g, '__')
    .replace(/[^a-z0-9._-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    || 'route';
};

const toPositiveNumber = (rawValue, fallback) => {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const splitCsv = rawValue => String(rawValue)
  .split(/[,\s]+/)
  .map(token => token.trim())
  .filter(Boolean);

const pathExists = async filePath => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const discoverRoles = async authDir => {
  const entries = await fs.readdir(authDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name.replace(/\.json$/i, ''))
    .map(normalizeRole)
    .filter(Boolean)
    .sort();
};

const resolveTargetUrl = (baseUrl, route) => {
  if (/^https?:\/\//.test(route)) return route;
  return new URL(route, baseUrl).toString();
};

const usage = () => {
  console.log('Usage: npm run e2e:snapshots member,admin');
  console.log('Also:  npm run e2e:snapshots member admin /guilds /admin');
  console.log('Or:    npm run e2e:snapshots');
  console.log('Or:    npm run e2e:snapshots -- -- --roles member,admin --routes /guilds,/admin');
  console.log('Optional flags: --baseUrl <url> --outDir <dir> --waitMs <n> --headed');
  console.log('Default roles are discovered from e2e/.auth/*.json');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    usage();
    return;
  }

  let baseUrl;
  try {
    baseUrl = new URL(args.baseUrl ?? DEFAULT_BASE_URL);
  } catch {
    throw new Error(`Invalid base URL: ${args.baseUrl ?? DEFAULT_BASE_URL}`);
  }

  const waitMs = toPositiveNumber(args.waitMs, DEFAULT_WAIT_MS);
  const positional = args._.map(token => String(token).trim()).filter(Boolean);
  const isRouteToken = token => token.startsWith('/') || /^https?:\/\//.test(token);

  const roleTokens = [];
  const routeTokens = [];
  if (!args.roles) {
    for (const token of positional) {
      if (routeTokens.length > 0 || isRouteToken(token)) {
        routeTokens.push(token);
      } else {
        roleTokens.push(token);
      }
    }
  }

  const routes = (
    args.routes
      ? splitCsv(args.routes)
      : routeTokens.length > 0
        ? routeTokens.flatMap(splitCsv)
        : DEFAULT_ROUTES
  )
    .map(normalizeRoute)
    .filter(Boolean);

  if (routes.length === 0) {
    throw new Error('No valid routes provided.');
  }

  const authDir = path.resolve(process.cwd(), 'e2e', '.auth');
  const requestedRoles = (
    args.roles
      ? splitCsv(args.roles)
      : roleTokens.length > 0
        ? roleTokens.flatMap(splitCsv)
        : []
  )
    .map(normalizeRole)
    .filter(Boolean);
  const roles = requestedRoles.length > 0 ? requestedRoles : await discoverRoles(authDir);

  if (roles.length === 0) {
    usage();
    throw new Error('No role session found. Run e2e:auth:record first.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = args.outDir
    ? path.resolve(process.cwd(), args.outDir)
    : path.resolve(process.cwd(), 'e2e', 'artifacts', timestamp);
  await fs.mkdir(outputDir, { recursive: true });

  const headless = args.headed === 'true' ? false : args.headless === 'false' ? false : true;
  const browser = await chromium.launch({ headless });

  let failureCount = 0;
  let screenshotCount = 0;

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: baseUrl.toString(),
    outputDir: path.relative(process.cwd(), outputDir),
    routes,
    roles: [],
  };

  try {
    for (const role of roles) {
      const roleAuthPath = path.join(authDir, `${role}.json`);
      const authExists = await pathExists(roleAuthPath);
      const roleOutputDir = path.join(outputDir, role);
      await fs.mkdir(roleOutputDir, { recursive: true });

      if (!authExists) {
        summary.roles.push({
          role,
          status: 'missing_auth_state',
          authState: path.relative(process.cwd(), roleAuthPath),
          shots: [],
        });
        failureCount += 1;
        continue;
      }

      const context = await browser.newContext({
        storageState: roleAuthPath,
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();

      const roleSummary = {
        role,
        status: 'ok',
        authState: path.relative(process.cwd(), roleAuthPath),
        shots: [],
      };

      for (let index = 0; index < routes.length; index += 1) {
        const route = routes[index];
        const targetUrl = resolveTargetUrl(baseUrl, route);
        const fileName = `${String(index + 1).padStart(2, '0')}_${routeToFileName(route)}.png`;
        const shotPath = path.join(roleOutputDir, fileName);
        const relativeShotPath = path.relative(process.cwd(), shotPath);

        try {
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
          await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
          if (waitMs > 0) {
            await page.waitForTimeout(waitMs);
          }
          await page.screenshot({ path: shotPath, fullPage: true });

          const finalUrl = page.url();
          const redirectedToAuth = new URL(finalUrl).pathname === '/auth';
          if (redirectedToAuth) {
            roleSummary.status = 'auth_redirect_detected';
            failureCount += 1;
          }

          roleSummary.shots.push({
            route,
            targetUrl,
            finalUrl,
            redirectedToAuth,
            screenshot: relativeShotPath,
            status: redirectedToAuth ? 'auth_redirect' : 'ok',
          });
          screenshotCount += 1;
        } catch (error) {
          roleSummary.status = 'error';
          failureCount += 1;
          roleSummary.shots.push({
            route,
            targetUrl,
            screenshot: relativeShotPath,
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      summary.roles.push(roleSummary);
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const summaryPath = path.join(outputDir, 'summary.json');
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(`[e2e-snapshots] Output: ${path.relative(process.cwd(), outputDir)}`);
  console.log(`[e2e-snapshots] Summary: ${path.relative(process.cwd(), summaryPath)}`);
  console.log(`[e2e-snapshots] Screenshots: ${screenshotCount}`);
  if (failureCount > 0) {
    console.error(`[e2e-snapshots] Completed with ${failureCount} issue(s).`);
    process.exit(1);
  }
};

main().catch(error => {
  console.error(`[e2e-snapshots] ${error.message}`);
  process.exit(1);
});
