import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve('src');
const DESIGN_SYSTEM_DOC = path.resolve('src/components/admin/AdminDesignSystem.tsx');
const COMPONENTS_ROOT = path.resolve('src/components');
const COMPONENT_ALIAS_PREFIX = '@/components/';
const SHARED_USAGE_THRESHOLD_DEFAULT = 5;
const SHARED_CANDIDATE_MIN_USAGE_DEFAULT = 2;

const importRegex = /import\s+([\s\S]*?)\s+from\s+['"](@\/components\/[^'"]+)['"]/g;
const ALWAYS_INCLUDE_MODULES = new Set([
  'GlowCard',
  'CosmicButton',
  'CosmicBackground',
  'guild/GuildSubNav',
  'layout/PageContainer',
  'layout/SectionHeader',
  'roster/RosterSelector',
  'BattleNetIcon',
  'Breadcrumbs',
  'CommitmentToggle',
]);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
  const failUnderIndex = args.indexOf('--fail-under');
  const failUnderRaw = failUnderIndex >= 0 ? args[failUnderIndex + 1] : null;
  const failUnder = failUnderRaw ? Number(failUnderRaw) : null;
  const sharedThresholdIndex = args.indexOf('--shared-threshold');
  const sharedThresholdRaw =
    sharedThresholdIndex >= 0 ? args[sharedThresholdIndex + 1] : null;
  const parsedThreshold =
    sharedThresholdRaw === null ? NaN : Number(sharedThresholdRaw);
  const sharedThreshold = Number.isFinite(parsedThreshold)
    ? parsedThreshold
    : SHARED_USAGE_THRESHOLD_DEFAULT;

  const candidateMinUsageIndex = args.indexOf('--shared-candidate-min-usage');
  const candidateMinUsageRaw =
    candidateMinUsageIndex >= 0 ? args[candidateMinUsageIndex + 1] : null;
  const parsedCandidateMinUsage =
    candidateMinUsageRaw === null ? NaN : Number(candidateMinUsageRaw);
  const sharedCandidateMinUsage = Number.isFinite(parsedCandidateMinUsage)
    ? parsedCandidateMinUsage
    : SHARED_CANDIDATE_MIN_USAGE_DEFAULT;

  const failOnUnscopedCandidates = args.includes('--fail-on-unscoped-candidates');

  return {
    outFile,
    failUnder,
    sharedThreshold,
    sharedCandidateMinUsage,
    failOnUnscopedCandidates,
  };
};

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') {
        continue;
      }
      walkFiles(fullPath, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
};

const parseNamedImports = (specifier) => {
  const namedBlock = specifier.match(/\{([\s\S]*?)\}/)?.[1];
  if (!namedBlock) return [];

  return namedBlock
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^type\s+/, '').replace(/\s+as\s+.*$/, '').trim())
    .filter(Boolean);
};

const toPosixPath = (value) => value.replace(/\\/g, '/');

const stripAliasPrefix = (importSource) =>
  importSource.startsWith(COMPONENT_ALIAS_PREFIX)
    ? importSource.slice(COMPONENT_ALIAS_PREFIX.length)
    : importSource;

const readBarrelExports = (barrelModulePath) => {
  const barrelPath = path.resolve(COMPONENTS_ROOT, barrelModulePath, 'index.ts');
  if (!fs.existsSync(barrelPath)) return new Map();

  const source = fs.readFileSync(barrelPath, 'utf8');
  const exportRegex = /export\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"]/g;
  const map = new Map();

  for (const match of source.matchAll(exportRegex)) {
    const exportList = match[1];
    const relativeTarget = match[2].replace(/^\.\//, '');

    exportList
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => {
        const withoutType = entry.replace(/^type\s+/, '').trim();
        const [left, right] = withoutType.split(/\s+as\s+/);
        const exportedName = (right || left || '').trim();
        if (!exportedName) return;
        map.set(exportedName, `${barrelModulePath}/${relativeTarget}`);
      });
  }

  return map;
};

const extractDesignSystemModules = (source) => {
  const modules = [];

  for (const match of source.matchAll(importRegex)) {
    const specifier = match[1];
    const importSource = match[2];
    const modulePath = stripAliasPrefix(importSource);

    if (!modulePath || modulePath.includes('*')) {
      continue;
    }

    const isBarrelImport = fs.existsSync(path.resolve(COMPONENTS_ROOT, modulePath, 'index.ts'));
    if (isBarrelImport) {
      const barrelMap = readBarrelExports(modulePath);
      for (const namedImport of parseNamedImports(specifier)) {
        const resolved = barrelMap.get(namedImport) || `${modulePath}/${namedImport}`;
        modules.push(toPosixPath(resolved));
      }
      continue;
    }

    modules.push(toPosixPath(modulePath));
  }

  return modules;
};

const isTopLevelComponent = (moduleName) => !moduleName.includes('/');

const computeDesignSystemScope = (usedModules, sharedThreshold) => {
  const scoped = new Set();

  for (const [moduleName, usageCount] of usedModules) {
    if (moduleName.startsWith('ui/')) {
      scoped.add(moduleName);
      continue;
    }

    if (moduleName.startsWith('layout/')) {
      scoped.add(moduleName);
      continue;
    }

    if (ALWAYS_INCLUDE_MODULES.has(moduleName)) {
      scoped.add(moduleName);
      continue;
    }

    if (isTopLevelComponent(moduleName) && usageCount >= sharedThreshold) {
      scoped.add(moduleName);
    }
  }

  return scoped;
};

const main = () => {
  const {
    outFile,
    failUnder,
    sharedThreshold,
    sharedCandidateMinUsage,
    failOnUnscopedCandidates,
  } = parseArgs();

  const dsSource = fs.readFileSync(DESIGN_SYSTEM_DOC, 'utf8');
  const documentedModules = new Set(extractDesignSystemModules(dsSource));

  const allSourceFiles = walkFiles(SRC_ROOT);
  const usageCount = new Map();

  for (const file of allSourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    for (const moduleName of extractDesignSystemModules(source)) {
      usageCount.set(moduleName, (usageCount.get(moduleName) || 0) + 1);
    }
  }

  const usedModules = [...usageCount.entries()].sort((a, b) => b[1] - a[1]);
  const dsScope = computeDesignSystemScope(usedModules, sharedThreshold);
  const scopedUsedModules = usedModules.filter(([moduleName]) => dsScope.has(moduleName));
  const unscopedSharedCandidates = usedModules
    .filter(([moduleName, usageCount]) => {
      if (dsScope.has(moduleName)) return false;
      if (!isTopLevelComponent(moduleName)) return false;
      return usageCount >= sharedCandidateMinUsage;
    })
    .map(([moduleName, usageCount]) => ({ moduleName, usageCount }));

  const missingFromDoc = scopedUsedModules.filter(
    ([moduleName]) => !documentedModules.has(moduleName),
  );
  const coveragePct =
    scopedUsedModules.length === 0
      ? 100
      : Number(
          (
            ((scopedUsedModules.length - missingFromDoc.length) / scopedUsedModules.length) *
            100
          ).toFixed(1),
        );

  const report = {
    generatedAt: new Date().toISOString(),
    sharedThreshold,
    documentedCount: documentedModules.size,
    usedCount: scopedUsedModules.length,
    coveragePct,
    missingModules: missingFromDoc.map(([moduleName, count]) => ({ moduleName, usageCount: count })),
    scopeRules: {
      prefixes: ['ui/', 'layout/'],
      alwaysInclude: [...ALWAYS_INCLUDE_MODULES],
      topLevelSharedMinUsage: sharedThreshold,
      sharedCandidateMinUsage,
    },
    unscopedSharedCandidates,
  };

  console.log(
    `Design system coverage: ${coveragePct}% (${scopedUsedModules.length - missingFromDoc.length}/${scopedUsedModules.length})`,
  );
  if (missingFromDoc.length === 0) {
    console.log('No missing design-system modules detected.');
  } else {
    console.log('Missing modules from AdminDesignSystem docs:');
    for (const [moduleName, count] of missingFromDoc) {
      console.log(`- ${moduleName}: ${count}`);
    }
  }

  if (unscopedSharedCandidates.length > 0) {
    console.log(
      `Shared candidates outside current DS scope (usage >= ${sharedCandidateMinUsage}):`,
    );
    for (const candidate of unscopedSharedCandidates) {
      console.log(`- ${candidate.moduleName}: ${candidate.usageCount}`);
    }
  }

  if (outFile) {
    const outPath = path.resolve(outFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Report written to ${outFile}`);
  }

  if (failUnder !== null && Number.isFinite(failUnder) && coveragePct < failUnder) {
    console.error(
      `Coverage check failed: ${coveragePct}% is below required threshold ${failUnder}%.`,
    );
    process.exit(1);
  }

  if (failOnUnscopedCandidates && unscopedSharedCandidates.length > 0) {
    console.error(
      `Coverage strict check failed: ${unscopedSharedCandidates.length} shared candidate(s) remain outside DS scope.`,
    );
    process.exit(1);
  }
};

main();
