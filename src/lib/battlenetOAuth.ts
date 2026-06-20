/**
 * Battle.net OAuth utilities
 * Centralizes common OAuth logic for Auth, GuildList, and BattleNetConnect
 */

import { safeStorage } from '@/lib/safeStorage';

// =============================================================================
// TYPES AND CONSTANTS
// =============================================================================

export type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

export const REGION_LABELS: Record<BattleNetRegion, string> = {
  eu: 'Europe',
  us: 'Americas',
  kr: 'Korea',
  tw: 'Taiwan',
};

const LOCALIZED_REGION_LABELS: Partial<Record<string, Record<BattleNetRegion, string>>> = {
  'zh-TW': {
    eu: '歐洲',
    us: '美洲',
    kr: '韓國',
    tw: '台灣',
  },
};

export const ALL_REGIONS: BattleNetRegion[] = ['eu', 'us', 'kr', 'tw'];

export const getRegionLabel = (region: BattleNetRegion, language?: string) =>
  LOCALIZED_REGION_LABELS[language ?? '']?.[region] ?? REGION_LABELS[region];

// =============================================================================
// OAUTH STATE MANAGEMENT
// =============================================================================

export interface OAuthState {
  state: string;
  mode?: string;
  region?: string;
  flowId?: string;
}

export const BATTLE_NET_PROCESSING_TTL_MS = 60_000;

const OAUTH_STATE_KEY = 'battlenet_state';
const OAUTH_REGION_KEY = 'battlenet_region';
const OAUTH_FLOW_ID_KEY = 'battlenet_flow_id';
const PROCESSED_CODE_KEY = 'bnet_processed_code';

type ProcessedCodeState = {
  fingerprint: string;
  flowId?: string;
  status: 'processing' | 'completed';
  startedAt: number;
  updatedAt: number;
};

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
export function storeOAuthParams(state: string, region: BattleNetRegion, flowId?: string): void {
  safeStorage.set('local', OAUTH_STATE_KEY, state);
  safeStorage.set('local', OAUTH_REGION_KEY, region);
  if (flowId) safeStorage.set('local', OAUTH_FLOW_ID_KEY, flowId);
}

/**
 * Get stored OAuth params after returning from Battle.net
 */
export function getStoredOAuthParams(): { state: string | null; region: BattleNetRegion; flowId: string | null } {
  const state = safeStorage.get('local', OAUTH_STATE_KEY);
  const region = (safeStorage.get('local', OAUTH_REGION_KEY) as BattleNetRegion) || 'eu';
  const flowId = safeStorage.get('local', OAUTH_FLOW_ID_KEY);
  return { state, region, flowId };
}

/**
 * Clean up OAuth params from localStorage and URL
 */
export function cleanupOAuthParams(): void {
  safeStorage.remove('local', OAUTH_STATE_KEY);
  safeStorage.remove('local', OAUTH_REGION_KEY);
  safeStorage.remove('local', OAUTH_FLOW_ID_KEY);
  
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

/**
 * Generate a secure OAuth state value
 */
export function generateOAuthState(): string {
  return crypto.randomUUID();
}

export function createOAuthStatePayload(
  state: string,
  mode: string | undefined,
  region: BattleNetRegion,
  flowId?: string
): OAuthState {
  return { state, mode, region, flowId };
}

export function fingerprintOAuthCode(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
  }
  return `${code.length}:${Math.abs(hash).toString(36)}`;
}

const readProcessedCodeState = (): ProcessedCodeState | null => {
  const raw = safeStorage.get('session', PROCESSED_CODE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ProcessedCodeState>;
    if (!parsed.fingerprint || !parsed.status || !parsed.startedAt) return null;
    return parsed as ProcessedCodeState;
  } catch {
    // Old versions stored the raw code string. Drop it instead of reusing it.
    safeStorage.remove('session', PROCESSED_CODE_KEY);
    return null;
  }
};

export function beginBattleNetCodeProcessing(
  code: string,
  flowId?: string,
  now = Date.now()
): { allowed: boolean; reason?: 'already_processing' | 'already_completed' } {
  const fingerprint = fingerprintOAuthCode(code);
  const current = readProcessedCodeState();

  if (current?.fingerprint === fingerprint) {
    if (current.status === 'completed') {
      return { allowed: false, reason: 'already_completed' };
    }

    if (now - current.startedAt < BATTLE_NET_PROCESSING_TTL_MS) {
      return { allowed: false, reason: 'already_processing' };
    }
  }

  safeStorage.set('session', PROCESSED_CODE_KEY, JSON.stringify({
    fingerprint,
    flowId,
    status: 'processing',
    startedAt: now,
    updatedAt: now,
  } satisfies ProcessedCodeState));

  return { allowed: true };
}

export function completeBattleNetCodeProcessing(code: string, flowId?: string, now = Date.now()): void {
  safeStorage.set('session', PROCESSED_CODE_KEY, JSON.stringify({
    fingerprint: fingerprintOAuthCode(code),
    flowId,
    status: 'completed',
    startedAt: now,
    updatedAt: now,
  } satisfies ProcessedCodeState));
}

export function clearBattleNetCodeProcessing(): void {
  safeStorage.remove('session', PROCESSED_CODE_KEY);
}

/**
 * Get valid region, defaulting to 'eu' if invalid
 */
export function getValidRegion(region: string | undefined | null): BattleNetRegion {
  if (region && ALL_REGIONS.includes(region.toLowerCase() as BattleNetRegion)) {
    return region.toLowerCase() as BattleNetRegion;
  }
  return 'eu';
}
