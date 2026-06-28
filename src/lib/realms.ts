const REALM_DISPLAY_NAMES: Record<string, string> = {
  archimonde: 'Archimonde',
  dalaran: 'Dalaran',
  garona: 'Garona',
  hyjal: 'Hyjal',
  kaelthas: "Kael'Thas",
  'confrerie du thorium': 'Confrérie du Thorium',
  'les clairvoyants': 'Les Clairvoyants',
  'marecage de zangar': 'Marécage de Zangar',
};

const normalizeRealmDisplayKey = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/['\u2019]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const formatRealmWord = (word: string) => {
  if (!word) return word;
  return word
    .split("'")
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part)
    .join("'");
};

export const formatRealmDisplayName = (rawName?: string | null, rawSlug?: string | null) => {
  const nameKey = normalizeRealmDisplayKey(rawName);
  const slugKey = normalizeRealmDisplayKey(rawSlug);
  const key = nameKey || slugKey;
  if (!key) return '';

  const compactKey = key.replace(/\s+/g, '');
  const mappedName = REALM_DISPLAY_NAMES[key] || REALM_DISPLAY_NAMES[compactKey];
  if (mappedName) return mappedName;

  return key
    .split(' ')
    .map(formatRealmWord)
    .join(' ');
};
