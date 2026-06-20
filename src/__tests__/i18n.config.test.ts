import { describe, expect, it } from 'vitest';

import {
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
  detectLanguageFromNavigator,
  getBilingualContentLanguage,
  getBilingualValue,
  resolveLanguage,
} from '@/i18n/config';

describe('i18n config', () => {
  it('resolves known locales to supported language codes', () => {
    expect(resolveLanguage('fr-CA')).toBe('fr');
    expect(resolveLanguage('de-DE')).toBe('de');
    expect(resolveLanguage('es-MX')).toBe('es');
    expect(resolveLanguage('pt-PT')).toBe('pt-BR');
    expect(resolveLanguage('it_IT')).toBe('it');
    expect(resolveLanguage('ru')).toBe('ru');
    expect(resolveLanguage('ko-KR')).toBe('ko');
    expect(resolveLanguage('zh')).toBe('zh-TW');
    expect(resolveLanguage('zh-TW')).toBe('zh-TW');
    expect(resolveLanguage('zh-Hant-TW')).toBe('zh-TW');
  });

  it('falls back to EN for unknown or empty locales', () => {
    expect(resolveLanguage(undefined)).toBe(FALLBACK_LANGUAGE);
    expect(resolveLanguage(null)).toBe(FALLBACK_LANGUAGE);
    expect(resolveLanguage('')).toBe(FALLBACK_LANGUAGE);
    expect(resolveLanguage('sv-SE')).toBe(FALLBACK_LANGUAGE);
  });

  it('uses the same resolution rules for browser locales', () => {
    expect(detectLanguageFromNavigator('fr-FR')).toBe('fr');
    expect(detectLanguageFromNavigator('es-MX')).toBe('es');
  });

  it('exposes the recommended supported language list', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'fr', 'de', 'es', 'pt-BR', 'it', 'ru', 'zh-TW', 'ko']);
  });

  it('maps app locales to legacy bilingual content locales', () => {
    expect(getBilingualContentLanguage('fr')).toBe('fr');
    expect(getBilingualContentLanguage('en')).toBe('en');
    expect(getBilingualContentLanguage('de')).toBe('en');
    expect(getBilingualContentLanguage('zh-TW')).toBe('en');
  });

  it('resolves bilingual values through the locale registry', () => {
    expect(getBilingualValue('fr', { en: 'Hello', fr: 'Salut' })).toBe('Salut');
    expect(getBilingualValue('de', { en: 'Hello', fr: 'Salut' })).toBe('Hello');
  });
});
