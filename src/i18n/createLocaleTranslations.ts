import type { Translations } from './translations';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends Record<string, unknown>
      ? DeepPartial<T[K]>
      : T[K];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = <T>(base: T, overrides: DeepPartial<T>): T => {
  if (!isPlainObject(base) || !isPlainObject(overrides)) {
    return overrides as T;
  }

  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue;

    const baseValue = merged[key];
    merged[key] =
      isPlainObject(baseValue) && isPlainObject(value)
        ? deepMerge(baseValue, value as DeepPartial<typeof baseValue>)
        : value;
  }

  return merged as T;
};

export const createLocaleTranslations = (
  base: Translations,
  overrides: DeepPartial<Translations>,
): Translations => deepMerge(base, overrides);

