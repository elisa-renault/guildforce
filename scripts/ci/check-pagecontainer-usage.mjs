import fs from 'node:fs';
import path from 'node:path';

const PAGES_ROOT = path.resolve('src/pages');

const walkFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    if (entry.name.endsWith('.tsx')) {
      out.push(fullPath);
    }
  }
  return out;
};

const pageFiles = walkFiles(PAGES_ROOT);
const missing = [];

for (const filePath of pageFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  if (!source.includes('PageContainer')) {
    missing.push(path.relative(process.cwd(), filePath).replaceAll('\\', '/'));
  }
}

if (missing.length === 0) {
  console.log('PageContainer guard passed: all page components reference PageContainer.');
  process.exit(0);
}

console.error('\nPageContainer guard failed. Missing PageContainer usage in:');
for (const file of missing) {
  console.error(`- ${file}`);
}
console.error('\nUse `PageContainer` to keep width/spacing behavior consistent across pages.');
process.exit(1);
