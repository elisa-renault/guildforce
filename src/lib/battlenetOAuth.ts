/**
 * Battle.net OAuth utilities
 * Centralizes common OAuth logic for Auth, GuildList, and BattleNetConnect
 */

export type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

export const REGION_LABELS: Record<BattleNetRegion, string> = {
  eu: 'Europe',
  us: 'Americas',
  kr: 'Korea',
  tw: 'Taiwan',
};

interface OAuthState {
  state: string;
  mode?: string;
  region?: string;
}

/**
 * Parse the OAuth state from URL parameter
 * Blizzard returns state as JSON string or plain string depending on context
 */
export function parseOAuthState(stateParam: string): OAuthState {
  try {
    return JSON.parse(stateParam);
  } catch {
    return { state: stateParam, mode: 'login' };
  }
}

/**
 * Validate OAuth state against stored state
 * Returns true if valid or if no stored state (fallback)
 */
export function validateOAuthState(parsed: OAuthState, storedState: string | null): boolean {
  if (!storedState) return true;
  return parsed.state === storedState;
}

/**
 * Store OAuth params before redirecting to Battle.net
 */
export function storeOAuthParams(state: string, region: BattleNetRegion): void {
  localStorage.setItem('battlenet_state', state);
  localStorage.setItem('battlenet_region', region);
}

/**
 * Get stored OAuth params after returning from Battle.net
 */
export function getStoredOAuthParams(): { state: string | null; region: BattleNetRegion } {
  const state = localStorage.getItem('battlenet_state');
  const region = (localStorage.getItem('battlenet_region') as BattleNetRegion) || 'eu';
  return { state, region };
}

/**
 * Clean up OAuth params from localStorage and URL
 */
export function cleanupOAuthParams(): void {
  localStorage.removeItem('battlenet_state');
  localStorage.removeItem('battlenet_region');
  
  // Clean URL if needed
  const url = new URL(window.location.href);
  if (url.searchParams.has('code') || url.searchParams.has('state')) {
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, document.title, url.pathname);
  }
}

/**
 * Check if current URL has OAuth callback params
 */
export function hasOAuthCallback(): boolean {
  const params = new URLSearchParams(window.location.search);
  return !!(params.get('code') && params.get('state'));
}

/**
 * Get OAuth callback params from URL
 */
export function getOAuthCallbackParams(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  
  if (code && state) {
    return { code, state };
  }
  return null;
}

/**
 * Generate redirect URI based on current location
 */
export function getRedirectUri(path?: string): string {
  const base = window.location.origin;
  return path ? `${base}${path}` : `${base}${window.location.pathname}`;
}
