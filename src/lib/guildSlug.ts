/**
 * Utility functions for guild URL slugs
 * Format: /guild/region/server-slug/guild-name-slug
 */

/**
 * Convert a string to a URL-friendly slug
 */
export const toSlug = (str: string): string => {
  // Keep Unicode letters/numbers so non-Latin guild names (e.g. Cyrillic) produce a non-empty slug.
  // Browsers will percent-encode the path segment as needed.
  return str
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '') // Remove combining marks (accents/diacritics)
    .replace(/['’]/g, '') // Drop apostrophes
    .replace(/[\s_]+/g, '-') // Whitespace/underscores to hyphen
    .replace(/[^\p{L}\p{N}-]+/gu, '-') // Non letters/numbers to hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
};

/**
 * Generate guild URL path from region, server and name
 */
export const getGuildPath = (region: string, server: string, name: string): string => {
  return `/guild/${toSlug(region)}/${toSlug(server)}/${toSlug(name)}`;
};

/**
 * Generate guild wishes URL path from region, server and name
 */
export const getGuildWishesPath = (region: string, server: string, name: string): string => {
  return `/guild/${toSlug(region)}/${toSlug(server)}/${toSlug(name)}/wishes`;
};

/**
 * Generate guild roster URL path from region, server and name
 */
export const getGuildRosterPath = (region: string, server: string, name: string): string => {
  return `/guild/${toSlug(region)}/${toSlug(server)}/${toSlug(name)}/roster`;
};

/**
 * Generate guild member URL path from region, server, guild name and user id
 */
export const getGuildMemberPath = (region: string, server: string, name: string, memberId: string): string => {
  return `${getGuildPath(region, server, name)}/member/${memberId}`;
};

/**
 * Generate guild settings URL path from region, server and name
 */
export const getGuildSettingsPath = (region: string, server: string, name: string): string => {
  return `/guild/${toSlug(region)}/${toSlug(server)}/${toSlug(name)}/settings`;
};
