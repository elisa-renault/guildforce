/**
 * Utility functions for guild URL slugs
 * Format: /guild/region/server-slug/guild-name-slug
 */

/**
 * Convert a string to a URL-friendly slug
 */
export const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Trim hyphens from start/end
    .replace(/-+/g, '-'); // Replace multiple hyphens with single
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
