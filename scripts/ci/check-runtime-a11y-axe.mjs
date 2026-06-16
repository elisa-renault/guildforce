import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const DEFAULT_BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const DEFAULT_PUBLIC_ROUTES = ['/', '/auth'];
const DEFAULT_PRIVATE_ROUTES = ['/guilds', '/admin', '/admin/design-system'];
const DEFAULT_ROUTES_PACK_FILE = path.resolve(
  process.cwd(),
  'scripts',
  'ci',
  'runtime-route-packs.json',
);
const DEFAULT_ROUTES_PACK = 'ds_critical';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_WAIT_MS = Number(process.env.E2E_WAIT_MS ?? 600);
const DEFAULT_AUTH_STATE = path.resolve(process.cwd(), 'e2e', '.auth', 'admin.json');
const REPORT_PATH = path.resolve(process.cwd(), 'tmp', 'a11y-runtime-axe.json');

const IMPACT_LEVELS = ['critical', 'serious'];

const parseArgs = argv => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = 'true';
    }
  }
  return args;
};

const splitRoutes = value =>
  String(value)
    .split(',')
    .map(route => route.trim())
    .filter(Boolean)
    .map(route => (route.startsWith('/') ? route : `/${route}`));

const routeUrl = (baseUrl, route) => new URL(route, baseUrl).toString();

const fileExists = async filePath => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const loadRoutesPack = async (packFilePath, packName) => {
  const raw = await fs.readFile(packFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  const packs = parsed?.packs || {};
  const resolvedPackName = packName || parsed?.defaultPack || DEFAULT_ROUTES_PACK;
  const pack = packs[resolvedPackName];
  if (!pack) {
    throw new Error(`Unknown routes pack "${resolvedPackName}" in ${path.relative(process.cwd(), packFilePath)}`);
  }
  return {
    packName: resolvedPackName,
    publicRoutes: splitRoutes((pack.publicRoutes || []).join(',')),
    privateRoutes: splitRoutes((pack.privateRoutes || []).join(',')),
  };
};

const summarizeViolations = violations =>
  violations.map(violation => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map(node => ({
      html: node.html,
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  }));

const analyzeRoute = async ({
  page,
  baseUrl,
  route,
  timeoutMs,
  waitMs,
}) => {
  const url = routeUrl(baseUrl, route);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  if (waitMs > 0) await page.waitForTimeout(waitMs);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const strictViolations = results.violations.filter(v => IMPACT_LEVELS.includes(v.impact || ''));
  return {
    route,
    url,
    finalUrl: page.url(),
    strictViolationCount: strictViolations.length,
    strictViolations: summarizeViolations(strictViolations),
    totalViolationCount: results.violations.length,
  };
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args['base-url'] ?? DEFAULT_BASE_URL;
  const timeoutMs = Number(args['timeout-ms'] ?? DEFAULT_TIMEOUT_MS);
  const waitMs = Number(args['wait-ms'] ?? DEFAULT_WAIT_MS);
  const routesPackFile = path.resolve(
    process.cwd(),
    args['routes-pack-file'] ?? DEFAULT_ROUTES_PACK_FILE,
  );
  const routesPack = args['routes-pack'] ?? DEFAULT_ROUTES_PACK;
  const usingLegacyRouteArgs = Boolean(args['public-routes'] || args['private-routes']);
  const packRoutes = usingLegacyRouteArgs
    ? null
    : await loadRoutesPack(routesPackFile, routesPack);
  const publicRoutes = args['public-routes']
    ? splitRoutes(args['public-routes'])
    : packRoutes?.publicRoutes ?? DEFAULT_PUBLIC_ROUTES;
  const privateRoutes = args['private-routes']
    ? splitRoutes(args['private-routes'])
    : packRoutes?.privateRoutes ?? DEFAULT_PRIVATE_ROUTES;
  const authStatePath = path.resolve(process.cwd(), args['auth-state'] ?? DEFAULT_AUTH_STATE);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    policy: {
      failOnImpact: IMPACT_LEVELS,
      tags: ['wcag2a', 'wcag2aa'],
    },
    routesPack: packRoutes ? packRoutes.packName : 'custom',
    public: { routes: [], skipped: [] },
    admin: { routes: [], skipped: [] },
    strictViolationCount: 0,
  };

  const browser = await chromium.launch({ headless: true });
  try {
    const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const publicPage = await publicContext.newPage();
    for (const route of publicRoutes) {
      try {
        const result = await analyzeRoute({ page: publicPage, baseUrl, route, timeoutMs, waitMs });
        report.public.routes.push(result);
      } catch (error) {
        report.public.skipped.push({
          route,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
    await publicContext.close();

    const hasAdminAuth = await fileExists(authStatePath);
    if (hasAdminAuth) {
      const adminContext = await browser.newContext({
        storageState: authStatePath,
        viewport: { width: 1440, height: 900 },
      });
      const adminPage = await adminContext.newPage();
      for (const route of privateRoutes) {
        try {
          const result = await analyzeRoute({ page: adminPage, baseUrl, route, timeoutMs, waitMs });
          const redirectedToAuth = new URL(result.finalUrl).pathname === '/auth';
          if (redirectedToAuth) {
            report.admin.skipped.push({
              route,
              reason: 'redirected_to_auth',
              finalUrl: result.finalUrl,
            });
            continue;
          }
          report.admin.routes.push(result);
        } catch (error) {
          report.admin.skipped.push({
            route,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
      await adminContext.close();
    } else {
      report.admin.skipped.push({
        route: '*',
        reason: `missing_auth_state:${path.relative(process.cwd(), authStatePath)}`,
      });
    }
  } finally {
    await browser.close();
  }

  const allRouteResults = [...report.public.routes, ...report.admin.routes];
  report.strictViolationCount = allRouteResults.reduce(
    (sum, route) => sum + route.strictViolationCount,
    0,
  );

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`[a11y-runtime-axe] Report written to ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(
    `[a11y-runtime-axe] Routes audited: ${allRouteResults.length} (public: ${report.public.routes.length}, admin: ${report.admin.routes.length})`,
  );
  if (report.admin.skipped.length > 0 || report.public.skipped.length > 0) {
    console.log(
      `[a11y-runtime-axe] Skipped routes: ${report.public.skipped.length + report.admin.skipped.length}`,
    );
  }

  if (report.strictViolationCount > 0) {
    console.error(
      `[a11y-runtime-axe] Failed: ${report.strictViolationCount} critical/serious violation(s) detected.`,
    );
    process.exit(1);
  }

  console.log('[a11y-runtime-axe] Passed: no critical/serious violations detected.');
};

main().catch(error => {
  console.error(`[a11y-runtime-axe] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
