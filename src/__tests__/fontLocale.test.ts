import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import tailwindConfig from '../../tailwind.config';

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('locale font stacks', () => {
  it('keeps Tailwind font families routed through locale-aware CSS variables', () => {
    expect(tailwindConfig.theme?.extend?.fontFamily?.sans).toEqual(['var(--font-sans)']);
    expect(tailwindConfig.theme?.extend?.fontFamily?.display).toEqual(['var(--font-display)']);
  });

  it('keeps Latin fonts first and uses Noto TC as zh-TW CJK fallback', () => {
    const css = readProjectFile('src/index.css');

    expect(css).toContain('--font-sans: "Roboto", system-ui, sans-serif;');
    expect(css).toContain('--font-display: "Faculty Glyphic", Georgia, serif;');
    expect(css).toContain('html[lang="zh-TW"]');
    expect(css).toContain(
      '--font-sans: "Roboto", "Noto Sans TC", "Noto Sans CJK TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif;',
    );
    expect(css).toContain(
      '--font-display: "Faculty Glyphic", "Noto Serif TC", "Noto Serif CJK TC", "Songti TC", "PMingLiU", serif;',
    );
  });

  it('keeps Latin fonts first and uses Noto KR as ko CJK fallback', () => {
    const css = readProjectFile('src/index.css');

    expect(css).toContain('html[lang="ko"]');
    expect(css).toContain(
      '--font-sans: "Roboto", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;',
    );
    expect(css).toContain(
      '--font-display: "Faculty Glyphic", "Noto Serif KR", "AppleMyungjo", "Batang", serif;',
    );
  });

  it('imports only the needed Traditional Chinese and Korean font weights', () => {
    const main = readProjectFile('src/main.tsx');

    expect(main).toContain('@fontsource/noto-serif-tc/chinese-traditional-400.css');
    expect(main).toContain('@fontsource/noto-sans-tc/chinese-traditional-300.css');
    expect(main).toContain('@fontsource/noto-sans-tc/chinese-traditional-400.css');
    expect(main).toContain('@fontsource/noto-sans-tc/chinese-traditional-500.css');
    expect(main).toContain('@fontsource/noto-sans-tc/chinese-traditional-700.css');
    expect(main).not.toContain('@fontsource/noto-serif-tc/chinese-traditional-700.css');
    expect(main).toContain('@fontsource/noto-serif-kr/korean-400.css');
    expect(main).toContain('@fontsource/noto-sans-kr/korean-300.css');
    expect(main).toContain('@fontsource/noto-sans-kr/korean-400.css');
    expect(main).toContain('@fontsource/noto-sans-kr/korean-500.css');
    expect(main).toContain('@fontsource/noto-sans-kr/korean-700.css');
    expect(main).not.toContain('@fontsource/noto-serif-kr/korean-700.css');
  });

  it('keeps non-Chinese language names out of the zh-TW CJK fallback stack', () => {
    const css = readProjectFile('src/index.css');

    expect(css).toContain('html[lang="zh-TW"] .language-display-label');
    expect(css).toContain('font-family: "Roboto", system-ui, sans-serif;');
    expect(css).toContain('html[lang="zh-TW"] .language-display-label:lang(zh)');
    expect(css).toContain('font-family: var(--font-sans);');
  });

  it('slightly increases compact Traditional Chinese UI text sizes', () => {
    const css = readProjectFile('src/index.css');

    expect(css).toContain('html[lang="zh-TW"] :where(.text-xs)');
    expect(css).toContain('font-size: 0.8125rem !important;');
    expect(css).toContain('html[lang="zh-TW"] :where(.text-sm)');
    expect(css).toContain('font-size: 0.9375rem !important;');
    expect(css).toContain('html[lang="zh-TW"] :where(.text-base)');
    expect(css).toContain('font-size: 1.0625rem !important;');
  });

  it('slightly increases compact Korean UI text sizes', () => {
    const css = readProjectFile('src/index.css');

    expect(css).toContain('html[lang="ko"] :where(.text-\\[10px\\])');
    expect(css).toContain('font-size: 0.75rem !important;');
    expect(css).toContain('html[lang="ko"] :where(.text-\\[11px\\])');
    expect(css).toContain('font-size: 0.8125rem !important;');
    expect(css).toContain('html[lang="ko"] :where(.text-xs)');
    expect(css).toContain('font-size: 0.8125rem !important;');
    expect(css).toContain('html[lang="ko"] :where(.text-sm)');
    expect(css).toContain('font-size: 0.9375rem !important;');
    expect(css).toContain('html[lang="ko"] :where(.text-base)');
    expect(css).toContain('font-size: 1.0625rem !important;');
  });
});
