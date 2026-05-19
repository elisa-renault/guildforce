import fs from 'node:fs';

const requiredFiles = [
  'src/components/GlobalNav.tsx',
  'src/components/guild/GuildWorkspaceShell.tsx',
  'src/components/admin/AdminSettingsSidebar.tsx',
];

const violations = [];

for (const filePath of requiredFiles) {
  if (!fs.existsSync(filePath)) {
    violations.push({
      filePath,
      reason: 'File not found.',
    });
    continue;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const hasImport = source.includes("from '@/lib/nav-styles'");
  const hasUsage = source.includes('navItemClass(');

  if (!hasImport || !hasUsage) {
    violations.push({
      filePath,
      reason: 'Expected shared nav style helper (`navItemClass`) import + usage.',
    });
  }
}

if (violations.length === 0) {
  console.log('Navigation style guard passed: shared nav helper is adopted in core nav components.');
  process.exit(0);
}

console.error('\nNavigation style guard failed:');
for (const violation of violations) {
  console.error(`- ${violation.filePath}: ${violation.reason}`);
}
process.exit(1);
