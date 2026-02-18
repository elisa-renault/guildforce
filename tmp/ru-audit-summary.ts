import { loadTranslations } from '../src/i18n/translations';
import { listSemanticKeys, resolveSemanticMessage } from '../src/i18n/semantic';

const flatten = (obj: Record<string, unknown>, p = '', a: Record<string, string> = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v as Record<string, unknown>, key, a);
    else a[key] = String(v ?? '');
  }
  return a;
};

const isLatinOnly = (v: string) => /[A-Za-z]/.test(v) && !/[А-Яа-яЁё]/.test(v);
const allowed = (v: string) => /^(Guildforce|Battle\.net|DPS|CSV|WoW|Discord|DAU|WAU|MAU|URL:?|Dreadful|Mystic|Venerated|Zenith|GM|slug|Email|BattleTag|Name#1234)$/i.test(v.trim());

const run = async () => {
  const en = flatten(await loadTranslations('en') as any);
  const ru = flatten(await loadTranslations('ru') as any);
  const same = Object.keys(en).filter((k) => ru[k] === en[k]);
  const sameNonAuto = same.filter((k) => !k.startsWith('auto.'));
  const sameAuto = same.filter((k) => k.startsWith('auto.'));
  const latinNonAuto = Object.entries(ru).filter(([k,v]) => !k.startsWith('auto.') && isLatinOnly(v) && !allowed(v)).map(([k,v])=>[k,v]);
  const latinAuto = Object.entries(ru).filter(([k,v]) => k.startsWith('auto.') && isLatinOnly(v) && !allowed(v)).map(([k,v])=>[k,v]);

  const semKeys = listSemanticKeys();
  const translations = { auto: {} } as any;
  const semSame = semKeys.filter((key) => resolveSemanticMessage({ key, language: 'ru', translations }) === resolveSemanticMessage({ key, language: 'en', translations }));
  const semSameNonAutoish = semSame.filter((k) => !k.includes('url_label'));

  console.log(JSON.stringify({
    dict: {
      sameTotal: same.length,
      sameNonAuto: sameNonAuto.length,
      sameAuto: sameAuto.length,
      sameNonAutoExamples: sameNonAuto.slice(0,80),
      latinNonAuto: latinNonAuto.length,
      latinNonAutoExamples: latinNonAuto.slice(0,60),
      latinAuto: latinAuto.length,
      latinAutoExamples: latinAuto.slice(0,30),
    },
    semantic: {
      sameTotal: semSame.length,
      sameLikelyUntranslated: semSameNonAutoish.length,
      sameExamples: semSame.slice(0,120),
    }
  }, null, 2));
};

run();
