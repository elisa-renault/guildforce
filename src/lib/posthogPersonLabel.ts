const POSTHOG_PERSON_ADJECTIVES = [
  'Amber',
  'Birch',
  'Cobalt',
  'Drift',
  'Ember',
  'Fable',
  'Granite',
  'Harbor',
  'Indigo',
  'Juniper',
  'Lumen',
  'Meridian',
  'Nova',
  'Obsidian',
  'Prism',
  'Quartz',
] as const;

const POSTHOG_PERSON_NOUNS = [
  'Atlas',
  'Beacon',
  'Cipher',
  'Delta',
  'Echo',
  'Forge',
  'Glade',
  'Harbor',
  'Ion',
  'Junction',
  'Keystone',
  'Lantern',
  'Mosaic',
  'Nexus',
  'Orbit',
  'Prism',
] as const;

const hashUserId = (userId: string) =>
  Array.from(userId).reduce((acc, char) => (Math.imul(acc, 31) + char.charCodeAt(0)) >>> 0, 0);

export const getPostHogPersonLabel = (userId: string) => {
  const hash = hashUserId(userId);
  const compactId = userId.replace(/-/g, '').slice(0, 6) || 'unknown';
  const adjective = POSTHOG_PERSON_ADJECTIVES[hash % POSTHOG_PERSON_ADJECTIVES.length];
  const noun =
    POSTHOG_PERSON_NOUNS[
      Math.floor(hash / POSTHOG_PERSON_ADJECTIVES.length) % POSTHOG_PERSON_NOUNS.length
    ];

  return `${adjective} ${noun} ${compactId}`;
};
