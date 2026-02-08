import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const DEFAULT_PACK_NAME = process.env.E2E_ROLEPACK ?? 'core';
const DEFAULT_PACKS_FILE = process.env.E2E_ROLEPACKS_FILE ?? path.join('e2e', 'role-packs.json');

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

const normalizeRole = role => String(role ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_-]/g, '');

const normalizeRoute = route => {
  const trimmed = String(route ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const pathExists = async targetPath => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const usage = () => {
  console.log('Usage: npm run e2e:snapshots:rolepack');
  console.log('Or:    npm run e2e:snapshots:rolepack admin_core');
  console.log('Or:    npm run e2e:snapshots:rolepack list');
  console.log('Options:');
  console.log('  --packsFile <path>   Path to role packs JSON (default: e2e/role-packs.json)');
  console.log('  --baseUrl <url>      Override app URL');
  console.log('  --waitMs <n>         Delay before screenshots');
  console.log('  --outDir <path>      Output directory');
  console.log('  --headed             Run browser in headed mode');
  console.log('  --listPacks          Show available packs and exit');
};

const readPacksFile = async packsFilePath => {
  const raw = await fs.readFile(packsFilePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object' || !parsed.packs || typeof parsed.packs !== 'object') {
    throw new Error(`Invalid role packs schema in ${packsFilePath}`);
  }

  return parsed;
};

const validateEntry = (entry, packName, entryIndex) => {
  const role = normalizeRole(entry?.role);
  if (!role) {
    throw new Error(`Invalid role in pack "${packName}" entry #${entryIndex + 1}`);
  }

  const routes = Array.isArray(entry?.routes)
    ? entry.routes.map(normalizeRoute).filter(Boolean)
    : [];
  if (routes.length === 0) {
    throw new Error(`Invalid routes in pack "${packName}" entry #${entryIndex + 1}`);
  }

  return { role, routes };
};

const runSnapshotsForEntry = ({ role, routes, outDir, baseUrl, waitMs, headed }) => {
  const snapshotsScript = path.resolve(process.cwd(), 'scripts', 'e2e', 'snapshots.mjs');
  const routesArg = routes.join(',');
  const args = [snapshotsScript, role, routesArg, '--outDir', outDir];

  if (baseUrl) args.push('--baseUrl', baseUrl);
  if (waitMs !== undefined) args.push('--waitMs', String(waitMs));
  if (headed) args.push('--headed');

  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === 'true') {
    usage();
    return;
  }

  const packsFilePath = path.resolve(process.cwd(), args.packsFile ?? DEFAULT_PACKS_FILE);
  const packsDoc = await readPacksFile(packsFilePath);
  const availablePacks = Object.entries(packsDoc.packs);

  const positionalCommand = String(args._[0] ?? '').trim().toLowerCase();
  if (args.listPacks === 'true' || positionalCommand === 'list') {
    console.log(`[e2e-rolepack] packs file: ${path.relative(process.cwd(), packsFilePath)}`);
    for (const [name, pack] of availablePacks) {
      const description = typeof pack?.description === 'string' ? pack.description : '';
      const entriesCount = Array.isArray(pack?.entries) ? pack.entries.length : 0;
      console.log(`- ${name} (${entriesCount} ${entriesCount === 1 ? 'entry' : 'entries'})${description ? `: ${description}` : ''}`);
    }
    return;
  }

  const positionalPack = positionalCommand === 'list' ? '' : args._[0];
  const packName = String(args.pack ?? positionalPack ?? DEFAULT_PACK_NAME).trim();
  const pack = packsDoc.packs[packName];
  if (!pack) {
    const names = availablePacks.map(([name]) => name).join(', ');
    throw new Error(`Unknown role pack "${packName}". Available packs: ${names}`);
  }

  if (!Array.isArray(pack.entries) || pack.entries.length === 0) {
    throw new Error(`Role pack "${packName}" has no entries.`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultOutDir = path.resolve(process.cwd(), 'e2e', 'artifacts', `rolepack_${packName}_${timestamp}`);
  const outputDir = path.resolve(process.cwd(), args.outDir ?? defaultOutDir);
  await fs.mkdir(outputDir, { recursive: true });

  const baseUrl = args.baseUrl ? String(args.baseUrl) : undefined;
  const waitMs = args.waitMs !== undefined ? Number(args.waitMs) : undefined;
  const headed = args.headed === 'true';

  const summary = {
    generatedAt: new Date().toISOString(),
    packName,
    packsFile: path.relative(process.cwd(), packsFilePath),
    outputDir: path.relative(process.cwd(), outputDir),
    entries: [],
    failedEntries: 0,
    successfulEntries: 0,
  };

  for (let index = 0; index < pack.entries.length; index += 1) {
    const validatedEntry = validateEntry(pack.entries[index], packName, index);
    const entryId = `${String(index + 1).padStart(2, '0')}_${validatedEntry.role}`;
    const entryOutDir = path.join(outputDir, 'entries', entryId);
    await fs.mkdir(entryOutDir, { recursive: true });

    console.log(`[e2e-rolepack] Running entry ${entryId}: role=${validatedEntry.role} routes=${validatedEntry.routes.join(',')}`);

    const exitCode = runSnapshotsForEntry({
      role: validatedEntry.role,
      routes: validatedEntry.routes,
      outDir: entryOutDir,
      baseUrl,
      waitMs: Number.isFinite(waitMs) ? waitMs : undefined,
      headed,
    });

    const entrySummaryPath = path.join(entryOutDir, 'summary.json');
    const entrySummaryExists = await pathExists(entrySummaryPath);
    const entryRecord = {
      id: entryId,
      role: validatedEntry.role,
      routes: validatedEntry.routes,
      outDir: path.relative(process.cwd(), entryOutDir),
      status: exitCode === 0 ? 'ok' : 'failed',
      exitCode,
      summaryPath: entrySummaryExists ? path.relative(process.cwd(), entrySummaryPath) : null,
    };

    summary.entries.push(entryRecord);
    if (exitCode === 0) {
      summary.successfulEntries += 1;
    } else {
      summary.failedEntries += 1;
    }
  }

  const rolepackSummaryPath = path.join(outputDir, 'rolepack-summary.json');
  await fs.writeFile(rolepackSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(`[e2e-rolepack] Output: ${path.relative(process.cwd(), outputDir)}`);
  console.log(`[e2e-rolepack] Summary: ${path.relative(process.cwd(), rolepackSummaryPath)}`);

  if (summary.failedEntries > 0) {
    console.error(`[e2e-rolepack] Completed with ${summary.failedEntries} failed entr${summary.failedEntries === 1 ? 'y' : 'ies'}.`);
    process.exit(1);
  }
};

main().catch(error => {
  console.error(`[e2e-rolepack] ${error.message}`);
  process.exit(1);
});
