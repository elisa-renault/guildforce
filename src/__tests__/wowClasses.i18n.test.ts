import { describe, expect, it } from 'vitest';

import {
  getLocalizedClassName,
  getLocalizedSpecName,
} from '@/data/wowClasses';

describe('wowClasses localized labels', () => {
  it('returns localized class names with fallback', () => {
    expect(getLocalizedClassName('warrior', 'fr')).toBe('Guerrier');
    expect(getLocalizedClassName('warrior', 'de')).toBe('Krieger');
    expect(getLocalizedClassName('shaman', 'ru')).toBe('Шаман');
  });

  it('resolves localized spec names including legacy aliases', () => {
    expect(getLocalizedSpecName('dk-frost', 'fr')).toBe('Givre');
    expect(getLocalizedSpecName('death-knight-frost', 'fr')).toBe('Givre');
    expect(getLocalizedSpecName('hunter-marksmanship', 'de')).toBe('Treffsicherheit');
    expect(getLocalizedSpecName('shaman-restoration', 'ru')).toBe('Исцеление');
    expect(getLocalizedSpecName('dh-havoc', 'ru')).toBe('Истребление');
  });

  it('supports extra spec labels that are not in current class data', () => {
    expect(getLocalizedSpecName('hunter-pack-leader', 'fr')).toBe('Chef de meute');
    expect(getLocalizedSpecName('druid-elune', 'en')).toBe('Elune');
  });

  it('keeps unknown identifiers readable', () => {
    expect(getLocalizedClassName('unknown-class', 'en')).toBe('unknown-class');
    expect(getLocalizedSpecName('unknown-spec', 'fr')).toBe('unknown-spec');
  });
});
