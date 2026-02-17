import fs from 'node:fs';
import path from 'node:path';

const CSS_FILE = path.resolve('src/index.css');
const MIN_CONTRAST = 4.5;

const PAIRS = [
  ['background', 'foreground'],
  ['card', 'card-foreground'],
  ['popover', 'popover-foreground'],
  ['primary', 'primary-foreground'],
  ['secondary', 'secondary-foreground'],
  ['accent', 'accent-foreground'],
  ['destructive', 'destructive-foreground'],
  ['warning', 'warning-foreground'],
  ['info', 'info-foreground'],
  ['status-success', 'status-success-foreground'],
  ['status-warning', 'status-warning-foreground'],
  ['status-error', 'status-error-foreground'],
  ['status-info', 'status-info-foreground'],
];

const rootBlockRegex = /:root\s*\{([\s\S]*?)\}/m;
const varRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;

const hslToRgb = (h, s, l) => {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(1, s));
  const ll = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [r + m, g + m, b + m];
};

const srgbToLinear = (value) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

const relativeLuminance = ([r, g, b]) => {
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const contrastRatio = (a, b) => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
};

const parseHslChannels = (value) => {
  const raw = value.trim();
  const match = raw.match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!match) return null;
  return {
    h: Number(match[1]),
    s: Number(match[2]) / 100,
    l: Number(match[3]) / 100,
  };
};

const readRootVars = () => {
  const css = fs.readFileSync(CSS_FILE, 'utf8');
  const rootBlock = css.match(rootBlockRegex)?.[1];
  if (!rootBlock) {
    throw new Error('Unable to locate :root block in src/index.css');
  }

  const vars = new Map();
  for (const match of rootBlock.matchAll(varRegex)) {
    vars.set(match[1], match[2].trim());
  }
  return vars;
};

const resolveVar = (vars, token, seen = new Set()) => {
  if (seen.has(token)) {
    throw new Error(`Circular token alias detected for --${token}`);
  }
  seen.add(token);

  const value = vars.get(token);
  if (!value) {
    throw new Error(`Missing token: --${token}`);
  }

  const alias = value.match(/^var\(--([a-z0-9-]+)\)$/i);
  if (alias) {
    return resolveVar(vars, alias[1], seen);
  }

  return value;
};

const asRgb = (vars, token) => {
  const resolved = resolveVar(vars, token);
  const channels = parseHslChannels(resolved);
  if (!channels) {
    throw new Error(`Unsupported token format for --${token}: ${resolved}`);
  }
  return hslToRgb(channels.h, channels.s, channels.l);
};

const main = () => {
  const vars = readRootVars();
  const failures = [];

  for (const [bgToken, fgToken] of PAIRS) {
    const bgRgb = asRgb(vars, bgToken);
    const fgRgb = asRgb(vars, fgToken);
    const ratio = contrastRatio(bgRgb, fgRgb);

    if (ratio < MIN_CONTRAST) {
      failures.push({ bgToken, fgToken, ratio });
    }
  }

  if (failures.length > 0) {
    console.error(`Contrast guard failed (< ${MIN_CONTRAST}:1):`);
    for (const failure of failures) {
      console.error(
        `- --${failure.bgToken} vs --${failure.fgToken}: ${failure.ratio.toFixed(2)}:1`,
      );
    }
    process.exit(1);
  }

  console.log(`Contrast guard passed (${PAIRS.length} token pairs, min ${MIN_CONTRAST}:1).`);
};

main();
