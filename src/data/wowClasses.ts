// WoW Classes and Specializations data
// Centralized for easy updates
import { SUPPORTED_LANGUAGES, getBilingualContentLanguage, type Language } from '@/i18n/config';

export type Role = 'tank' | 'healer' | 'dps';

export type RangeType = 'melee' | 'ranged';

type LocalizedLabel = { en: string; fr: string } & Partial<Record<Language, string>>;

const withLanguageFallbacks = (label: LocalizedLabel): Record<Language, string> => {
  const next = { ...label } as Record<Language, string>;

  for (const language of SUPPORTED_LANGUAGES) {
    if (next[language]) continue;
    next[language] = next[getBilingualContentLanguage(language)];
  }

  return next;
};

export interface Specialization {
  id: string;
  name: LocalizedLabel;
  role: Role;
  range: RangeType;
}

export interface WoWClass {
  id: string;
  name: LocalizedLabel;
  color: string; // Tailwind class color
  specs: Specialization[];
}

export const wowClasses: WoWClass[] = [
  {
    id: 'warrior',
    name: { en: 'Warrior', fr: 'Guerrier', de: 'Krieger', es: 'Guerrero', 'pt-BR': 'Guerreiro', it: 'Guerriero', ru: 'Воин', 'zh-TW': '戰士', ko: '전사' },
    color: 'class-warrior',
    specs: [
      { id: 'warrior-arms', name: { en: 'Arms', fr: 'Armes', de: 'Waffen', es: 'Armas', 'pt-BR': 'Armas', it: 'Armi', ru: 'Оружие', 'zh-TW': '武器', ko: '무기' }, role: 'dps', range: 'melee' },
      { id: 'warrior-fury', name: { en: 'Fury', fr: 'Fureur', de: 'Furor', es: 'Furia', 'pt-BR': 'Fúria', it: 'Furia', ru: 'Неистовство', 'zh-TW': '狂怒', ko: '분노' }, role: 'dps', range: 'melee' },
      { id: 'warrior-protection', name: { en: 'Protection', fr: 'Protection', de: 'Schutz', es: 'Protección', 'pt-BR': 'Proteção', it: 'Protezione', ru: 'Защита', 'zh-TW': '防護', ko: '방어' }, role: 'tank', range: 'melee' },
    ],
  },
  {
    id: 'paladin',
    name: { en: 'Paladin', fr: 'Paladin', de: 'Paladin', es: 'Paladín', 'pt-BR': 'Paladino', it: 'Paladino', ru: 'Паладин', 'zh-TW': '聖騎士', ko: '성기사'},
    color: 'class-paladin',
    specs: [
      { id: 'paladin-holy', name: { en: 'Holy', fr: 'Sacré', de: 'Heilig', es: 'Sagrado', 'pt-BR': 'Sagrado', it: 'Sacro', ru: 'Свет', 'zh-TW': '神聖', ko: '신성'}, role: 'healer', range: 'ranged' },
      { id: 'paladin-protection', name: { en: 'Protection', fr: 'Protection', de: 'Schutz', es: 'Protección', 'pt-BR': 'Proteção', it: 'Protezione', ru: 'Защита', 'zh-TW': '防護', ko: '보호'}, role: 'tank', range: 'melee' },
      { id: 'paladin-retribution', name: { en: 'Retribution', fr: 'Vindicte', de: 'Vergeltung', es: 'Reprensión', 'pt-BR': 'Retribuição', it: 'Castigo', ru: 'Воздаяние', 'zh-TW': '懲戒', ko: '징벌'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'hunter',
    name: { en: 'Hunter', fr: 'Chasseur', de: 'J\u00e4ger', es: 'Cazador', 'pt-BR': 'Caçador', it: 'Cacciatore', ru: 'Охотник', 'zh-TW': '獵人', ko: '사냥꾼'},
    color: 'class-hunter',
    specs: [
      { id: 'hunter-beast-mastery', name: { en: 'Beast Mastery', fr: 'Maîtrise des bêtes', de: 'Tierherrschaft', es: 'Bestias', 'pt-BR': 'Domínio das Feras', it: 'Affinità Animale', ru: 'Повелитель зверей', 'zh-TW': '野獸控制', ko: '야수'}, role: 'dps', range: 'ranged' },
      { id: 'hunter-marksmanship', name: { en: 'Marksmanship', fr: 'Précision', de: 'Treffsicherheit', es: 'Puntería', 'pt-BR': 'Precisão', it: 'Precisione di Tiro', ru: 'Стрельба', 'zh-TW': '射擊', ko: '사격'}, role: 'dps', range: 'ranged' },
      { id: 'hunter-survival', name: { en: 'Survival', fr: 'Survie', de: '\u00dcberleben', es: 'Supervivencia', 'pt-BR': 'Sobrevivência', it: 'Sopravvivenza', ru: 'Выживание', 'zh-TW': '生存', ko: '생존'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'rogue',
    name: { en: 'Rogue', fr: 'Voleur', de: 'Schurke', es: 'Pícaro', 'pt-BR': 'Ladino', it: 'Ladro', ru: 'Разбойник', 'zh-TW': '盜賊', ko: '도적'},
    color: 'class-rogue',
    specs: [
      { id: 'rogue-assassination', name: { en: 'Assassination', fr: 'Assassinat', de: 'Meucheln', es: 'Asesinato', 'pt-BR': 'Assassinato', it: 'Assassinio', ru: 'Ликвидация', 'zh-TW': '刺殺', ko: '암살'}, role: 'dps', range: 'melee' },
      { id: 'rogue-outlaw', name: { en: 'Outlaw', fr: 'Hors-la-loi', de: 'Gesetzlosigkeit', es: 'Forajido', 'pt-BR': 'Fora da Lei', it: 'Fuorilegge', ru: 'Головорез', 'zh-TW': '暴徒', ko: '무법'}, role: 'dps', range: 'melee' },
      { id: 'rogue-subtlety', name: { en: 'Subtlety', fr: 'Finesse', de: 'T\u00e4uschung', es: 'Sutileza', 'pt-BR': 'Subterfúgio', it: 'Scaltrezza', ru: 'Скрытность', 'zh-TW': '敏銳', ko: '잠행'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'priest',
    name: { en: 'Priest', fr: 'Prêtre', de: 'Priester', es: 'Sacerdote', 'pt-BR': 'Sacerdote', it: 'Sacerdote', ru: 'Жрец', 'zh-TW': '牧師', ko: '사제'},
    color: 'class-priest',
    specs: [
      { id: 'priest-discipline', name: { en: 'Discipline', fr: 'Discipline', de: 'Disziplin', es: 'Disciplina', 'pt-BR': 'Disciplina', it: 'Disciplina', ru: 'Послушание', 'zh-TW': '戒律', ko: '수양'}, role: 'healer', range: 'ranged' },
      { id: 'priest-holy', name: { en: 'Holy', fr: 'Sacré', de: 'Heilig', es: 'Sagrado', 'pt-BR': 'Sagrado', it: 'Sacro', ru: 'Свет', 'zh-TW': '神聖', ko: '신성'}, role: 'healer', range: 'ranged' },
      { id: 'priest-shadow', name: { en: 'Shadow', fr: 'Ombre', de: 'Schatten', es: 'Sombras', 'pt-BR': 'Sombra', it: 'Ombra', ru: 'Тьма', 'zh-TW': '暗影', ko: '암흑'}, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'death-knight',
    name: { en: 'Death Knight', fr: 'Chevalier de la mort', de: 'Todesritter', es: 'Caballero de la Muerte', 'pt-BR': 'Cavaleiro da Morte', it: 'Cavaliere della Morte', ru: 'Рыцарь смерти', 'zh-TW': '死亡騎士', ko: '죽음의 기사'},
    color: 'class-death-knight',
    specs: [
      { id: 'dk-blood', name: { en: 'Blood', fr: 'Sang', de: 'Blut', es: 'Sangre', 'pt-BR': 'Sangue', it: 'Sangue', ru: 'Кровь', 'zh-TW': '血魄', ko: '혈기'}, role: 'tank', range: 'melee' },
      { id: 'dk-frost', name: { en: 'Frost', fr: 'Givre', de: 'Frost', es: 'Escarcha', 'pt-BR': 'Gelo', it: 'Gelo', ru: 'Лед', 'zh-TW': '冰霜', ko: '냉기'}, role: 'dps', range: 'melee' },
      { id: 'dk-unholy', name: { en: 'Unholy', fr: 'Impie', de: 'Unheilig', es: 'Profano', 'pt-BR': 'Profano', it: 'Empietà', ru: 'Нечестивость', 'zh-TW': '穢邪', ko: '부정'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'shaman',
    name: { en: 'Shaman', fr: 'Chaman', de: 'Schamane', es: 'Chamán', 'pt-BR': 'Xamã', it: 'Sciamano', ru: 'Шаман', 'zh-TW': '薩滿', ko: '주술사'},
    color: 'class-shaman',
    specs: [
      { id: 'shaman-elemental', name: { en: 'Elemental', fr: 'Élémentaire', de: 'Elementar', es: 'Elemental', 'pt-BR': 'Elemental', it: 'Elementale', ru: 'Стихии', 'zh-TW': '元素', ko: '정기'}, role: 'dps', range: 'ranged' },
      { id: 'shaman-enhancement', name: { en: 'Enhancement', fr: 'Amélioration', de: 'Verst\u00e4rkung', es: 'Mejora', 'pt-BR': 'Aperfeiçoamento', it: 'Potenziamento', ru: 'Совершенствование', 'zh-TW': '增強', ko: '고양'}, role: 'dps', range: 'melee' },
      { id: 'shaman-restoration', name: { en: 'Restoration', fr: 'Restauration', de: 'Wiederherstellung', es: 'Restauración', 'pt-BR': 'Restauração', it: 'Rigenerazione', ru: 'Исцеление', 'zh-TW': '恢復', ko: '복원'}, role: 'healer', range: 'ranged' },
    ],
  },
  {
    id: 'mage',
    name: { en: 'Mage', fr: 'Mage', de: 'Magier', es: 'Mago', 'pt-BR': 'Mago', it: 'Mago', ru: 'Маг', 'zh-TW': '法師', ko: '마법사'},
    color: 'class-mage',
    specs: [
      { id: 'mage-arcane', name: { en: 'Arcane', fr: 'Arcanes', de: 'Arkan', es: 'Arcano', 'pt-BR': 'Arcano', it: 'Arcano', ru: 'Тайная магия', 'zh-TW': '秘法', ko: '비전'}, role: 'dps', range: 'ranged' },
      { id: 'mage-fire', name: { en: 'Fire', fr: 'Feu', de: 'Feuer', es: 'Fuego', 'pt-BR': 'Fogo', it: 'Fuoco', ru: 'Огонь', 'zh-TW': '火焰', ko: '화염'}, role: 'dps', range: 'ranged' },
      { id: 'mage-frost', name: { en: 'Frost', fr: 'Givre', de: 'Frost', es: 'Escarcha', 'pt-BR': 'Gelo', it: 'Gelo', ru: 'Лед', 'zh-TW': '冰霜', ko: '냉기'}, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'warlock',
    name: { en: 'Warlock', fr: 'Démoniste', de: 'Hexenmeister', es: 'Brujo', 'pt-BR': 'Bruxo', it: 'Stregone', ru: 'Чернокнижник', 'zh-TW': '術士', ko: '흑마법사'},
    color: 'class-warlock',
    specs: [
      { id: 'warlock-affliction', name: { en: 'Affliction', fr: 'Affliction', de: 'Gebrechen', es: 'Aflicción', 'pt-BR': 'Suplício', it: 'Afflizione', ru: 'Колдовство', 'zh-TW': '痛苦', ko: '고통'}, role: 'dps', range: 'ranged' },
      { id: 'warlock-demonology', name: { en: 'Demonology', fr: 'Démonologie', de: 'D\u00e4monologie', es: 'Demonología', 'pt-BR': 'Demonologia', it: 'Demonologia', ru: 'Демонология', 'zh-TW': '惡魔學識', ko: '악마'}, role: 'dps', range: 'ranged' },
      { id: 'warlock-destruction', name: { en: 'Destruction', fr: 'Destruction', de: 'Zerst\u00f6rung', es: 'Destrucción', 'pt-BR': 'Destruição', it: 'Distruzione', ru: 'Разрушение', 'zh-TW': '毀滅', ko: '파괴'}, role: 'dps', range: 'ranged' },
    ],
  },
  {
    id: 'monk',
    name: { en: 'Monk', fr: 'Moine', de: 'M\u00f6nch', es: 'Monje', 'pt-BR': 'Monge', it: 'Monaco', ru: 'Монах', 'zh-TW': '武僧', ko: '수도사'},
    color: 'class-monk',
    specs: [
      { id: 'monk-brewmaster', name: { en: 'Brewmaster', fr: 'Maître brasseur', de: 'Braumeister', es: 'Maestro cervecero', 'pt-BR': 'Mestre Cervejeiro', it: 'Mastro Birraio', ru: 'Хмелевар', 'zh-TW': '釀酒', ko: '양조'}, role: 'tank', range: 'melee' },
      { id: 'monk-mistweaver', name: { en: 'Mistweaver', fr: 'Tisse-brume', de: 'Nebelwirker', es: 'Tejedor de niebla', 'pt-BR': 'Tecelão da Névoa', it: 'Misticismo', ru: 'Ткач туманов', 'zh-TW': '織霧', ko: '운무'}, role: 'healer', range: 'ranged' },
      { id: 'monk-windwalker', name: { en: 'Windwalker', fr: 'Marche-vent', de: 'Windl\u00e4ufer', es: 'Viajero del viento', 'pt-BR': 'Andarilho do Vento', it: 'Impeto', ru: 'Танцующий с ветром', 'zh-TW': '御風', ko: '풍운'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'druid',
    name: { en: 'Druid', fr: 'Druide', de: 'Druide', es: 'Druida', 'pt-BR': 'Druida', it: 'Druido', ru: 'Друид', 'zh-TW': '德魯伊', ko: '드루이드'},
    color: 'class-druid',
    specs: [
      { id: 'druid-balance', name: { en: 'Balance', fr: 'Équilibre', de: 'Gleichgewicht', es: 'Equilibrio', 'pt-BR': 'Equilíbrio', it: 'Equilibrio', ru: 'Баланс', 'zh-TW': '平衡', ko: '조화'}, role: 'dps', range: 'ranged' },
      { id: 'druid-feral', name: { en: 'Feral', fr: 'Féral', de: 'Wildheit', es: 'Feral', 'pt-BR': 'Feral', it: 'Aggressore Ferino', ru: 'Сила зверя', 'zh-TW': '野性', ko: '야성'}, role: 'dps', range: 'melee' },
      { id: 'druid-guardian', name: { en: 'Guardian', fr: 'Gardien', de: 'W\u00e4chter', es: 'Guardián', 'pt-BR': 'Guardião', it: 'Guardiano Ferino', ru: 'Страж', 'zh-TW': '守護者', ko: '수호'}, role: 'tank', range: 'melee' },
      { id: 'druid-restoration', name: { en: 'Restoration', fr: 'Restauration', de: 'Wiederherstellung', es: 'Restauración', 'pt-BR': 'Restauração', it: 'Rigenerazione', ru: 'Исцеление', 'zh-TW': '恢復', ko: '회복'}, role: 'healer', range: 'ranged' },
    ],
  },
  {
    id: 'demon-hunter',
    name: { en: 'Demon Hunter', fr: 'Chasseur de démons', de: 'D\u00e4monenj\u00e4ger', es: 'Cazador de demonios', 'pt-BR': 'Caçador de Demônios', it: 'Cacciatore di Demoni', ru: 'Охотник на демонов', 'zh-TW': '惡魔獵人', ko: '악마사냥꾼'},
    color: 'class-demon-hunter',
    specs: [
      { id: 'dh-havoc', name: { en: 'Havoc', fr: 'Dévastation', de: 'Verw\u00fcstung', es: 'Devastación', 'pt-BR': 'Devastação', it: 'Rovina', ru: 'Истребление', 'zh-TW': '災虐', ko: '파멸'}, role: 'dps', range: 'melee' },
      { id: 'dh-vengeance', name: { en: 'Vengeance', fr: 'Vengeance', de: 'Rachsucht', es: 'Venganza', 'pt-BR': 'Vingança', it: 'Vendetta', ru: 'Месть', 'zh-TW': '復仇', ko: '복수'}, role: 'tank', range: 'melee' },
      { id: 'dh-devourer', name: { en: 'Devourer', fr: 'Dévoreur', de: 'Verschlinger', es: 'Devorador', 'pt-BR': 'Devorador', it: 'Divoratore', ru: 'Пожиратель', 'zh-TW': '吞噬者', ko: '포식자'}, role: 'dps', range: 'melee' },
    ],
  },
  {
    id: 'evoker',
    name: { en: 'Evoker', fr: 'Évocateur', de: 'Rufer', es: 'Evocador', 'pt-BR': 'Conjurante', it: 'Evocatore', ru: 'Пробудитель', 'zh-TW': '喚能師', ko: '기원사'},
    color: 'class-evoker',
    specs: [
      { id: 'evoker-devastation', name: { en: 'Devastation', fr: 'Dévastation', de: 'Verheerung', es: 'Devastación', 'pt-BR': 'Devastação', it: 'Devastazione', ru: 'Опустошение', 'zh-TW': '破滅', ko: '황폐'}, role: 'dps', range: 'ranged' },
      { id: 'evoker-preservation', name: { en: 'Preservation', fr: 'Préservation', de: 'Bewahrung', es: 'Preservación', 'pt-BR': 'Preservação', it: 'Preservazione', ru: 'Сохранение', 'zh-TW': '護存', ko: '보존'}, role: 'healer', range: 'ranged' },
      { id: 'evoker-augmentation', name: { en: 'Augmentation', fr: 'Augmentation', de: 'Verst\u00e4rkung', es: 'Aumento', 'pt-BR': 'Aumentação', it: 'Potenziamento', ru: 'Насыщение', 'zh-TW': '強化', ko: '증강'}, role: 'dps', range: 'ranged' },
    ],
  },
];

for (const wowClass of wowClasses) {
  wowClass.name = withLanguageFallbacks(wowClass.name);
  for (const spec of wowClass.specs) {
    spec.name = withLanguageFallbacks(spec.name);
  }
}

// Helper functions
export const getClassById = (classId: string): WoWClass | undefined => {
  return wowClasses.find(c => c.id === classId);
};

const LEGACY_SPEC_ID_ALIASES: Record<string, string> = {
  'death-knight-blood': 'dk-blood',
  'death-knight-frost': 'dk-frost',
  'death-knight-unholy': 'dk-unholy',
  'demon-hunter-havoc': 'dh-havoc',
  'demon-hunter-vengeance': 'dh-vengeance',
  'demon-hunter-devourer': 'dh-devourer',
};

const EXTRA_SPEC_LABELS: Record<string, LocalizedLabel> = {
  'hunter-pack-leader': { en: 'Pack Leader', fr: 'Chef de meute', de: 'Rudelf\u00fchrer', es: 'Líder de la manada', 'pt-BR': 'Líder da Matilha', it: 'Capobranco', ru: 'Вожак стаи', 'zh-TW': '獸群領袖', ko: '무리의 지도자'},
  'druid-elune': { en: 'Elune', fr: 'Elune', de: 'Elune', es: 'Elune', 'pt-BR': 'Eluna', ru: 'Элуна', 'zh-TW': '伊露恩', ko: '엘룬'},
};

const normalizeSpecId = (specId: string): string => LEGACY_SPEC_ID_ALIASES[specId] || specId;

export const getSpecById = (specId: string): Specialization | undefined => {
  const normalizedSpecId = normalizeSpecId(specId);

  for (const wowClass of wowClasses) {
    const spec = wowClass.specs.find(s => s.id === normalizedSpecId);
    if (spec) return spec;
  }
  return undefined;
};

export const getClassBySpecId = (specId: string): WoWClass | undefined => {
  return wowClasses.find(c => c.specs.some(s => s.id === specId));
};

export const getRolesFromSpecs = (specIds: string[]): Role[] => {
  const roles = new Set<Role>();
  for (const specId of specIds) {
    const spec = getSpecById(specId);
    if (spec) roles.add(spec.role);
  }
  return Array.from(roles);
};

export const getRangesFromSpecs = (specIds: string[]): RangeType[] => {
  const ranges = new Set<RangeType>();
  for (const specId of specIds) {
    const spec = getSpecById(specId);
    if (spec) {
      ranges.add(spec.range);
    }
  }
  return Array.from(ranges);
};

const getLocalizedLabel = (label: Partial<Record<Language, string>>, language: Language, fallback: string): string =>
  label[language] || label.en || fallback;

export const getLocalizedClassName = (classId: string, language: Language): string => {
  const wowClass = getClassById(classId);
  if (!wowClass) return classId;
  return getLocalizedLabel(wowClass.name, language, classId);
};

export const getLocalizedSpecName = (specId: string, language: Language): string => {
  const spec = getSpecById(specId);
  if (spec) return getLocalizedLabel(spec.name, language, specId);

  const extra = EXTRA_SPEC_LABELS[specId];
  if (extra) {
    const normalized = withLanguageFallbacks(extra);
    return getLocalizedLabel(normalized, language, specId);
  }

  return specId;
};
