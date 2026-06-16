import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');
const OUTPUT_PATH = path.join(DIST_DIR, 'env.js');

const SUPABASE_KEYS = [
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
];

const POSTHOG_KEYS = [
  'VITE_POSTHOG_PROJECT_TOKEN',
  'VITE_POSTHOG_HOST',
  'VITE_POSTHOG_ENABLED',
];

const RUNTIME_ENV_KEYS = [...SUPABASE_KEYS, ...POSTHOG_KEYS];

const stripWrappingQuotes = (value) => {
  if (!value) return value;

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const parseDotEnv = (content) => {
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (value.includes('#') && !value.startsWith('"') && !value.startsWith("'")) {
      value = value.split('#')[0].trim();
    }

    result[key] = stripWrappingQuotes(value);
  }

  return result;
};

const readDotEnv = async () => {
  try {
    const content = await readFile(ENV_PATH, 'utf8');
    return parseDotEnv(content);
  } catch {
    return {};
  }
};

const fromProcessEnv = Object.fromEntries(RUNTIME_ENV_KEYS.map((key) => [key, process.env[key]]));
const fromDotEnv = await readDotEnv();

const resolved = Object.fromEntries(
  RUNTIME_ENV_KEYS.map((key) => {
    const processValue = stripWrappingQuotes(fromProcessEnv[key]);
    const dotEnvValue = stripWrappingQuotes(fromDotEnv[key]);
    return [key, processValue || dotEnvValue || undefined];
  }).filter(([, value]) => typeof value === 'string' && value.length > 0),
);

await mkdir(DIST_DIR, { recursive: true });

const output = `window.__ENV = Object.assign({}, window.__ENV || {}, ${JSON.stringify(resolved, null, 2)});\n`;
await writeFile(OUTPUT_PATH, output, 'utf8');

console.log(`Generated runtime env file: ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`);
