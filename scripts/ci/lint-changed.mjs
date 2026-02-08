import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const JS_TS_EXT = /\.(c|m)?(j|t)sx?$/i;

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function readLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getChangedFiles() {
  const tracked = readLines(runGit(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']));
  const untracked = readLines(runGit(['ls-files', '--others', '--exclude-standard']));
  return [...new Set([...tracked, ...untracked])];
}

const candidates = getChangedFiles()
  .filter((filePath) => JS_TS_EXT.test(filePath))
  .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());

if (candidates.length === 0) {
  console.log('No changed JS/TS files to lint.');
  process.exit(0);
}

console.log(`Linting ${candidates.length} changed file(s).`);
const npmExecPath = process.env.npm_execpath;
const fallbackCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = npmExecPath
  ? spawnSync(process.execPath, [npmExecPath, 'exec', '--', 'eslint', ...candidates], { stdio: 'inherit' })
  : spawnSync(fallbackCommand, ['exec', '--', 'eslint', ...candidates], { stdio: 'inherit' });

if (result.error) {
  console.error(`Unable to run eslint: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
