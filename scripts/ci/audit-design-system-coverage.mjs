import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve('src');
const DESIGN_SYSTEM_DOC = path.resolve('src/components/admin/AdminDesignSystem.tsx');

const importRegex = /import\s+([\s\S]*?)\s+from\s+['"](@\/components\/[^'"]+)['"]/g;

const DIRECT_DS_MODULES = new Map([
  ['@/components/GlowCard', 'GlowCard'],
  ['@/components/CosmicButton', 'CosmicButton'],
  ['@/components/CommitmentToggle', 'CommitmentToggle'],
  ['@/components/layout/PageContainer', 'layout/PageContainer'],
  ['@/components/layout/SectionHeader', 'layout/SectionHeader'],
  ['@/components/Breadcrumbs', 'Breadcrumbs'],
  ['@/components/guild/GuildSubNav', 'guild/GuildSubNav'],
  ['@/components/roster/RosterSelector', 'roster/RosterSelector'],
]);

const BARREL_DS_MODULES = {
  '@/components/guild': new Map([['GuildSubNav', 'guild/GuildSubNav']]),
  '@/components/roster': new Map([['RosterSelector', 'roster/RosterSelector']]),
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
  const failUnderIndex = args.indexOf('--fail-under');
  const failUnderRaw = failUnderIndex >= 0 ? args[failUnderIndex + 1] : null;
  const failUnder = failUnderRaw ? Number(failUnderRaw) : null;
  return { outFile, failUnder };
};

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
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

const extractDesignSystemModules = (source) => {
  const modules = [];

  for (const match of source.matchAll(importRegex)) {
    const specifier = match[1];
    const importSource = match[2];

    if (importSource.startsWith('@/components/ui/')) {
      modules.push(`ui/${importSource.replace('@/components/ui/', '')}`);
      continue;
    }

    const directModule = DIRECT_DS_MODULES.get(importSource);
    if (directModule) {
      modules.push(directModule);
      continue;
    }

    const barrelModules = BARREL_DS_MODULES[importSource];
    if (barrelModules) {
      for (const namedImport of parseNamedImports(specifier)) {
        const moduleName = barrelModules.get(namedImport);
        if (moduleName) modules.push(moduleName);
      }
    }
  }

  return modules;
};

const main = () => {
  const { outFile, failUnder } = parseArgs();

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
  const missingFromDoc = usedModules.filter(([moduleName]) => !documentedModules.has(moduleName));
  const coveragePct =
    usedModules.length === 0
      ? 100
      : Number(((usedModules.length - missingFromDoc.length) / usedModules.length * 100).toFixed(1));

  const report = {
    generatedAt: new Date().toISOString(),
    documentedCount: documentedModules.size,
    usedCount: usedModules.length,
    coveragePct,
    missingModules: missingFromDoc.map(([moduleName, count]) => ({ moduleName, usageCount: count })),
  };

  console.log(`Design system coverage: ${coveragePct}% (${usedModules.length - missingFromDoc.length}/${usedModules.length})`);
  if (missingFromDoc.length === 0) {
    console.log('No missing design-system modules detected.');
  } else {
    console.log('Missing modules from AdminDesignSystem docs:');
    for (const [moduleName, count] of missingFromDoc) {
      console.log(`- ${moduleName}: ${count}`);
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
};

main();
