import { describe, expect, it } from 'vitest';

import {
  getLocalizedClassName,
  getLocalizedSpecName,
} from '@/data/wowClasses';

describe('wowClasses localized labels', () => {
  it('returns localized class names with fallback', () => {
    expect(getLocalizedClassName('warrior', 'fr')).toBe('Guerrier');
    expect(getLocalizedClassName('warrior', 'de')).toBe('Krieger');
    expect(getLocalizedClassName('shaman', 'it')).toBe('Sciamano');
    expect(getLocalizedClassName('hunter', 'it')).toBe('Cacciatore');
    expect(getLocalizedClassName('demon-hunter', 'it')).toBe('Cacciatore di Demoni');
    expect(getLocalizedClassName('shaman', 'ru')).toBe('Шаман');
    expect(getLocalizedClassName('death-knight', 'es')).toBe('Caballero de la Muerte');
    expect(getLocalizedClassName('demon-hunter', 'es')).toBe('Cazador de demonios');
    expect(getLocalizedClassName('evoker', 'pt-BR')).toBe('Conjurante');
    expect(getLocalizedClassName('demon-hunter', 'pt-BR')).toBe('Caçador de Demônios');
    expect(getLocalizedClassName('warlock', 'pt-BR')).toBe('Bruxo');
    expect(getLocalizedClassName('warrior', 'zh-TW')).toBe('戰士');
    expect(getLocalizedClassName('demon-hunter', 'zh-TW')).toBe('惡魔獵人');
    expect(getLocalizedClassName('evoker', 'zh-TW')).toBe('喚能師');
    expect(getLocalizedClassName('warrior', 'ko')).toBe('전사');
    expect(getLocalizedClassName('demon-hunter', 'ko')).toBe('악마사냥꾼');
    expect(getLocalizedClassName('evoker', 'ko')).toBe('기원사');
  });

  it('resolves localized spec names including legacy aliases', () => {
    expect(getLocalizedSpecName('dk-frost', 'fr')).toBe('Givre');
    expect(getLocalizedSpecName('death-knight-frost', 'fr')).toBe('Givre');
    expect(getLocalizedSpecName('hunter-marksmanship', 'de')).toBe('Treffsicherheit');
    expect(getLocalizedSpecName('shaman-elemental', 'it')).toBe('Elementale');
    expect(getLocalizedSpecName('hunter-beast-mastery', 'it')).toBe('Affinità Animale');
    expect(getLocalizedSpecName('dh-devourer', 'it')).toBe('Divoratore');
    expect(getLocalizedSpecName('shaman-restoration', 'ru')).toBe('Исцеление');
    expect(getLocalizedSpecName('dh-havoc', 'ru')).toBe('Истребление');
    expect(getLocalizedSpecName('warrior-arms', 'es')).toBe('Armas');
    expect(getLocalizedSpecName('paladin-retribution', 'es')).toBe('Reprensión');
    expect(getLocalizedSpecName('hunter-marksmanship', 'es')).toBe('Puntería');
    expect(getLocalizedSpecName('evoker-augmentation', 'es')).toBe('Aumento');
    expect(getLocalizedSpecName('hunter-beast-mastery', 'pt-BR')).toBe('Domínio das Feras');
    expect(getLocalizedSpecName('rogue-subtlety', 'pt-BR')).toBe('Subterfúgio');
    expect(getLocalizedSpecName('evoker-augmentation', 'pt-BR')).toBe('Aumentação');
    expect(getLocalizedSpecName('hunter-beast-mastery', 'zh-TW')).toBe('野獸控制');
    expect(getLocalizedSpecName('dk-blood', 'zh-TW')).toBe('血魄');
    expect(getLocalizedSpecName('evoker-augmentation', 'zh-TW')).toBe('強化');
    expect(getLocalizedSpecName('warrior-arms', 'ko')).toBe('무기');
    expect(getLocalizedSpecName('paladin-retribution', 'ko')).toBe('징벌');
    expect(getLocalizedSpecName('hunter-beast-mastery', 'ko')).toBe('야수');
    expect(getLocalizedSpecName('dk-blood', 'ko')).toBe('혈기');
    expect(getLocalizedSpecName('evoker-augmentation', 'ko')).toBe('증강');
  });

  it('supports extra spec labels that are not in current class data', () => {
    expect(getLocalizedSpecName('hunter-pack-leader', 'fr')).toBe('Chef de meute');
    expect(getLocalizedSpecName('hunter-pack-leader', 'es')).toBe('Líder de la manada');
    expect(getLocalizedSpecName('hunter-pack-leader', 'pt-BR')).toBe('Líder da Matilha');
    expect(getLocalizedSpecName('hunter-pack-leader', 'zh-TW')).toBe('獸群領袖');
    expect(getLocalizedSpecName('hunter-pack-leader', 'ko')).toBe('무리의 지도자');
    expect(getLocalizedSpecName('druid-elune', 'en')).toBe('Elune');
  });

  it('keeps unknown identifiers readable', () => {
    expect(getLocalizedClassName('unknown-class', 'en')).toBe('unknown-class');
    expect(getLocalizedSpecName('unknown-spec', 'fr')).toBe('unknown-spec');
  });
});
