import { loadTranslations } from '../src/i18n/translations';
import { listSemanticKeys, resolveSemanticMessage } from '../src/i18n/semantic';

const flatten = (obj: Record<string, unknown>, p = '', a: Record<string, string> = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v as Record<string, unknown>, key, a);
    } else {
      a[key] = String(v ?? '');
    }
  }
  return a;
};

const allowedBrand = (v: string) => /^(Guildforce|Battle\.net|DPS|CSV|WoW|Discord|DAU|WAU|MAU|URL:?|Dreadful|Mystic|Venerated|Zenith|GM|slug)$/i.test(v.trim());

const run = async () => {
  const en = await loadTranslations('en');
  const ru = await loadTranslations('ru');
  const enF = flatten(en as unknown as Record<string, unknown>);
  const ruF = flatten(ru as unknown as Record<string, unknown>);

  const same: string[] = [];
  const enLike: Array<[string, string]> = [];
  for (const k of Object.keys(enF)) {
    if (!(k in ruF)) continue;
    if (ruF[k] === enF[k]) same.push(k);
    if (/[A-Za-z]/.test(ruF[k]) && !/[А-Яа-яЁё]/.test(ruF[k])) enLike.push([k, ruF[k]]);
  }

  const problematic = enLike.filter(([, v]) => !allowedBrand(v));

  const semKeys = listSemanticKeys();
  const translations = { auto: {} } as any;
  const semSame: string[] = [];
  const semEnLike: Array<[string, string]> = [];

  for (const key of semKeys) {
    const rv = resolveSemanticMessage({ key, language: 'ru', translations });
    const ev = resolveSemanticMessage({ key, language: 'en', translations });
    if (rv === ev) semSame.push(key);
    if (/[A-Za-z]/.test(rv) && !/[А-Яа-яЁё]/.test(rv) && !allowedBrand(rv)) semEnLike.push([key, rv]);
  }

  console.log(JSON.stringify({
    dict: {
      total: Object.keys(enF).length,
      sameAsEn: same.length,
      enLikeNonCyrillic: problematic.length,
      examplesSame: same.slice(0, 120),
      examplesEnLike: problematic.slice(0, 120),
    },
    semantic: {
      total: semKeys.length,
      sameAsEn: semSame.length,
      enLikeNonCyrillic: semEnLike.length,
      examplesSame: semSame.slice(0, 120),
      examplesEnLike: semEnLike.slice(0, 120),
    },
  }, null, 2));
};

run();
