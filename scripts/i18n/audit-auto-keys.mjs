#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SOURCE_DIR = path.join(ROOT_DIR, 'src');
const OUTPUT_ARG_INDEX = process.argv.indexOf('--out');
const OUTPUT_PATH = OUTPUT_ARG_INDEX >= 0 ? process.argv[OUTPUT_ARG_INDEX + 1] : process.argv[2] || '';

const isCodeFile = (filePath) => /\.(ts|tsx)$/.test(filePath);

const walk = (dirPath, acc = []) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }
    if (isCodeFile(fullPath)) {
      acc.push(fullPath);
    }
  }
  return acc;
};

const toPosix = (value) => value.split(path.sep).join('/');

const suggestSemanticKey = (autoKey) => {
  return autoKey
    .replace(/^components_/, 'components.')
    .replace(/^pages_/, 'pages.')
    .replace(/^hooks_/, 'hooks.')
    .replace(/^contexts_/, 'contexts.')
    .replace(/_/g, '.')
    .replace(/\.+/g, '.')
    .toLowerCase();
};

const filePaths = walk(SOURCE_DIR);
const usageByAutoKey = new Map();

for (const filePath of filePaths) {
  const source = fs.readFileSync(filePath, 'utf8');
  const regex = /\bt\.auto\.([A-Za-z0-9_]+)\b/g;

  for (const match of source.matchAll(regex)) {
    const autoKey = match[1];
    const item = usageByAutoKey.get(autoKey) || {
      legacyAutoKey: autoKey,
      count: 0,
      files: new Set(),
      suggestedSemanticKey: suggestSemanticKey(autoKey),
    };

    item.count += 1;
    item.files.add(toPosix(path.relative(ROOT_DIR, filePath)));
    usageByAutoKey.set(autoKey, item);
  }
}

const usages = [...usageByAutoKey.values()]
  .map((item) => ({
    legacyAutoKey: item.legacyAutoKey,
    count: item.count,
    files: [...item.files].sort(),
    suggestedSemanticKey: item.suggestedSemanticKey,
  }))
  .sort((a, b) => b.count - a.count || a.legacyAutoKey.localeCompare(b.legacyAutoKey));

const semanticTemplate = Object.fromEntries(
  usages.map((item) => [item.suggestedSemanticKey, '']),
);

const report = {
  scannedFiles: filePaths.length,
  totalAutoUsages: usages.reduce((sum, item) => sum + item.count, 0),
  uniqueAutoKeys: usages.length,
  usages,
  semanticTemplate,
};

const output = JSON.stringify(report, null, 2);

if (OUTPUT_PATH) {
  const absoluteOutPath = path.isAbsolute(OUTPUT_PATH)
    ? OUTPUT_PATH
    : path.join(ROOT_DIR, OUTPUT_PATH);
  fs.mkdirSync(path.dirname(absoluteOutPath), { recursive: true });
  fs.writeFileSync(absoluteOutPath, output + '\n', 'utf8');
  console.log(`i18n auto-key audit saved to ${toPosix(path.relative(ROOT_DIR, absoluteOutPath))}`);
  console.log(`scannedFiles=${report.scannedFiles} totalAutoUsages=${report.totalAutoUsages} uniqueAutoKeys=${report.uniqueAutoKeys}`);
} else {
  console.log(output);
}
