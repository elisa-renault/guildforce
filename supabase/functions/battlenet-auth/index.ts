import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildBattleNetRealmSlugCandidates,
  normalizeRealmKey,
  resolveGuildRealmFields,
  shouldRepairGuildServerDisplay,
  toNormalizedRealmSlug,
} from '../../../src/lib/guildDiscovery.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATTLENET_CLIENT_ID = Deno.env.get('BATTLENET_CLIENT_ID')!;
const BATTLENET_CLIENT_SECRET = Deno.env.get('BATTLENET_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GUILD_CHAR_MIN_LEVEL = Deno.env.get('GUILD_CHAR_MIN_LEVEL');
const GUILD_CHAR_MAX_CHECK = Deno.env.get('GUILD_CHAR_MAX_CHECK');

function parseOptionalInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

// Battle.net OAuth URL (same for all regions)
const BATTLENET_OAUTH_URL = 'https://oauth.battle.net';

// Battle.net API URLs per region
type BattleNetRegion = 'eu' | 'us' | 'kr' | 'tw';

const BATTLENET_API_URLS: Record<BattleNetRegion, string> = {
  eu: 'https://eu.api.blizzard.com',
  us: 'https://us.api.blizzard.com',
  kr: 'https://kr.api.blizzard.com',
  tw: 'https://tw.api.blizzard.com',
};

const BATTLENET_NAMESPACES: Record<BattleNetRegion, string> = {
  eu: 'profile-eu',
  us: 'profile-us',
  kr: 'profile-kr',
  tw: 'profile-tw',
};

// Game Data API namespaces (different from Profile API)
const BATTLENET_DYNAMIC_NAMESPACES: Record<BattleNetRegion, string> = {
  eu: 'dynamic-eu',
  us: 'dynamic-us',
  kr: 'dynamic-kr',
  tw: 'dynamic-tw',
};

const BATTLENET_LOCALES: Record<BattleNetRegion, string> = {
  eu: 'en_GB',
  us: 'en_US',
  kr: 'ko_KR',
  tw: 'zh_TW',
};

/**
 * Validate and return a valid region, defaulting to 'eu'
 */
function getValidRegion(region: string | undefined): BattleNetRegion {
  if (region && ['eu', 'us', 'kr', 'tw'].includes(region.toLowerCase())) {
    return region.toLowerCase() as BattleNetRegion;
  }
  return 'eu';
}

const DEFAULT_LANGUAGE = 'en';

function normalizePreferredLanguage(candidate: unknown): string {
  if (typeof candidate !== 'string') return DEFAULT_LANGUAGE;

  const normalized = candidate.trim().replace(/_/g, '-').toLowerCase();
  if (!normalized) return DEFAULT_LANGUAGE;

  if (normalized === 'fr' || normalized.startsWith('fr-')) return 'fr';
  if (normalized === 'de' || normalized.startsWith('de-')) return 'de';
  if (normalized === 'es' || normalized.startsWith('es-')) return 'es';
  if (normalized === 'pt' || normalized.startsWith('pt-')) return 'pt-BR';
  if (normalized === 'it' || normalized.startsWith('it-')) return 'it';
  if (normalized === 'ru' || normalized.startsWith('ru-')) return 'ru';
  if (normalized === 'ko' || normalized.startsWith('ko-')) return 'ko';
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh-CN';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';

  return DEFAULT_LANGUAGE;
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Log level for conditional logging in production
 * Set to 'debug' for verbose logs, 'info' for standard, 'error' for errors only
 */
const LOG_LEVEL = Deno.env.get('LOG_LEVEL') || 'info';

type LogLevel = 'debug' | 'info' | 'error';

const LOG_PRIORITIES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  error: 2,
};

/**
 * Sanitizes potentially sensitive data for production logging.
 * Shows full data only in debug mode, otherwise returns masked version.
 */
function sanitizePII(value: string | undefined, type: 'battletag' | 'name' | 'id' = 'name'): string {
  if (!value) return '[empty]';
  
  // In debug mode, show full values
  if (LOG_LEVEL === 'debug') {
    return value;
  }
  
  // In production, mask sensitive parts
  switch (type) {
    case 'battletag':
      // Show first few chars + mask: "Play****#1234" → "Play****"
      return value.length > 4 ? `${value.substring(0, 4)}****` : '****';
    case 'id':
      // Show only last 4 chars of IDs
      return value.length > 8 ? `***${value.substring(value.length - 4)}` : '****';
    case 'name':
    default:
      // Show first char + asterisks: "Arthas" → "A*****"
      return value.length > 1 ? `${value.charAt(0)}${'*'.repeat(Math.min(value.length - 1, 5))}` : '*';
  }
}

/**
 * Conditional logger that respects LOG_LEVEL environment variable.
 * PII is automatically sanitized in non-debug modes.
 */
const log = {
  debug: (message: string, ...args: any[]) => {
    if (LOG_PRIORITIES[LOG_LEVEL as LogLevel] <= LOG_PRIORITIES.debug) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (LOG_PRIORITIES[LOG_LEVEL as LogLevel] <= LOG_PRIORITIES.info) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};

function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string; details?: string };
  if (maybeError.code !== 'PGRST204') return false;
  const haystack = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`;
  return haystack.includes(`'${column}'`);
}

type AuthDiagnosticStatus = 'ok' | 'warning' | 'error';

type AuthDiagnosticInput = {
  flowId?: string | null;
  userId?: string | null;
  step: string;
  status: AuthDiagnosticStatus;
  browser?: string | null;
  urlPath?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

type AuthDiagnosticInsertClient = {
  from: (table: 'auth_diagnostics') => {
    insert: (values: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
  };
};

const SENSITIVE_DIAGNOSTIC_KEY = /authorization|password|secret|token|refresh|access|code|state/i;
const MAX_DIAGNOSTIC_STRING_LENGTH = 500;

function truncateDiagnosticString(value: string): string {
  return value.length > MAX_DIAGNOSTIC_STRING_LENGTH
    ? `${value.slice(0, MAX_DIAGNOSTIC_STRING_LENGTH)}...`
    : value;
}

function sanitizeDiagnosticValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return truncateDiagnosticString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeDiagnosticValue);

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_DIAGNOSTIC_KEY.test(key)) continue;
    output[key] = sanitizeDiagnosticValue(nested);
  }
  return output;
}

function getRequestBrowser(req: Request): string | null {
  const userAgent = req.headers.get('user-agent');
  return userAgent ? truncateDiagnosticString(userAgent) : null;
}

async function recordAuthDiagnostic(supabase: AuthDiagnosticInsertClient, input: AuthDiagnosticInput): Promise<void> {
  if (!input.flowId) return;

  try {
    const { error } = await supabase.from('auth_diagnostics').insert({
      flow_id: input.flowId,
      user_id: input.userId ?? null,
      provider: 'battlenet',
      step: input.step,
      status: input.status,
      browser: input.browser ?? null,
      url_path: input.urlPath ?? null,
      error_message: input.errorMessage ? truncateDiagnosticString(input.errorMessage) : null,
      metadata: sanitizeDiagnosticValue(input.metadata ?? {}) as Record<string, unknown>,
    });

    if (error) {
      log.debug('Failed to write auth diagnostic', error);
    }
  } catch (error) {
    log.debug('Auth diagnostic write skipped', error);
  }
}

function waitUntilBackgroundTask(task: Promise<unknown>): void {
  const runtime = (globalThis as {
    EdgeRuntime?: { waitUntil?: (task: Promise<unknown>) => void };
  }).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === 'function') {
    runtime.waitUntil(task);
  }
}

function scheduleLoginCharacterSync(
  supabase: AuthDiagnosticInsertClient,
  accessToken: string,
  userId: string,
  region: BattleNetRegion,
  flowId?: string | null
): void {
  const task = (async () => {
    await recordAuthDiagnostic(supabase, {
      flowId,
      userId,
      step: 'character_sync_background_start',
      status: 'ok',
      metadata: { region },
    });

    const result = await fetchAndStoreCharacters(supabase, accessToken, userId, region);

    await recordAuthDiagnostic(supabase, {
      flowId,
      userId,
      step: result.success ? 'character_sync_background_success' : 'character_sync_background_error',
      status: result.success ? 'ok' : 'error',
      errorMessage: result.error ?? null,
      metadata: { region: result.detectedRegion ?? region },
    });
  })().catch(async (error) => {
    log.error('Background character sync failed:', error);
    await recordAuthDiagnostic(supabase, {
      flowId,
      userId,
      step: 'character_sync_background_error',
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: { region },
    });
  });

  waitUntilBackgroundTask(task);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize a guild name to a slug suitable for Blizzard API
 * - Converts to lowercase
 * - Normalizes accented characters (é → e, á → a, etc.)
 * - Replaces spaces with hyphens
 * - Removes any remaining non-alphanumeric characters except hyphens
 */
function toGuildSlug(guildName: string): string {
  return guildName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Alternative slug for Blizzard API: preserve unicode characters and only
 * replace spaces with hyphens. The request is URL-encoded anyway.
 * Some guild names appear to require keeping accents (e.g. Exöde).
 */
function toGuildSlugUnicode(guildName: string): string {
  // Blizzard endpoints can be sensitive to unicode normalization.
  // Normalize to NFC (composed) so accents like "Á" are encoded consistently.
  return guildName
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Normalize a realm/server identifier into a Blizzard realm slug.
 * Some stored values may be realm names (spaces/accents) rather than the canonical slug.
 */
function toRealmSlug(value: string): string {
  return toNormalizedRealmSlug(value);
}

function normalizeCharacterKey(value: string): string {
  return value.normalize('NFC').toLowerCase();
}

function buildCharacterKey(name: string, realmSlug: string): string {
  return `${normalizeCharacterKey(name)}-${normalizeCharacterKey(realmSlug)}`;
}

// ============================================================================
// TYPES
// ============================================================================

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string; // Available when offline_access scope is requested
}

interface StoredBattleNetToken {
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  region: string | null;
}

async function refreshBattleNetAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  try {
    const tokenResponse = await fetch(`${BATTLENET_OAUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${BATTLENET_CLIENT_ID}:${BATTLENET_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => '');
      log.info(`Battle.net token refresh failed: ${tokenResponse.status} ${errorText.slice(0, 160)}`);
      return null;
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    if (!tokenData?.access_token || !tokenData?.expires_in) {
      log.error('Battle.net token refresh returned incomplete payload');
      return null;
    }

    return tokenData;
  } catch (error) {
    log.error('Battle.net token refresh request failed:', error);
    return null;
  }
}

async function getUsableBattleNetTokenForUser(
  supabase: any,
  userId: string
): Promise<
  | { ok: true; accessToken: string; region: BattleNetRegion }
  | { ok: false; reason: 'missing' | 'expired' | 'expired_no_refresh' }
> {
  const { data: tokenData, error: tokenError } = await supabase
    .from('battlenet_tokens')
    .select('access_token, refresh_token, expires_at, region')
    .eq('user_id', userId)
    .maybeSingle();

  if (tokenError || !tokenData) {
    log.error('No Battle.net token found for user');
    return { ok: false, reason: 'missing' };
  }

  const tokenRow = tokenData as StoredBattleNetToken;
  const preferredRegion = getValidRegion(tokenRow.region ?? undefined);
  const isExpired = new Date(tokenRow.expires_at).getTime() <= Date.now();

  if (!isExpired) {
    return { ok: true, accessToken: tokenRow.access_token, region: preferredRegion };
  }

  if (!tokenRow.refresh_token) {
    log.info(`Battle.net token expired and no refresh token exists for user ${sanitizePII(userId, 'id')}`);
    return { ok: false, reason: 'expired_no_refresh' };
  }

  log.info(`Battle.net token expired for user ${sanitizePII(userId, 'id')}, attempting refresh`);
  const refreshedToken = await refreshBattleNetAccessToken(tokenRow.refresh_token);
  if (!refreshedToken) {
    return { ok: false, reason: 'expired' };
  }

  const refreshedExpiresAt = new Date(Date.now() + refreshedToken.expires_in * 1000).toISOString();
  const nextRefreshToken = refreshedToken.refresh_token || tokenRow.refresh_token;

  const { error: updateError } = await supabase
    .from('battlenet_tokens')
    .update({
      access_token: refreshedToken.access_token,
      refresh_token: nextRefreshToken,
      expires_at: refreshedExpiresAt,
    })
    .eq('user_id', userId);

  if (updateError) {
    log.error('Failed to persist refreshed Battle.net token:', updateError);
  }

  return { ok: true, accessToken: refreshedToken.access_token, region: preferredRegion };
}

interface WowProfileFetchResult {
  success: boolean;
  profile?: WoWProfile;
  workingRegion?: BattleNetRegion;
  error?: {
    status: number;
    message: string;
    attemptedRegions: BattleNetRegion[];
  };
}

interface WoWCharacter {
  name: string;
  id: number;
  realm: {
    name: string;
    slug: string;
    id: number;
  };
  playable_class: {
    id: number;
    name?: string;
  };
  playable_race?: {
    id: number;
    name?: string;
  };
  level: number;
  faction?: {
    type: string;
    name: string;
  };
  gender?: {
    type: string;
    name: string;
  };
}

interface WoWProfile {
  _links?: any;
  id?: number;
  wow_accounts?: Array<{
    id: number;
    characters?: WoWCharacter[];
  }>;
  collections?: {
    href: string;
  };
}

interface UserInfo {
  id: number;
  battletag: string;
}

interface CharacterData {
  name: string;
  realm: string;
  realmSlug: string;
  classId: number;
  level: number;
  guildName?: string;
  guildRealm?: string;
  guildRealmSlug?: string;
  guildFaction?: string;
}

interface GuildMembershipData {
  characterId: string;
  guildName: string;
  guildRealm: string;
  guildRealmSlug: string;
  guildFaction: string;
  rankIndex: number;
  rankName: string;
}

interface GuildInfo {
  name: string;
  server: string;
  serverSlug: string;
  faction: string;
  region: BattleNetRegion;
  isGM: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Configuration for retry with exponential backoff
 */
interface RetryConfig {
  maxAttempts?: number;       // Max number of attempts (default: 3)
  initialDelayMs?: number;    // Initial delay in ms (default: 1000)
  multiplier?: number;        // Delay multiplier (default: 2)
  retryableStatuses?: number[]; // HTTP statuses to retry (default: [429, 500, 502, 503, 504])
}

/**
 * Wraps a fetch call with exponential backoff retry logic.
 * Useful for handling transient Blizzard API failures.
 * 
 * @param fetchFn - Async function that performs the fetch
 * @param config - Retry configuration
 * @returns Response from successful fetch or last failed attempt
 */
async function retryWithBackoff<T>(
  fetchFn: () => Promise<Response>,
  config: RetryConfig = {}
): Promise<Response> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    multiplier = 2,
    retryableStatuses = [429, 500, 502, 503, 504],
  } = config;

  let lastResponse: Response | null = null;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchFn();
      lastResponse = response;

      // Success or non-retryable error
      if (response.ok || !retryableStatuses.includes(response.status)) {
        return response;
      }

      // Retryable error - log and wait
      if (attempt < maxAttempts) {
        log.info(`Blizzard API retry ${attempt}/${maxAttempts} after ${response.status}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= multiplier;
      }
    } catch (error) {
      // Network error - retry
      log.error(`Blizzard API network error on attempt ${attempt}/${maxAttempts}:`, error);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= multiplier;
      } else {
        throw error;
      }
    }
  }

  // Return last response (even if failed) so caller can handle it
  return lastResponse!;
}

/**
 * Generates a cryptographically secure random password
 * Used for creating Supabase accounts for Battle.net-first users
 * @returns A 32-character secure password
 */
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

// ============================================================================
// WOW PROFILE MULTI-REGION FALLBACK
// ============================================================================

/**
 * All available Battle.net regions for fallback attempts
 */
const ALL_REGIONS: BattleNetRegion[] = ['eu', 'us', 'kr', 'tw'];

/**
 * Fetches WoW profile with automatic region fallback.
 * If the preferred region fails with 403/404, tries other regions.
 * This helps users who selected the wrong region during OAuth.
 * 
 * @param accessToken - Battle.net OAuth access token
 * @param preferredRegion - The region the user originally selected
 * @returns Result with profile data and working region, or error details
 */
async function fetchWowProfileWithRegionFallback(
  accessToken: string,
  preferredRegion: BattleNetRegion
): Promise<WowProfileFetchResult> {
  const attemptedRegions: BattleNetRegion[] = [];
  
  // Try preferred region first, then others
  const regionsToTry = [
    preferredRegion,
    ...ALL_REGIONS.filter(r => r !== preferredRegion)
  ];
  
  for (const region of regionsToTry) {
    attemptedRegions.push(region);
    
    const apiUrl = BATTLENET_API_URLS[region];
    const namespace = BATTLENET_NAMESPACES[region];
    const locale = BATTLENET_LOCALES[region];
    
    log.info(`Trying WoW profile fetch for region: ${region.toUpperCase()}`);
    
    try {
      // Use retryWithBackoff for transient Blizzard API failures
      const wowProfileResponse = await retryWithBackoff(
        () => fetch(
          `${apiUrl}/profile/user/wow?namespace=${namespace}&locale=${locale}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        ),
        { maxAttempts: 3, initialDelayMs: 1000, multiplier: 2 }
      );
      
      if (wowProfileResponse.ok) {
        const profile = await wowProfileResponse.json();
        
        // Check if profile has actual content (wow_accounts with characters)
        if (profile.wow_accounts && profile.wow_accounts.length > 0) {
          const hasCharacters = profile.wow_accounts.some(
            (acc: any) => acc.characters && acc.characters.length > 0
          );
          
          if (hasCharacters) {
            log.info(`✓ Found WoW profile with characters on region: ${region.toUpperCase()}`);
            if (region !== preferredRegion) {
              log.info(`Auto-detected correct region: ${region.toUpperCase()} (was ${preferredRegion.toUpperCase()})`);
            }
            return { success: true, profile, workingRegion: region };
          } else {
            log.debug(`Region ${region.toUpperCase()}: wow_accounts found but no characters`);
          }
        } else {
          log.debug(`Region ${region.toUpperCase()}: empty or missing wow_accounts`);
        }
        
        // If this is the preferred region and it returned OK (just no chars),
        // store the empty profile but continue trying other regions
        if (region === preferredRegion && profile) {
          // Continue to try other regions before giving up
          continue;
        }
      } else {
        const status = wowProfileResponse.status;
        const errorText = await wowProfileResponse.text().catch(() => 'Unable to read body');
        
        log.info(
          `Region ${region.toUpperCase()} failed: ${status} - ${errorText.slice(0, 200)}`
        );
        
        // 401 = invalid token, no point trying other regions
        if (status === 401) {
          return {
            success: false,
            error: {
              status: 401,
              message: 'Invalid or expired Battle.net token',
              attemptedRegions,
            },
          };
        }
        
        // 403/404 = try next region
        // Other errors = try next region too
      }
    } catch (err) {
      log.error(`Region ${region.toUpperCase()} fetch error:`, err);
    }
  }
  
  // No region worked - return error with details
  return {
    success: false,
    error: {
      status: 403,
      message: 'Access denied by Battle.net on all regions. Check WoW license and wow.profile scope.',
      attemptedRegions,
    },
  };
}

// ============================================================================
// GAME DATA API CLIENT CREDENTIALS
// ============================================================================

// Cache for client credentials tokens per region (valid for ~24h)
const clientTokenCache = new Map<BattleNetRegion, { token: string; expiresAt: number }>();

/**
 * Gets a client credentials token for the Game Data API.
 * This token allows access to public game data without user OAuth.
 * Tokens are cached in memory for efficiency.
 * 
 * @param region - Battle.net region
 * @returns Access token for Game Data API calls
 */
async function getClientCredentialsToken(region: BattleNetRegion): Promise<string | null> {
  try {
    // Check cache first
    const cached = clientTokenCache.get(region);
    if (cached && cached.expiresAt > Date.now()) {
      log.debug(`Using cached client token for ${region}`);
      return cached.token;
    }

    log.debug(`Fetching new client credentials token for ${region}...`);

    const tokenResponse = await fetch(`${BATTLENET_OAUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${BATTLENET_CLIENT_ID}:${BATTLENET_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log.error(`Client credentials token failed: ${tokenResponse.status}`, errorText);
      return null;
    }

    const tokenData: TokenResponse = await tokenResponse.json();
    
    // Cache the token (expires_in is in seconds, subtract 5min buffer)
    const expiresAt = Date.now() + (tokenData.expires_in - 300) * 1000;
    clientTokenCache.set(region, { token: tokenData.access_token, expiresAt });

    log.debug(`Got client credentials token for ${region}, expires in ${tokenData.expires_in}s`);
    return tokenData.access_token;
  } catch (error) {
    log.error('Error getting client credentials token:', error);
    return null;
  }
}

/**
 * Fetches guild roster using Game Data API (public data, no user auth required).
 * Uses client credentials token instead of user OAuth token.
 * 
 * @param region - Battle.net region
 * @param realmSlug - Guild realm slug
 * @param guildName - Guild name
 * @returns Roster data or null if failed
 */
async function fetchPublicGuildRoster(
  region: BattleNetRegion,
  realmSlug: string,
  guildName: string,
  realmName?: string
): Promise<{ members: any[]; faction: string } | null> {
  const { data } = await fetchPublicGuildRosterWithDiagnostics(region, realmSlug, guildName, realmName);
  return data;
}

type PublicGuildRosterFailure = {
  status: number;
  bodySnippet: string;
  rosterUrl: string;
  namespace: string;
  slugType: string;
  realmSlug: string;
};

type PublicGuildSummaryData = {
  faction: string;
  guildUrl: string;
  namespace: string;
  slugType: string;
  realmSlug: string;
};

function isRosterUnavailableDiagnostics(args: {
  failure: PublicGuildRosterFailure | null;
  attempts?: PublicGuildRosterFailure[];
}): boolean {
  const attempts = args.attempts ?? [];
  if (attempts.length === 0) {
    return args.failure?.status === 404;
  }

  return attempts.every((attempt) => attempt.status === 404);
}

async function fetchPublicGuildRosterWithDiagnostics(
  region: BattleNetRegion,
  realmSlug: string,
  guildName: string,
  realmName?: string
): Promise<{
  data: { members: any[]; faction: string } | null;
  failure: PublicGuildRosterFailure | null;
  attempts?: PublicGuildRosterFailure[];
  guildSummary?: PublicGuildSummaryData | null;
}> {
  try {
    const clientToken = await getClientCredentialsToken(region);
    if (!clientToken) {
      log.error('Could not get client token for public roster fetch');
      return { data: null, failure: null, guildSummary: null };
    }

    const apiUrl = BATTLENET_API_URLS[region];
    const locale = BATTLENET_LOCALES[region];
    const serverSlug = toRealmSlug(realmSlug);
    const realmSlugCandidates = buildBattleNetRealmSlugCandidates(realmSlug, realmName);

    // Try multiple slug formats - some guilds need normalized, others need unicode
    const slugsToTry = [
      { slug: toGuildSlug(guildName), type: 'normalized' },
      { slug: toGuildSlugUnicode(guildName), type: 'unicode' },
    ];

    const namespacesToTry = Array.from(
      new Set([BATTLENET_NAMESPACES[region], BATTLENET_DYNAMIC_NAMESPACES[region]])
    );

    // Targeted logging for problematic guilds
    const isTargetedGuild = ['álcool finder', 'hero al pull', 'rennosti', 'r í p', 'exöde'].includes(guildName.toLowerCase());

    const attempts: PublicGuildRosterFailure[] = [];
    let lastFailure: { status: number; body: string; rosterUrl: string; namespace: string; slugType: string } | null = null;

    const tryFetchForRealmSlug = async (tryRealmSlug: string): Promise<{ members: any[]; faction: string } | null> => {
      const tryServerSlug = tryRealmSlug;
      for (const { slug: guildSlug, type: slugType } of slugsToTry) {
        for (const namespace of namespacesToTry) {
          const rosterUrl = `${apiUrl}/data/wow/guild/${tryServerSlug}/${encodeURIComponent(guildSlug)}/roster?namespace=${namespace}&locale=${locale}`;
        
          if (isTargetedGuild) {
            log.info(`[TARGETED] Trying ${guildName}: realm=${tryServerSlug} slugType=${slugType}, slug="${guildSlug}", url=${rosterUrl}`);
          } else {
            log.debug(`Fetching public roster from: ${rosterUrl}`);
          }

          // Use retryWithBackoff for transient Blizzard API failures
          const rosterResponse = await retryWithBackoff(
            () => fetch(rosterUrl, {
              headers: { 'Authorization': `Bearer ${clientToken}` },
            }),
            { maxAttempts: 3, initialDelayMs: 1000, multiplier: 2 }
          );

          if (!rosterResponse.ok) {
            const body = await rosterResponse.text();
            lastFailure = { status: rosterResponse.status, body, rosterUrl, namespace, slugType };
            attempts.push({
              status: rosterResponse.status,
              bodySnippet: String(body ?? '').slice(0, 200),
              rosterUrl,
              namespace,
              slugType,
              realmSlug: tryServerSlug,
            });
            if (isTargetedGuild) {
              log.info(`[TARGETED] ${guildName} failed: ${rosterResponse.status} (${slugType}/${namespace}) - ${body.slice(0, 150)}`);
            }
            // Try the next namespace/slug combination
            continue;
          }

          const roster = await rosterResponse.json();
          const faction = roster.guild?.faction?.type || 'UNKNOWN';

          if (isTargetedGuild) {
            log.info(`[TARGETED] ${guildName} SUCCESS with ${slugType}/${namespace}: ${roster.members?.length || 0} members`);
          }

          return {
            members: roster.members || [],
            faction,
          };
        }
      }
      return null;
    };

    const tryFetchGuildSummaryForRealmSlug = async (tryRealmSlug: string): Promise<PublicGuildSummaryData | null> => {
      const tryServerSlug = tryRealmSlug;
      for (const { slug: guildSlug, type: slugType } of slugsToTry) {
        for (const namespace of namespacesToTry) {
          const guildUrl = `${apiUrl}/data/wow/guild/${tryServerSlug}/${encodeURIComponent(guildSlug)}?namespace=${namespace}&locale=${locale}`;
          const guildResponse = await retryWithBackoff(
            () => fetch(guildUrl, {
              headers: { 'Authorization': `Bearer ${clientToken}` },
            }),
            { maxAttempts: 3, initialDelayMs: 1000, multiplier: 2 }
          );

          if (!guildResponse.ok) {
            continue;
          }

          const guildSummary = await guildResponse.json().catch(() => null);
          const faction =
            guildSummary?.faction?.type ||
            guildSummary?.guild?.faction?.type ||
            'UNKNOWN';

          return {
            faction,
            guildUrl,
            namespace,
            slugType,
            realmSlug: tryServerSlug,
          };
        }
      }

      return null;
    };

    // First try with the provided realm slug.
    for (const candidateRealmSlug of realmSlugCandidates) {
      const primaryData = await tryFetchForRealmSlug(candidateRealmSlug);
      if (primaryData) {
        return { data: primaryData, failure: null, attempts, guildSummary: null };
      }
    }

    // If 404, try other connected realms: guilds may be attributed to a different realm slug within the connected realm set.
    const lastStatus = lastFailure?.status ?? null;
    let connectedRealmSlugs: string[] = [];
    if (lastStatus === 404) {
      const connectedRealmSlugSet = new Set<string>();
      for (const candidateRealmSlug of realmSlugCandidates) {
        const resolvedRealmSlugs = await resolveConnectedRealmSlugs({
          apiUrl,
          locale,
          region,
          realmSlug: candidateRealmSlug,
          accessToken: clientToken,
        });

        resolvedRealmSlugs.forEach((resolvedRealmSlug) => {
          if (resolvedRealmSlug) {
            connectedRealmSlugSet.add(resolvedRealmSlug);
          }
        });
      }

      connectedRealmSlugs = Array.from(connectedRealmSlugSet);

      for (const altRealmSlug of connectedRealmSlugs) {
        if (!altRealmSlug || realmSlugCandidates.includes(altRealmSlug)) continue;
        const altData = await tryFetchForRealmSlug(altRealmSlug);
        if (altData) {
          return { data: altData, failure: null, attempts, guildSummary: null };
        }
      }
    }

    for (const candidateRealmSlug of realmSlugCandidates) {
      const summaryPrimary = await tryFetchGuildSummaryForRealmSlug(candidateRealmSlug);
      if (summaryPrimary) {
        log.info(
          `Public guild summary succeeded but roster is unavailable for ${guildName} on ${summaryPrimary.realmSlug} (${region.toUpperCase()}) ` +
            `[${summaryPrimary.slugType}/${summaryPrimary.namespace}] url=${summaryPrimary.guildUrl}`
        );
        return {
          data: null,
          failure: lastFailure
            ? {
                status: lastFailure.status,
                bodySnippet: String(lastFailure.body ?? '').slice(0, 200),
                rosterUrl: lastFailure.rosterUrl,
                namespace: lastFailure.namespace,
                slugType: lastFailure.slugType,
                realmSlug: serverSlug,
              }
            : null,
          attempts,
          guildSummary: summaryPrimary,
        };
      }
    }

    for (const altRealmSlug of connectedRealmSlugs) {
      if (!altRealmSlug || altRealmSlug === serverSlug) continue;
      const summaryAlt = await tryFetchGuildSummaryForRealmSlug(altRealmSlug);
      if (summaryAlt) {
        log.info(
          `Public guild summary succeeded on connected realm but roster is unavailable for ${guildName} on ${summaryAlt.realmSlug} (${region.toUpperCase()}) ` +
            `[${summaryAlt.slugType}/${summaryAlt.namespace}] url=${summaryAlt.guildUrl}`
        );
        return {
          data: null,
          failure: lastFailure
            ? {
                status: lastFailure.status,
                bodySnippet: String(lastFailure.body ?? '').slice(0, 200),
                rosterUrl: lastFailure.rosterUrl,
                namespace: lastFailure.namespace,
                slugType: lastFailure.slugType,
                realmSlug: serverSlug,
              }
            : null,
          attempts,
          guildSummary: summaryAlt,
        };
      }
    }

    if (lastFailure) {
      // Use info level so we can diagnose production issues
      log.info(
        `Public roster fetch failed for ${guildName} on ${serverSlug} (${region.toUpperCase()}) ` +
          `[${lastFailure.slugType}/${lastFailure.namespace}] ${lastFailure.status} url=${lastFailure.rosterUrl} body=${lastFailure.body?.slice(0, 200)}`
      );
    } else {
      log.info(`Public roster fetch failed for ${guildName} on ${serverSlug} (${region.toUpperCase()}): no combinations tried`);
    }

    return {
      data: null,
      failure: lastFailure
        ? {
            status: lastFailure.status,
            bodySnippet: String(lastFailure.body ?? '').slice(0, 200),
            rosterUrl: lastFailure.rosterUrl,
            namespace: lastFailure.namespace,
            slugType: lastFailure.slugType,
            realmSlug: serverSlug,
          }
        : null,
      attempts,
      guildSummary: null,
    };
  } catch (error) {
    log.error('Error fetching public guild roster:', error);
    return { data: null, failure: null, guildSummary: null };
  }
}

async function resolveConnectedRealmSlugs(args: {
  apiUrl: string;
  locale: string;
  region: BattleNetRegion;
  realmSlug: string;
  accessToken: string;
}): Promise<string[]> {
  const { apiUrl, locale, region, realmSlug, accessToken } = args;
  try {
    const namespace = BATTLENET_DYNAMIC_NAMESPACES[region];
    const realmUrl = `${apiUrl}/data/wow/realm/${encodeURIComponent(realmSlug)}?namespace=${namespace}&locale=${locale}`;
    const realmRes = await fetch(realmUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!realmRes.ok) return [];
    const realmJson = await realmRes.json().catch(() => null);
    const href = realmJson?.connected_realm?.href as string | undefined;
    if (!href) return [];

    const match = href.match(/\/data\/wow\/connected-realm\/(\d+)/);
    const connectedRealmId = match?.[1];
    if (!connectedRealmId) return [];

    const connectedUrl = `${apiUrl}/data/wow/connected-realm/${connectedRealmId}?namespace=${namespace}&locale=${locale}`;
    const connectedRes = await fetch(connectedUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!connectedRes.ok) return [];
    const connectedJson = await connectedRes.json().catch(() => null);
    const realmSlugs = (connectedJson?.realms || [])
      .map((r: any) => (typeof r?.slug === 'string' ? r.slug : null))
      .filter((v: string | null): v is string => !!v);
    return realmSlugs;
  } catch {
    return [];
  }
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    if (path === 'diagnostic' && req.method === 'POST') {
      const payload = await req.json().catch(() => null);
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      await recordAuthDiagnostic(supabase, {
        flowId: typeof payload?.flowId === 'string' ? payload.flowId : null,
        userId: typeof payload?.userId === 'string' ? payload.userId : null,
        step: typeof payload?.step === 'string' ? payload.step : 'client_diagnostic',
        status: ['ok', 'warning', 'error'].includes(payload?.status) ? payload.status : 'warning',
        browser: typeof payload?.browser === 'string' ? payload.browser : getRequestBrowser(req),
        urlPath: typeof payload?.urlPath === 'string' ? payload.urlPath : null,
        errorMessage: typeof payload?.errorMessage === 'string' ? payload.errorMessage : null,
        metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate OAuth URL for frontend to redirect to
    if (path === 'auth-url' && req.method === 'POST') {
      const { redirectUri, state, mode, region: requestedRegion, flowId } = await req.json();
      const region = getValidRegion(requestedRegion);
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      await recordAuthDiagnostic(supabase, {
        flowId,
        step: 'auth_url_received',
        status: 'ok',
        browser: getRequestBrowser(req),
        urlPath: '/functions/v1/battlenet-auth/auth-url',
        metadata: { mode, region, hasRedirectUri: Boolean(redirectUri) },
      });
      
      const authUrl = new URL(`${BATTLENET_OAUTH_URL}/authorize`);
      authUrl.searchParams.set('client_id', BATTLENET_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'wow.profile openid offline_access');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', JSON.stringify({ state, mode, region, flowId }));

      log.debug(`Generated auth URL for redirect (region: ${region})`);

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle Battle.net login/signup (no existing Supabase session)
    if (path === 'login' && req.method === 'POST') {
      const { code, redirectUri, region: requestedRegion, browserLanguage, flowId } = await req.json();
      const region = getValidRegion(requestedRegion);
      const defaultLanguage = normalizePreferredLanguage(browserLanguage);
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      log.info(`Battle.net login (${region.toUpperCase()}) - exchanging code for token...`);
      await recordAuthDiagnostic(supabase, {
        flowId,
        step: 'login_received',
        status: 'ok',
        browser: getRequestBrowser(req),
        urlPath: '/functions/v1/battlenet-auth/login',
        metadata: { region, hasRedirectUri: Boolean(redirectUri), browserLanguage: defaultLanguage },
      });

      // Exchange code for token
      await recordAuthDiagnostic(supabase, {
        flowId,
        step: 'token_exchange_start',
        status: 'ok',
        metadata: { region },
      });

      const tokenResponse = await fetch(`${BATTLENET_OAUTH_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${BATTLENET_CLIENT_ID}:${BATTLENET_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        log.error('Token exchange failed:', errorText);
        await recordAuthDiagnostic(supabase, {
          flowId,
          step: 'token_exchange_error',
          status: 'error',
          errorMessage: errorText,
          metadata: { status: tokenResponse.status, region },
        });
        return new Response(JSON.stringify({ error: 'Authentication failed. Please try again.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenData: TokenResponse = await tokenResponse.json();
      log.info(`Token obtained successfully, scope: ${tokenData.scope}`);
      await recordAuthDiagnostic(supabase, {
        flowId,
        step: 'token_exchange_success',
        status: 'ok',
        metadata: { region, scope: tokenData.scope, expiresIn: tokenData.expires_in },
      });

      // Get user info (BattleTag)
      const userInfoResponse = await fetch(`${BATTLENET_OAUTH_URL}/userinfo`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        log.error('Failed to get user info');
        await recordAuthDiagnostic(supabase, {
          flowId,
          step: 'userinfo_error',
          status: 'error',
          errorMessage: 'Failed to get user info',
          metadata: { status: userInfoResponse.status },
        });
        return new Response(JSON.stringify({ error: 'Failed to get user info' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userInfo: UserInfo = await userInfoResponse.json();
      log.info(`Got BattleTag: ${sanitizePII(userInfo.battletag, 'battletag')}`);
      await recordAuthDiagnostic(supabase, {
        flowId,
        step: 'userinfo_success',
        status: 'ok',
        metadata: { hasBattletag: Boolean(userInfo.battletag) },
      });

      // Battle.net "technical" email used for accounts created via BNet-first flow
      const bnetEmail = `bnet_${userInfo.id}@battlenet.local`;
      const battlenetIdStr = String(userInfo.id);

      // Check if a user with this Battle.net ID already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('battlenet_id', battlenetIdStr)
        .maybeSingle();

      let userId: string;
      let isNewUser = false;
      let userEmail: string = bnetEmail; // Email to use for magic link
      const ensureAuthUserForProfile = async (profileId: string) => {
        const { data: authUser } = await supabase.auth.admin.getUserById(profileId);
        if (authUser?.user) {
          userEmail = authUser.user.email || bnetEmail;
          userId = profileId;
          log.info(`Using existing auth user for profile: ${sanitizePII(userId, 'id')}`);
          return;
        }

        const password = generateSecurePassword();
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: bnetEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name: userInfo.battletag,
            full_name: userInfo.battletag,
            username: userInfo.battletag.split('#')[0],
            preferred_language: defaultLanguage,
            battlenet_id: battlenetIdStr,
          },
        });

        if (createError || !newUser.user) {
          log.error('Failed to create user:', createError);
          await recordAuthDiagnostic(supabase, {
            flowId,
            step: 'supabase_user_error',
            status: 'error',
            errorMessage: createError?.message || 'Failed to create user',
          });
          throw new Error('Failed to create user');
        }

        userId = newUser.user.id;
        userEmail = newUser.user.email || bnetEmail;
        log.info(`New auth user created: ${sanitizePII(userId, 'id')}`);

        if (userId !== profileId) {
          const { error: reassignError } = await supabase.rpc('reassign_profile_id', {
            old_id: profileId,
            new_id: userId,
          });
          if (reassignError) {
            log.error('Failed to reassign profile ID:', reassignError);
            throw new Error('Failed to reassign profile ID');
          }
        }
      };

      if (existingProfile) {
        const profileId = existingProfile.id;
        log.info(`Existing user found by battlenet_id: ${sanitizePII(profileId, 'id')}`);
        isNewUser = false;
        await ensureAuthUserForProfile(profileId);
      } else {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingBnetEmailUser = existingUsers?.users?.find((u) => u.email === bnetEmail);

        if (existingBnetEmailUser) {
          userId = existingBnetEmailUser.id;
          isNewUser = false;
          userEmail = bnetEmail;
          log.info(`Existing auth user found by bnet email: ${sanitizePII(userId, 'id')}`);
        } else {
          const { data: profileByBattletag } = await supabase
            .from('profiles')
            .select('id')
            .eq('battletag', userInfo.battletag)
            .maybeSingle();

          if (profileByBattletag) {
            const profileId = profileByBattletag.id;
            isNewUser = false;
            log.info(`Existing user found by battletag: ${sanitizePII(profileId, 'id')}`);
            await ensureAuthUserForProfile(profileId);
          } else {
            isNewUser = true;
            const password = generateSecurePassword();

            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
              email: bnetEmail,
              password,
              email_confirm: true,
              user_metadata: {
                name: userInfo.battletag,
                full_name: userInfo.battletag,
                username: userInfo.battletag.split('#')[0],
                preferred_language: defaultLanguage,
                battlenet_id: battlenetIdStr,
              },
            });

            if (createError || !newUser.user) {
              log.error('Failed to create user:', createError);
              await recordAuthDiagnostic(supabase, {
                flowId,
                step: 'supabase_user_error',
                status: 'error',
                errorMessage: createError?.message || 'Failed to create user',
              });
              return new Response(JSON.stringify({ error: 'Failed to create user' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }

            userId = newUser.user.id;
            userEmail = bnetEmail;
            log.info(`New user created: ${sanitizePII(userId, 'id')}`);
          }
        }
      }

      await recordAuthDiagnostic(supabase, {
        flowId,
        userId,
        step: 'supabase_user_success',
        status: 'ok',
        metadata: { isNewUser },
      });

      // Ensure the profile exists and is updated with Battle.net info
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      const battletagName = userInfo.battletag.split('#')[0];

      // Retry logic for race condition with profile trigger
      const maxRetries = 3;
      let profileUpsertSuccess = false;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (isNewUser && attempt > 1) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 100));
        }

        const { data: existingProfileRow } = await supabase
          .from('profiles')
          .select('id, username, preferred_language')
          .eq('id', userId)
          .maybeSingle();

        const upsertPayload: any = {
          id: userId,
          battlenet_id: battlenetIdStr,
          battletag: userInfo.battletag,
          username: existingProfileRow?.username || battletagName,
          preferred_language: existingProfileRow?.preferred_language || defaultLanguage,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(upsertPayload, { onConflict: 'id' });

        if (!profileError) {
          profileUpsertSuccess = true;
          log.debug(`Profile upserted on attempt ${attempt}`);
          break;
        } else {
          lastError = profileError;
          log.debug(`Profile upsert attempt ${attempt} failed:`, profileError);
        }
      }

      if (!profileUpsertSuccess) {
        log.error('Failed to upsert profile after retries:', lastError);
        await recordAuthDiagnostic(supabase, {
          flowId,
          userId,
          step: 'supabase_user_error',
          status: 'error',
          errorMessage: lastError?.message || 'Failed to update profile',
          metadata: { phase: 'profile_upsert' },
        });
        return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store Battle.net token in separate secure table (with region and refresh_token)
      const { error: tokenError } = await supabase
        .from('battlenet_tokens')
        .upsert({
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          expires_at: expiresAt,
          region: region,
        }, { onConflict: 'user_id' });

      if (tokenError) {
        log.error('Failed to store token:', tokenError);
        // Continue anyway - profile was saved
      }

      // Generate magic link for session using the correct email
      log.info(`Generating magic link for email: ${sanitizePII(userEmail, 'email')}`);
      const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
      });

      if (magicLinkError || !magicLinkData?.properties?.hashed_token) {
        log.error('Failed to generate magic link:', magicLinkError);
        await recordAuthDiagnostic(supabase, {
          flowId,
          userId,
          step: 'magic_link_error',
          status: 'error',
          errorMessage: magicLinkError?.message || 'Failed to generate session',
        });
        return new Response(JSON.stringify({ error: 'Failed to generate session' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await recordAuthDiagnostic(supabase, {
        flowId,
        userId,
        step: 'magic_link_success',
        status: 'ok',
        metadata: { isNewUser, region },
      });

      // Character and guild sync can be slow on large accounts. Do not block the
      // OAuth callback response after the one-time Battle.net code is exchanged.
      scheduleLoginCharacterSync(supabase, tokenData.access_token, userId, region, flowId);

      return new Response(JSON.stringify({
        verifyToken: magicLinkData.properties.hashed_token,
        tokenType: 'magiclink',
        isNewUser,
        battletag: userInfo.battletag,
        region,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle callback for linking Battle.net to existing Supabase user
    if (path === 'callback' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { code, redirectUri, region: requestedRegion } = await req.json();
      const region = getValidRegion(requestedRegion);

      log.info(`Battle.net link callback (${region.toUpperCase()}) - exchanging code for token...`);

      // Exchange code for token
      const tokenResponse = await fetch(`${BATTLENET_OAUTH_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${BATTLENET_CLIENT_ID}:${BATTLENET_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        log.error('Token exchange failed:', errorText);
        return new Response(JSON.stringify({ error: 'Authentication failed. Please try again.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenData: TokenResponse = await tokenResponse.json();
      log.debug('Token obtained successfully');

      // Get user info (BattleTag)
      const userInfoResponse = await fetch(`${BATTLENET_OAUTH_URL}/userinfo`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        log.error('Failed to get user info');
        return new Response(JSON.stringify({ error: 'Failed to get user info' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userInfo: UserInfo = await userInfoResponse.json();
      log.info(`Got BattleTag: ${sanitizePII(userInfo.battletag, 'battletag')}`);

      // Get Supabase user from auth header
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        log.error('Failed to validate token:', claimsError);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const userId = claimsData.claims.sub as string;

      // Check if this Battle.net account is already linked to another user
      const { data: existingLink } = await supabase
        .from('profiles')
        .select('id')
        .eq('battlenet_id', String(userInfo.id))
        .neq('id', userId)
        .maybeSingle();

      if (existingLink) {
        return new Response(JSON.stringify({ error: 'This Battle.net account is already linked to another user' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update profile with Battle.net info
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      const battletagName = userInfo.battletag.split('#')[0];

      const { data: existingProfileRow } = await supabase
        .from('profiles')
        .select('id, username, preferred_language')
        .eq('id', userId)
        .maybeSingle();

      const upsertPayload: any = {
        id: userId,
        battlenet_id: String(userInfo.id),
        battletag: userInfo.battletag,
        username: existingProfileRow?.username || battletagName,
        preferred_language: existingProfileRow?.preferred_language || 'en',
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(upsertPayload, { onConflict: 'id' });

      if (profileError) {
        log.error('Failed to upsert profile:', profileError);
        return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store Battle.net token in separate secure table (with region and refresh_token)
      const { error: tokenError } = await supabase
        .from('battlenet_tokens')
        .upsert({
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          expires_at: expiresAt,
          region: region,
        }, { onConflict: 'user_id' });

      if (tokenError) {
        log.error('Failed to store token:', tokenError);
        // Continue anyway - profile was saved
      }

      // Fetch and store WoW characters
      await fetchAndStoreCharacters(supabase, tokenData.access_token, userId, region);

      return new Response(JSON.stringify({
        success: true,
        battletag: userInfo.battletag,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get stored characters for current user
    if (path === 'characters' && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const userId = claimsData.claims.sub as string;

      const { data: characters, error } = await supabase
        .from('wow_characters')
        .select('*')
        .eq('user_id', userId)
        .order('level', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch characters' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ characters }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resync Battle.net data for current user (uses stored token)
    if (path === 'resync' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const userId = claimsData.claims.sub as string;

      log.info(`Resync requested for user ${sanitizePII(userId, 'id')}`);

      let lockAcquired = false;
      let lockSupported = true;

      const { data: lockRows, error: lockError } = await supabase
        .from('profiles')
        .update({ is_syncing: true })
        .eq('id', userId)
        .eq('is_syncing', false)
        .select('id');

      if (lockError) {
        if (isMissingColumnError(lockError, 'is_syncing')) {
          lockSupported = false;
          log.error('Resync lock column missing; proceeding without lock', lockError);
        } else {
          log.error('Failed to acquire resync lock', lockError);
          return new Response(JSON.stringify({ error: 'Failed to start resync' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else if (!lockRows || lockRows.length === 0) {
        log.info(`Resync already in progress for user ${sanitizePII(userId, 'id')}`);
        return new Response(JSON.stringify({ error: 'Resync already in progress' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        lockAcquired = true;
      }

      try {
        const usableToken = await getUsableBattleNetTokenForUser(supabase, userId);
        if (!usableToken.ok && usableToken.reason === 'missing') {
          log.error('No Battle.net token found for user');
          return new Response(JSON.stringify({ error: 'No Battle.net account linked. Please connect your Battle.net account first.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!usableToken.ok && usableToken.reason === 'expired') {
          log.error('Battle.net token expired');
          return new Response(JSON.stringify({ 
            error: 'Battle.net session expired. Please reconnect your Battle.net account.',
            errorCode: 'TOKEN_EXPIRED',
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!usableToken.ok && usableToken.reason === 'expired_no_refresh') {
          log.error('Battle.net token expired and refresh token is missing');
          return new Response(JSON.stringify({ 
            error: 'Battle.net session expired and cannot be refreshed. Please reconnect your Battle.net account.',
            errorCode: 'TOKEN_EXPIRED_NO_REFRESH',
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!usableToken.ok) {
          log.error('Unexpected token state while resyncing');
          return new Response(JSON.stringify({ error: 'Failed to sync characters' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const preferredRegion = usableToken.region;
        log.info(`Resync using preferred region: ${preferredRegion.toUpperCase()}`);

        // Re-fetch characters and guilds with multi-region fallback
        const syncResult = await fetchAndStoreCharacters(supabase, usableToken.accessToken, userId, preferredRegion);

        if (!syncResult.success) {
          log.error(`Resync failed for user ${sanitizePII(userId, 'id')}: ${syncResult.error}`);
          return new Response(JSON.stringify({ 
            success: false, 
            error: syncResult.error || 'Failed to sync characters',
            errorCode: 'SYNC_FAILED'
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        log.info(`Resync completed for user ${sanitizePII(userId, 'id')} (detected region: ${syncResult.detectedRegion?.toUpperCase()})`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Battle.net data synchronized successfully',
          detectedRegion: syncResult.detectedRegion,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } finally {
        if (lockSupported && lockAcquired) {
          const { error: unlockError } = await supabase
            .from('profiles')
            .update({ is_syncing: false })
            .eq('id', userId);

          if (unlockError) {
            log.error('Failed to release resync lock', unlockError);
          }
        }
      }
    }

    // Resync all guild members for a specific guild (owner/GM/admin only)
    if (path === 'guild-resync' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = await req.json().catch(() => ({}));
      const guildId = typeof payload?.guildId === 'string' ? payload.guildId : '';
      if (!guildId) {
        return new Response(JSON.stringify({ error: 'Missing guildId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const requesterUserId = claimsData.claims.sub as string;

      const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .select('id, name, server, region, owner_id')
        .eq('id', guildId)
        .maybeSingle();

      if (guildError || !guild) {
        return new Response(JSON.stringify({ error: 'Guild not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: gmMembership } = await supabase
        .from('guild_members')
        .select('id')
        .eq('guild_id', guildId)
        .eq('user_id', requesterUserId)
        .eq('role', 'gm')
        .maybeSingle();

      const isOwner = guild.owner_id === requesterUserId;
      const isGM = !!gmMembership;
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', requesterUserId)
        .eq('role', 'admin')
        .maybeSingle();
      const isAdmin = !!adminRole;

      if (!isOwner && !isGM && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Only guild owner, GM, or admin can trigger guild sync' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const jobId = crypto.randomUUID();
      log.info(`Starting guild-resync job ${jobId} for guild ${sanitizePII(guildId, 'id')} by ${sanitizePII(requesterUserId, 'id')}`);

      const runGuildResync = async () => {
        const { data: memberRows, error: memberRowsError } = await supabase
          .from('guild_members')
          .select('user_id, status')
          .eq('guild_id', guildId)
          .neq('status', 'withdrawn');

        if (memberRowsError) {
          log.error(`Guild-resync ${jobId}: failed to fetch guild members`, memberRowsError);
          throw new Error('Failed to fetch guild members');
        }

        const memberUserIds = Array.from(
          new Set((memberRows || []).map((row: { user_id: string }) => row.user_id))
        );

        const refreshRosterAndReconcile = async () => {
          const guildRegion = getValidRegion(guild.region);
          const guildServerSlug = toRealmSlug(guild.server);
          let rosterSynced = false;
          let rosterUnavailable = false;
          let reconciliation = { removed: 0, skipped: 0, candidates: 0 };
          try {
            const diagnostics = await fetchPublicGuildRosterWithDiagnostics(guildRegion, guildServerSlug, guild.name, guild.server);
            const rosterData = diagnostics.data;
            if (rosterData) {
              if (rosterData.faction && rosterData.faction !== 'UNKNOWN') {
                await supabase
                  .from('guilds')
                  .update({ faction: rosterData.faction.toLowerCase() })
                  .eq('id', guildId);
              }
              await storeFullRosterForGuild(supabase, guildId, guild.name, rosterData.members || []);
              rosterSynced = true;
              reconciliation = await reconcileGuildMembersWithRoster(supabase, guild, requesterUserId);
            } else if (
              diagnostics.guildSummary ||
              isRosterUnavailableDiagnostics({
                failure: diagnostics.failure,
                attempts: diagnostics.attempts,
              })
            ) {
              rosterUnavailable = true;
              if (diagnostics.guildSummary?.faction && diagnostics.guildSummary.faction !== 'UNKNOWN') {
                await supabase
                  .from('guilds')
                  .update({ faction: diagnostics.guildSummary.faction.toLowerCase() })
                  .eq('id', guildId);
              }
            }
          } catch (err) {
            log.error(`Guild-resync ${jobId}: roster sync failed for guild ${sanitizePII(guild.name, 'name')}`, err);
          }

          return { rosterSynced, rosterUnavailable, reconciliation };
        };

        // Run roster reconciliation before long per-member sync to avoid timeouts skipping cleanup.
        const initialRosterRun = await refreshRosterAndReconcile();
        let rosterSynced = initialRosterRun.rosterSynced;
        const rosterUnavailable = initialRosterRun.rosterUnavailable;
        let reconciliation = initialRosterRun.reconciliation;

        const nowIso = new Date().toISOString();
        const { data: tokenRows, error: tokenRowsError } = await supabase
          .from('battlenet_tokens')
          .select('user_id, access_token, region, expires_at')
          .in('user_id', memberUserIds.length > 0 ? memberUserIds : ['00000000-0000-0000-0000-000000000000'])
          .gt('expires_at', nowIso);

        if (tokenRowsError) {
          log.error(`Guild-resync ${jobId}: failed to fetch tokens`, tokenRowsError);
          throw new Error('Failed to fetch member tokens');
        }

        let synced = 0;
        let errors = 0;
        for (const tokenRow of (tokenRows || [])) {
          try {
            const region = getValidRegion(tokenRow.region);
            const result = await fetchAndStoreCharacters(
              supabase,
              tokenRow.access_token,
              tokenRow.user_id,
              region
            );

            if (result.success) {
              synced += 1;
            } else {
              errors += 1;
              log.error(
                `Guild-resync ${jobId}: sync failed for member ${sanitizePII(tokenRow.user_id, 'id')}: ${result.error}`
              );
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            errors += 1;
            log.error(`Guild-resync ${jobId}: sync error for member ${sanitizePII(tokenRow.user_id, 'id')}:`, err);
          }
        }

        const totalMembers = memberUserIds.length;
        const membersWithValidToken = (tokenRows || []).length;
        const skipped = Math.max(totalMembers - membersWithValidToken, 0);

        log.info(
          `Guild-resync ${jobId} completed: guild=${sanitizePII(guildId, 'id')}, total=${totalMembers}, synced=${synced}, errors=${errors}, skipped=${skipped}, rosterSynced=${rosterSynced}, reconciledRemoved=${reconciliation.removed}`
        );

        return {
          success: true,
          jobId,
          guildId,
          totalMembers,
          membersWithValidToken,
          synced,
          errors,
          skipped,
          rosterSynced,
          rosterUnavailable,
          reconciliation,
        };
      };

      const canBackground = typeof (globalThis as any).EdgeRuntime?.waitUntil === 'function';
      if (canBackground) {
        (globalThis as any).EdgeRuntime.waitUntil(
          runGuildResync().catch((err) => {
            log.error(`Guild-resync job ${jobId} failed:`, err);
          })
        );

        return new Response(JSON.stringify({ started: true, jobId, guildId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const result = await runGuildResync();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        log.error(`Guild-resync job ${jobId} failed (inline):`, err);
        return new Response(JSON.stringify({ error: 'Guild sync failed', jobId }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Refresh Blizzard guild member cache (guild_roster_cache) for a specific guild (owner/GM/admin only).
    // This is intentionally "fast": it updates the cached member list and returns counts inline.
    if (path === 'guild-members-cache-sync' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = await req.json().catch(() => ({}));
      const guildId = typeof payload?.guildId === 'string' ? payload.guildId : '';
      if (!guildId) {
        return new Response(JSON.stringify({ error: 'Missing guildId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const requesterUserId = claimsData.claims.sub as string;

      const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .select('id, name, server, region, owner_id')
        .eq('id', guildId)
        .maybeSingle();

      if (guildError || !guild) {
        return new Response(JSON.stringify({ error: 'Guild not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: gmMembership } = await supabase
        .from('guild_members')
        .select('id')
        .eq('guild_id', guildId)
        .eq('user_id', requesterUserId)
        .eq('role', 'gm')
        .maybeSingle();

      const isOwner = guild.owner_id === requesterUserId;
      const isGM = !!gmMembership;
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', requesterUserId)
        .eq('role', 'admin')
        .maybeSingle();
      const isAdmin = !!adminRole;

      if (!isOwner && !isGM && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Only guild owner, GM, or admin can trigger guild cache sync' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const startedAt = Date.now();
      const guildRegion = getValidRegion(guild.region);
      const guildServerSlug = toRealmSlug(guild.server);

      try {
        const diagnostics = await fetchPublicGuildRosterWithDiagnostics(guildRegion, guildServerSlug, guild.name, guild.server);
        const guildData = diagnostics.data;
        const failure = diagnostics.failure;
        if (!guildData) {
          const rosterUnavailable =
            !!diagnostics.guildSummary ||
            isRosterUnavailableDiagnostics({
              failure,
              attempts: diagnostics.attempts,
            });

          if (rosterUnavailable) {
            if (diagnostics.guildSummary?.faction && diagnostics.guildSummary.faction !== 'UNKNOWN') {
              await supabase
                .from('guilds')
                .update({ faction: diagnostics.guildSummary.faction.toLowerCase() })
                .eq('id', guildId);
            }

            const { data: countsData } = await supabase
              .rpc('get_guild_member_counts', { p_guild_ids: [guildId] });

            const countsRow = Array.isArray(countsData) ? countsData[0] : null;
            const cachedMembers = Number(countsRow?.total_count ?? 0);
            const cachedGuildforceUsers = Number(countsRow?.unique_users ?? 0);

            return new Response(JSON.stringify({
              success: true,
              guildId,
              cachedMembers,
              cachedGuildforceUsers,
              rosterUnavailable: true,
              durationMs: Date.now() - startedAt,
              details: {
                summary: diagnostics.guildSummary ?? null,
                ...(failure ?? {}),
                attempts: diagnostics.attempts ?? [],
              },
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({
            error: 'Failed to fetch guild members from Blizzard',
            details: {
              ...(failure ?? {}),
              attempts: diagnostics.attempts ?? [],
            },
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (guildData.faction && guildData.faction !== 'UNKNOWN') {
          await supabase
            .from('guilds')
            .update({ faction: guildData.faction.toLowerCase() })
            .eq('id', guildId);
        }

        await storeFullRosterForGuild(supabase, guildId, guild.name, guildData.members || []);

        const { data: countsData } = await supabase
          .rpc('get_guild_member_counts', { p_guild_ids: [guildId] });

        const countsRow = Array.isArray(countsData) ? countsData[0] : null;
        const cachedMembers = Number(countsRow?.total_count ?? 0);
        const cachedGuildforceUsers = Number(countsRow?.unique_users ?? 0);

        return new Response(JSON.stringify({
          success: true,
          guildId,
          cachedMembers,
          cachedGuildforceUsers,
          durationMs: Date.now() - startedAt,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        log.error(`Guild members cache sync failed for guild ${sanitizePII(guild.name, 'name')}:`, err);
        return new Response(JSON.stringify({ error: 'Guild cache sync failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Manual rename reconciliation for a specific guild (owner/GM/admin only).
    // Validates the new name against Blizzard before updating `guilds.name`, stores an alias row,
    // and refreshes the cached member list for the guild.
    if (path === 'guild-rename' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = await req.json().catch(() => ({}));
      const guildId = typeof payload?.guildId === 'string' ? payload.guildId : '';
      const newName = typeof payload?.newName === 'string' ? payload.newName.trim() : '';
      if (!guildId) {
        return new Response(JSON.stringify({ error: 'Missing guildId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!newName) {
        return new Response(JSON.stringify({ error: 'Missing newName' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const requesterUserId = claimsData.claims.sub as string;

      const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .select('id, name, server, region, owner_id')
        .eq('id', guildId)
        .maybeSingle();

      if (guildError || !guild) {
        return new Response(JSON.stringify({ error: 'Guild not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const oldName = String(guild.name || '').trim();
      if (oldName.toLowerCase() === newName.toLowerCase()) {
        return new Response(JSON.stringify({ error: 'New name is the same as current name' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: gmMembership } = await supabase
        .from('guild_members')
        .select('id')
        .eq('guild_id', guildId)
        .eq('user_id', requesterUserId)
        .eq('role', 'gm')
        .maybeSingle();

      const isOwner = guild.owner_id === requesterUserId;
      const isGM = !!gmMembership;
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', requesterUserId)
        .eq('role', 'admin')
        .maybeSingle();
      const isAdmin = !!adminRole;

      if (!isOwner && !isGM && !isAdmin) {
        return new Response(JSON.stringify({ error: 'Only guild owner, GM, or admin can rename guild' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Avoid breaking the unique key (region, server, name).
      const { data: conflictGuild } = await supabase
        .from('guilds')
        .select('id')
        .eq('region', guild.region)
        .eq('server', guild.server)
        .eq('name', newName)
        .maybeSingle();

      if (conflictGuild && conflictGuild.id !== guildId) {
        return new Response(JSON.stringify({ error: 'Guild name already exists on this realm', conflictGuildId: conflictGuild.id }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const startedAt = Date.now();
      const guildRegion = getValidRegion(guild.region);
      const guildServerSlug = toRealmSlug(guild.server);

      try {
        // Validate that Blizzard recognizes the guild with the new name (and fetch members for cache refresh).
        const diagnostics = await fetchPublicGuildRosterWithDiagnostics(guildRegion, guildServerSlug, newName, guild.server);
        const guildData = diagnostics.data;
        const failure = diagnostics.failure;
        if (!guildData) {
          return new Response(JSON.stringify({
            error: 'Failed to fetch guild members from Blizzard',
            details: {
              ...(failure ?? {}),
              attempts: diagnostics.attempts ?? [],
              realmSlug: guildServerSlug,
            },
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Safety gate:
        // - Non-admin users must be the *current* GM of the target guild name on Blizzard.
        //   This prevents former GMs/owners from renaming a guild to a different existing guild name.
        // - Admin users may proceed, but only when we can establish strong member overlap between the old cached guild
        //   and the Blizzard roster for the new name (to avoid "disband + new guild" false positives).
        const rosterMembers = Array.isArray(guildData.members) ? guildData.members : [];
        const normalizeKey = (name: string | null | undefined, realmSlug: string | null | undefined) => {
          const n = String(name ?? '').trim().toLowerCase();
          const r = String(realmSlug ?? '').trim().toLowerCase();
          if (!n || n === 'unknown') return null;
          if (!r || r === 'unknown') return null;
          return `${n}-${r}`;
        };

        let requesterIsGMOfTargetGuild = false;
        try {
          const { data: requesterChars, error: requesterCharsError } = await supabase
            .from('wow_characters')
            .select('name, realm_slug')
            .eq('user_id', requesterUserId);

          if (requesterCharsError) {
            log.error('Failed to load requester wow_characters for guild rename validation:', requesterCharsError);
          } else {
            const requesterKeys = new Set<string>();
            for (const ch of (requesterChars || [])) {
              const key = normalizeKey((ch as any)?.name, (ch as any)?.realm_slug);
              if (key) requesterKeys.add(key);
            }

            if (requesterKeys.size > 0) {
              for (const m of rosterMembers) {
                const rankIndex = Number((m as any)?.rank ?? 99);
                if (rankIndex !== 0) continue;
                const key = normalizeKey((m as any)?.character?.name, (m as any)?.character?.realm?.slug);
                if (key && requesterKeys.has(key)) {
                  requesterIsGMOfTargetGuild = true;
                  break;
                }
              }
            }
          }
        } catch (err) {
          log.error('Unexpected error validating requester GM status for guild rename:', err);
        }

        if (!requesterIsGMOfTargetGuild) {
          if (!isAdmin) {
            return new Response(JSON.stringify({
              error: 'Only the current guild owner or GM can confirm a rename',
            }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          // Admin fallback: require strong overlap between cached old members and the new Blizzard roster.
          const cachedOldMembers = await fetchAllGuildRosterCacheMembersForOverlap(supabase, guildId);
          const oldSet = new Set<string>();
          for (const row of cachedOldMembers) {
            const key = normalizeKey((row as any)?.character_name, (row as any)?.character_realm_slug);
            if (key) oldSet.add(key);
          }

          const newSet = new Set<string>();
          for (const m of rosterMembers) {
            const key = normalizeKey((m as any)?.character?.name, (m as any)?.character?.realm?.slug);
            if (key) newSet.add(key);
          }

          const sizeOfIntersection = (a: Set<string>, b: Set<string>) => {
            let count = 0;
            const [small, big] = a.size <= b.size ? [a, b] : [b, a];
            for (const v of small) {
              if (big.has(v)) count++;
            }
            return count;
          };

          const oldCount = oldSet.size;
          const newCount = newSet.size;
          const intersection = sizeOfIntersection(oldSet, newSet);

          if (oldCount === 0 || newCount === 0) {
            return new Response(JSON.stringify({
              error: 'Admin rename blocked: insufficient member evidence',
              details: { oldCount, newCount, intersection },
            }), {
              status: 412,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const minCount = Math.min(oldCount, newCount);
          const maxCount = Math.max(oldCount, newCount);
          const overlapOfSmaller = minCount > 0 ? intersection / minCount : 0;
          const sizeRatio = maxCount > 0 ? minCount / maxCount : 0;

          const strongOverlap =
            (minCount < 10
              ? minCount >= 2 && intersection === minCount && sizeRatio >= 0.7
              : intersection >= 10 && overlapOfSmaller >= 0.8 && sizeRatio >= 0.7);

          if (!strongOverlap) {
            return new Response(JSON.stringify({
              error: 'Admin rename blocked: weak member overlap',
              details: { oldCount, newCount, intersection, overlapOfSmaller, sizeRatio },
            }), {
              status: 412,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Store alias best-effort (may fail if old name has been reused by a different guild).
        const { error: aliasError } = await supabase
          .from('guild_aliases')
          .insert({
            guild_id: guildId,
            old_name: oldName,
            server: guild.server,
            region: guild.region,
          });

        if (aliasError) {
          log.info(
            `Guild alias insert skipped/failed for guild ${sanitizePII(guildId, 'id')} oldName=${sanitizePII(oldName, 'name')}: ${aliasError.message}`
          );
        }

        // Update guild name (and faction if reliable)
        const patch: any = { name: newName };
        if (guildData.faction && guildData.faction !== 'UNKNOWN') {
          patch.faction = String(guildData.faction).toLowerCase();
        }

        const { error: updateError } = await supabase
          .from('guilds')
          .update(patch)
          .eq('id', guildId);

        if (updateError) {
          log.error('Failed to update guild name:', updateError);
          return new Response(JSON.stringify({ error: 'Failed to rename guild' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Refresh cached member list for this guild id using the new name roster.
        await storeFullRosterForGuild(supabase, guildId, newName, guildData.members || []);

        const { data: countsData } = await supabase
          .rpc('get_guild_member_counts', { p_guild_ids: [guildId] });

        const countsRow = Array.isArray(countsData) ? countsData[0] : null;
        const cachedMembers = Number(countsRow?.total_count ?? 0);
        const cachedGuildforceUsers = Number(countsRow?.unique_users ?? 0);

        return new Response(JSON.stringify({
          success: true,
          guildId,
          oldName,
          newName,
          cachedMembers,
          cachedGuildforceUsers,
          durationMs: Date.now() - startedAt,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        log.error(`Guild rename failed for guild ${sanitizePII(guildId, 'id')}:`, err);
        return new Response(JSON.stringify({ error: 'Guild rename failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Scheduled sync for all users with valid tokens (called by cron or admin)
    if (path === 'scheduled-sync' && req.method === 'POST') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Verify this is a legitimate cron call via secret header, service role key, or admin user
      const cronSecret = req.headers.get('x-cron-secret');
      const expectedSecret = Deno.env.get('CRON_SECRET');
      const authHeader = req.headers.get('Authorization');
      
      // Allow calls with:
      // 1. Valid cron secret header (for pg_cron scheduled jobs)
      // 2. Exact service role authorization (for admin/manual triggers)
      // 3. Authenticated admin user (for admin dashboard manual sync)
      const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
      const hasValidCronSecret = cronSecret && expectedSecret && cronSecret === expectedSecret;
      
      let isAdminUser = false;
      if (!isServiceRole && !hasValidCronSecret && authHeader?.startsWith('Bearer ')) {
        // Check if it's an authenticated admin user
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          isAdminUser = !!roles;
        }
      }
      
      if (!isServiceRole && !hasValidCronSecret && !isAdminUser) {
        log.error('Unauthorized scheduled sync attempt', { 
          hasAuthHeader: !!authHeader, 
          hasCronSecret: !!cronSecret 
        });
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      log.info('Scheduled sync authorized', { 
        method: isServiceRole ? 'service_role' : (hasValidCronSecret ? 'cron_secret' : 'admin_user')
      });

      const jobId = crypto.randomUUID();
      log.info(`Starting scheduled sync job ${jobId} for all users AND all guilds...`);

      const runScheduledSync = async () => {
        // =====================================================================
        // PHASE 1: Sync all users with valid tokens (existing behavior)
        // =====================================================================
        const { data: validTokens, error: tokensError } = await supabase
          .from('battlenet_tokens')
          .select('user_id, access_token')
          .gt('expires_at', new Date().toISOString());

        if (tokensError) {
          log.error('Failed to fetch tokens:', tokensError);
          throw new Error('Failed to fetch tokens');
        }

        log.info(`Phase 1: Found ${validTokens?.length || 0} users with valid tokens to sync`);

        let usersSynced = 0;
        let usersErrors = 0;

        for (const tokenRecord of (validTokens || [])) {
          try {
            const { data: membership } = await supabase
              .from('wow_guild_memberships')
              .select('guild_region')
              .eq('user_id', tokenRecord.user_id)
              .limit(1)
              .maybeSingle();

            const region = getValidRegion(membership?.guild_region);

            await fetchAndStoreCharacters(supabase, tokenRecord.access_token, tokenRecord.user_id, region);
            usersSynced++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            log.error(`Error syncing user ${sanitizePII(tokenRecord.user_id, 'id')}:`, err);
            usersErrors++;
          }
        }

        log.info(`Phase 1 completed: ${usersSynced} users synced, ${usersErrors} errors`);

        // =====================================================================
        // PHASE 2: Sync all guilds using Game Data API (client credentials)
        // =====================================================================
        log.info('Phase 2: Syncing all guilds roster cache using Game Data API...');

        const { data: allGuilds, error: guildsError } = await supabase
          .from('guilds')
          .select('id, name, server, region');

        if (guildsError) {
          log.error('Failed to fetch guilds:', guildsError);
          // Don't throw: user sync may have succeeded; still report partial
        }

        let guildsSynced = 0;
        let guildsSkipped = 0;
        let guildsErrors = 0;

        for (const guild of (allGuilds || [])) {
          try {
            const region = getValidRegion(guild.region);
            const serverSlug = toRealmSlug(guild.server);
            const diagnostics = await fetchPublicGuildRosterWithDiagnostics(region, serverSlug, guild.name, guild.server);
            const rosterData = diagnostics.data;

            if (!rosterData) {
              const rosterUnavailable =
                !!diagnostics.guildSummary ||
                isRosterUnavailableDiagnostics({
                  failure: diagnostics.failure,
                  attempts: diagnostics.attempts,
                });

              if (rosterUnavailable) {
                if (diagnostics.guildSummary?.faction && diagnostics.guildSummary.faction !== 'UNKNOWN') {
                  await supabase
                    .from('guilds')
                    .update({ faction: diagnostics.guildSummary.faction.toLowerCase() })
                    .eq('id', guild.id);
                }

                guildsSkipped++;
                log.info(
                  `Skipping roster cache refresh for ${sanitizePII(guild.name, 'name')}: guild summary exists but roster is unavailable`
                );
                continue;
              }

              log.debug(`Failed to fetch public roster for ${sanitizePII(guild.name, 'name')}`);
              guildsErrors++;
              continue;
            }

            if (rosterData.faction && rosterData.faction !== 'UNKNOWN') {
              await supabase
                .from('guilds')
                .update({ faction: rosterData.faction.toLowerCase() })
                .eq('id', guild.id);
            }

            await storeFullRosterForGuild(supabase, guild.id, guild.name, rosterData.members);
            guildsSynced++;

            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            log.error(`Error syncing guild ${sanitizePII(guild.name, 'name')}:`, err);
            guildsErrors++;
          }
        }

        log.info(`Phase 2 completed: ${guildsSynced} guilds synced, ${guildsSkipped} skipped, ${guildsErrors} errors`);
        log.info(`Scheduled sync job ${jobId} completed: ${usersSynced} users, ${guildsSynced} guilds`);

        return {
          success: true,
          jobId,
          users: { synced: usersSynced, errors: usersErrors, total: validTokens?.length || 0 },
          guilds: { synced: guildsSynced, skipped: guildsSkipped, total: allGuilds?.length || 0 },
        };
      };

      // If available, run in background so the admin UI doesn't look "stuck"
      const canBackground = typeof (globalThis as any).EdgeRuntime?.waitUntil === 'function';
      if (canBackground) {
        (globalThis as any).EdgeRuntime.waitUntil(
          runScheduledSync().catch((err) => {
            log.error(`Scheduled sync job ${jobId} failed:`, err);
          })
        );

        return new Response(JSON.stringify({ started: true, jobId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fallback: if background execution is not supported, run inline (previous behavior)
      try {
        const result = await runScheduledSync();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        log.error(`Scheduled sync job ${jobId} failed (inline):`, err);
        return new Response(JSON.stringify({ error: 'Scheduled sync failed', jobId }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log.error('Error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again later.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetches ALL wow_characters with pagination to avoid the 1000-row default limit.
 * This ensures that all Guildforce users' characters can be matched in roster cache.
 */
async function fetchAllWowCharactersForMatching(supabase: any): Promise<Array<{ id: string; user_id: string; name: string; realm_slug: string }>> {
  const pageSize = 1000;
  const allChars: Array<{ id: string; user_id: string; name: string; realm_slug: string }> = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('wow_characters')
      .select('id, user_id, name, realm_slug')
      .range(from, from + pageSize - 1);

    if (error) {
      log.error('Failed to fetch wow_characters for matching:', error);
      break;
    }

    const rows = data || [];
    allChars.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  log.debug(`Fetched ${allChars.length} total wow_characters for matching`);
  return allChars;
}

async function fetchAllGuildRosterCacheMembersForOverlap(
  supabase: any,
  guildId: string
): Promise<Array<{ character_name: string; character_realm_slug: string }>> {
  const pageSize = 1000;
  const allMembers: Array<{ character_name: string; character_realm_slug: string }> = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('guild_roster_cache')
      .select('character_name, character_realm_slug')
      .eq('guild_id', guildId)
      .range(from, from + pageSize - 1);

    if (error) {
      log.error('Failed to fetch guild_roster_cache members for overlap:', error);
      break;
    }

    const rows = data || [];
    allMembers.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allMembers;
}

function dedupeRosterEntries(rosterData: any[]) {
  const rosterMap = new Map<string, any>();
  for (const entry of rosterData) {
    const key = `${entry.guild_id}-${entry.character_name.toLowerCase()}-${entry.character_realm_slug.toLowerCase()}`;
    const existing = rosterMap.get(key);

    if (!existing) {
      rosterMap.set(key, entry);
      continue;
    }

    const hasHigherRank = entry.rank_index < existing.rank_index;
    const hasHigherLevel =
      entry.rank_index === existing.rank_index && entry.character_level > existing.character_level;

    if (hasHigherRank || hasHigherLevel) {
      rosterMap.set(key, entry);
    }
  }

  return Array.from(rosterMap.values());
}

/**
 * Stores the full guild roster in guild_roster_cache table.
 * This allows showing all WoW guild members, even those not on Guildforce yet.
 * 
 * @param supabase - Supabase client
 * @param guildName - Guild name
 * @param guildRealmSlug - Guild realm slug
 * @param guildFaction - Guild faction
 * @param region - Battle.net region
 * @param rosterMembers - Array of roster members from Blizzard API
 */
async function storeFullRoster(
  supabase: any,
  guildName: string,
  guildRealmSlug: string,
  guildFaction: string,
  region: BattleNetRegion,
  rosterMembers: any[]
) {
  try {
    if (!rosterMembers || rosterMembers.length === 0) {
      log.debug('No roster members to store');
      return;
    }

    // Find the app guild by name, realm and region
    const { data: appGuild, error: guildError } = await supabase
      .from('guilds')
      .select('id')
      .ilike('name', guildName)
      .ilike('server', guildRealmSlug)
      .ilike('region', region)
      .maybeSingle();

    if (guildError || !appGuild) {
      log.debug(`App guild not found for ${guildName}, skipping roster cache`);
      return;
    }

    const guildId = appGuild.id;
    log.info(`Storing full roster (${rosterMembers.length} members) for guild ${sanitizePII(guildName, 'name')}`);

    // Get all existing wow_characters to match Guildforce users (paginated to avoid 1000-row limit)
    const existingChars = await fetchAllWowCharactersForMatching(supabase);

    // Build a map for quick lookup
    const charMap = new Map<string, { id: string; user_id: string }>();
    for (const char of (existingChars || [])) {
      const key = `${char.name.toLowerCase()}-${char.realm_slug.toLowerCase()}`;
      charMap.set(key, { id: char.id, user_id: char.user_id });
    }

    // Prepare roster data
    const rosterData = rosterMembers.map((member: any) => {
      const charName = member.character?.name || 'Unknown';
      const charRealm = member.character?.realm?.name || member.character?.realm?.slug || guildRealmSlug;
      const charRealmSlug = member.character?.realm?.slug || guildRealmSlug;
      const charClassId = member.character?.playable_class?.id || 0;
      const charLevel = member.character?.level || 1;
      const rankIndex = member.rank ?? 99;
      const isGM = rankIndex === 0;

      // Try to match with an existing Guildforce user
      const charKey = `${charName.toLowerCase()}-${charRealmSlug.toLowerCase()}`;
      const matchedChar = charMap.get(charKey);

      return {
        guild_id: guildId,
        character_name: charName,
        character_realm: charRealm,
        character_realm_slug: charRealmSlug,
        character_class_id: charClassId,
        character_level: charLevel,
        rank_index: rankIndex,
        rank_name: isGM ? 'Guild Master' : `Rank ${rankIndex}`,
        is_guild_master: isGM,
        matched_user_id: matchedChar?.user_id || null,
        matched_character_id: matchedChar?.id || null,
        updated_at: new Date().toISOString(),
      };
    });

    const dedupedRosterData = dedupeRosterEntries(rosterData);
    const incomingRosterKeys = new Set(
      dedupedRosterData.map(row => buildCharacterKey(row.character_name, row.character_realm_slug))
    );

    // Load existing cache rows once so we can remove only stale members.
    // This preserves stable row IDs for unchanged members and avoids cascading
    // deletion of external_member_wishes on each roster refresh.
    const { data: existingCacheRows, error: existingCacheError } = await supabase
      .from('guild_roster_cache')
      .select('id, character_name, character_realm_slug')
      .eq('guild_id', guildId);
    if (existingCacheError) {
      log.error('Failed to load existing guild_roster_cache rows:', existingCacheError);
    }

    // Insert in batches of 100 to avoid payload limits
    const batchSize = 100;
    for (let i = 0; i < dedupedRosterData.length; i += batchSize) {
      const batch = dedupedRosterData.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('guild_roster_cache')
        .upsert(batch, { onConflict: 'guild_id,character_name,character_realm_slug' });

      if (insertError) {
        log.error(`Error inserting roster batch ${i / batchSize + 1}:`, insertError);
      }
    }

    // Delete only stale cache rows (members no longer present in latest roster).
    const staleRowIds = (existingCacheRows || [])
      .filter((row: { id: string; character_name: string; character_realm_slug: string }) => {
        const existingKey = buildCharacterKey(row.character_name, row.character_realm_slug);
        return !incomingRosterKeys.has(existingKey);
      })
      .map((row: { id: string }) => row.id);

    if (staleRowIds.length > 0) {
      for (let i = 0; i < staleRowIds.length; i += batchSize) {
        const idBatch = staleRowIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('guild_roster_cache')
          .delete()
          .in('id', idBatch);
        if (deleteError) {
          log.error(`Error deleting stale roster batch ${i / batchSize + 1}:`, deleteError);
        }
      }
    }

    log.info(`Successfully cached ${dedupedRosterData.length} roster members for guild ${sanitizePII(guildName, 'name')}`);
    await claimOrphanGuildOwnerFromRosterMatch(supabase, guildId);
  } catch (error) {
    log.error('Error storing full roster:', error);
  }
}

/**
 * Stores guild roster for scheduled sync - simplified version that takes guild_id directly.
 * Used by the scheduled-sync endpoint to update rosters for all guilds.
 * 
 * @param supabase - Supabase client
 * @param guildId - App guild ID
 * @param guildName - Guild name (for logging)
 * @param rosterMembers - Array of roster members from Blizzard API
 */
async function storeFullRosterForGuild(
  supabase: any,
  guildId: string,
  guildName: string,
  rosterMembers: any[]
) {
  try {
    if (!rosterMembers || rosterMembers.length === 0) {
      log.debug('No roster members to store');
      return;
    }

    log.info(`Storing full roster (${rosterMembers.length} members) for guild ${sanitizePII(guildName, 'name')}`);

    // Get all existing wow_characters to match Guildforce users (paginated to avoid 1000-row limit)
    const existingChars = await fetchAllWowCharactersForMatching(supabase);

    // Build a map for quick lookup
    const charMap = new Map<string, { id: string; user_id: string }>();
    for (const char of (existingChars || [])) {
      const key = `${char.name.toLowerCase()}-${char.realm_slug.toLowerCase()}`;
      charMap.set(key, { id: char.id, user_id: char.user_id });
    }

    // Prepare roster data
    const rosterData = rosterMembers.map((member: any) => {
      const charName = member.character?.name || 'Unknown';
      const charRealm = member.character?.realm?.name || member.character?.realm?.slug || 'unknown';
      const charRealmSlug = member.character?.realm?.slug || 'unknown';
      const charClassId = member.character?.playable_class?.id || 0;
      const charLevel = member.character?.level || 1;
      const rankIndex = member.rank ?? 99;
      const isGM = rankIndex === 0;

      // Try to match with an existing Guildforce user
      const charKey = `${charName.toLowerCase()}-${charRealmSlug.toLowerCase()}`;
      const matchedChar = charMap.get(charKey);

      return {
        guild_id: guildId,
        character_name: charName,
        character_realm: charRealm,
        character_realm_slug: charRealmSlug,
        character_class_id: charClassId,
        character_level: charLevel,
        rank_index: rankIndex,
        rank_name: isGM ? 'Guild Master' : `Rank ${rankIndex}`,
        is_guild_master: isGM,
        matched_user_id: matchedChar?.user_id || null,
        matched_character_id: matchedChar?.id || null,
        updated_at: new Date().toISOString(),
      };
    });

    const dedupedRosterData = dedupeRosterEntries(rosterData);
    const incomingRosterKeys = new Set(
      dedupedRosterData.map(row => buildCharacterKey(row.character_name, row.character_realm_slug))
    );

    const { data: existingCacheRows, error: existingCacheError } = await supabase
      .from('guild_roster_cache')
      .select('id, character_name, character_realm_slug')
      .eq('guild_id', guildId);
    if (existingCacheError) {
      log.error('Failed to load existing guild_roster_cache rows (scheduled sync):', existingCacheError);
    }

    // Insert in batches of 100 to avoid payload limits
    const batchSize = 100;
    for (let i = 0; i < dedupedRosterData.length; i += batchSize) {
      const batch = dedupedRosterData.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('guild_roster_cache')
        .upsert(batch, { onConflict: 'guild_id,character_name,character_realm_slug' });

      if (insertError) {
        log.error(`Error inserting roster batch ${i / batchSize + 1}:`, insertError);
      }
    }

    const staleRowIds = (existingCacheRows || [])
      .filter((row: { id: string; character_name: string; character_realm_slug: string }) => {
        const existingKey = buildCharacterKey(row.character_name, row.character_realm_slug);
        return !incomingRosterKeys.has(existingKey);
      })
      .map((row: { id: string }) => row.id);

    if (staleRowIds.length > 0) {
      for (let i = 0; i < staleRowIds.length; i += batchSize) {
        const idBatch = staleRowIds.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('guild_roster_cache')
          .delete()
          .in('id', idBatch);
        if (deleteError) {
          log.error(`Error deleting stale roster batch ${i / batchSize + 1}:`, deleteError);
        }
      }
    }

    log.info(`Successfully cached ${dedupedRosterData.length} roster members for guild ${sanitizePII(guildName, 'name')}`);
    await claimOrphanGuildOwnerFromRosterMatch(supabase, guildId);
  } catch (error) {
    log.error('Error storing full roster for guild:', error);
  }
}

async function claimOrphanGuildOwnerFromRosterMatch(
  supabase: any,
  guildId: string
): Promise<string | null> {
  try {
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('id, name, owner_id')
      .eq('id', guildId)
      .maybeSingle();

    if (guildError) {
      log.error(`Failed to load guild ${sanitizePII(guildId, 'id')} for roster owner claim:`, guildError);
      return null;
    }

    if (!guild || guild.owner_id) {
      return guild?.owner_id ?? null;
    }

    const { data: gmRows, error: gmRowsError } = await supabase
      .from('guild_roster_cache')
      .select('matched_user_id')
      .eq('guild_id', guildId)
      .eq('is_guild_master', true)
      .not('matched_user_id', 'is', null);

    if (gmRowsError) {
      log.error(
        `Failed to load roster GM matches for guild ${sanitizePII(guildId, 'id')}:`,
        gmRowsError,
      );
      return null;
    }

    const matchedOwnerIds = Array.from(
      new Set(
        (gmRows || [])
          .map((row: { matched_user_id: string | null }) => row.matched_user_id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    );

    if (matchedOwnerIds.length !== 1) {
      if (matchedOwnerIds.length > 1) {
        log.info(
          `Skipping roster owner claim for guild ${sanitizePII(guild.name, 'name')}: multiple matched GM users (${matchedOwnerIds.length})`,
        );
      }
      return null;
    }

    const matchedOwnerId = matchedOwnerIds[0];

    const { error: claimError } = await supabase
      .from('guilds')
      .update({ owner_id: matchedOwnerId })
      .eq('id', guildId)
      .is('owner_id', null);

    if (claimError) {
      log.error(
        `Failed to claim orphan guild ${sanitizePII(guild.name, 'name')} from roster GM match:`,
        claimError,
      );
      return null;
    }

    const { error: membershipError } = await supabase
      .from('guild_members')
      .upsert(
        {
          guild_id: guildId,
          user_id: matchedOwnerId,
          role: 'gm',
          status: 'confirmed',
        },
        { onConflict: 'guild_id,user_id' },
      );

    if (membershipError) {
      log.error(
        `Failed to upsert GM membership after roster owner claim for guild ${sanitizePII(guild.name, 'name')}:`,
        membershipError,
      );
      return null;
    }

    log.info(
      `Claimed orphan guild ${sanitizePII(guild.name, 'name')} from roster GM match for user ${sanitizePII(matchedOwnerId, 'id')}`,
    );
    return matchedOwnerId;
  } catch (error) {
    log.error('Error claiming orphan guild owner from roster match:', error);
    return null;
  }
}

/**
 * Safely reconciles app guild membership against the latest roster cache.
 * A member is removed only when we cannot find any evidence that they are still in the guild:
 * - no character match in latest `guild_roster_cache` for this guild, AND
 * - no membership row in `wow_guild_memberships` for this guild.
 *
 * Extra safety guards:
 * - requester user is never auto-removed in this flow;
 * - guild owner and GM roles are skipped.
 * - members with a valid Battle.net token are skipped (they can still be freshly synced);
 * - members with zero synced characters are skipped (insufficient evidence).
 */
async function reconcileGuildMembersWithRoster(
  supabase: any,
  guild: { id: string; name: string; server: string; owner_id: string | null },
  requesterUserId: string
) {
  try {
    const { data: members, error: membersError } = await supabase
      .from('guild_members')
      .select('id, user_id, role')
      .eq('guild_id', guild.id);

    if (membersError) {
      log.error('Failed to load guild members for reconciliation:', membersError);
      return { removed: 0, skipped: 0, candidates: 0 };
    }

    if (!members || members.length === 0) {
      return { removed: 0, skipped: 0, candidates: 0 };
    }

    const { data: rosterRows, error: rosterError } = await supabase
      .from('guild_roster_cache')
      .select('character_name, character_realm_slug')
      .eq('guild_id', guild.id);

    if (rosterError) {
      log.error('Failed to load guild roster cache for reconciliation:', rosterError);
      return { removed: 0, skipped: members.length, candidates: 0 };
    }

    // Do not reconcile if roster is empty; this usually means a transient upstream issue.
    if (!rosterRows || rosterRows.length === 0) {
      log.info(`Skipping reconciliation for guild ${sanitizePII(guild.id, 'id')} because roster cache is empty`);
      return { removed: 0, skipped: members.length, candidates: 0 };
    }

    const rosterKeySet = new Set<string>();
    for (const row of rosterRows) {
      if (!row?.character_name || !row?.character_realm_slug) continue;
      rosterKeySet.add(buildCharacterKey(row.character_name, row.character_realm_slug));
    }

    const memberUserIds = Array.from(
      new Set(
        members
          .map((member: { user_id: string }) => member.user_id)
          .filter((userId: string | null | undefined): userId is string => !!userId)
      )
    );

    if (memberUserIds.length === 0) {
      return { removed: 0, skipped: members.length, candidates: 0 };
    }

    const nowIso = new Date().toISOString();
    const { data: validTokenRows, error: validTokenError } = await supabase
      .from('battlenet_tokens')
      .select('user_id')
      .in('user_id', memberUserIds)
      .gt('expires_at', nowIso);

    if (validTokenError) {
      log.error('Failed to load valid battlenet_tokens for reconciliation:', validTokenError);
      return { removed: 0, skipped: members.length, candidates: 0 };
    }

    const validTokenUserIds = new Set(
      (validTokenRows || []).map((row: { user_id: string }) => row.user_id)
    );

    const { data: wowCharacters, error: wowCharsError } = await supabase
      .from('wow_characters')
      .select('user_id, name, realm_slug')
      .in('user_id', memberUserIds);

    if (wowCharsError) {
      log.error('Failed to load wow_characters for reconciliation:', wowCharsError);
      return { removed: 0, skipped: members.length, candidates: 0 };
    }

    const userCharacterKeys = new Map<string, Set<string>>();
    for (const char of (wowCharacters || [])) {
      if (!char?.user_id || !char?.name || !char?.realm_slug) continue;
      if (!userCharacterKeys.has(char.user_id)) {
        userCharacterKeys.set(char.user_id, new Set<string>());
      }
      userCharacterKeys.get(char.user_id)!.add(buildCharacterKey(char.name, char.realm_slug));
    }

    const guildServerSlug = toRealmSlug(guild.server);
    const { data: wowGuildMemberships, error: wowMembershipError } = await supabase
      .from('wow_guild_memberships')
      .select('user_id')
      .ilike('guild_name', guild.name)
      .ilike('guild_realm_slug', guildServerSlug);

    if (wowMembershipError) {
      log.error('Failed to load wow_guild_memberships for reconciliation:', wowMembershipError);
      return { removed: 0, skipped: members.length, candidates: 0 };
    }

    const wowMembershipUserIds = new Set(
      (wowGuildMemberships || []).map((row: { user_id: string }) => row.user_id)
    );

    const candidates: Array<{ id: string; user_id: string; role: string }> = [];
    let skipped = 0;

    for (const member of members) {
      if (!member?.id || !member?.user_id) {
        skipped += 1;
        continue;
      }

      if (member.user_id === requesterUserId || guild.owner_id === member.user_id || member.role === 'gm') {
        skipped += 1;
        continue;
      }

      const charKeys = userCharacterKeys.get(member.user_id);
      const hasAnyCharacterData = !!charKeys && charKeys.size > 0;
      const hasValidToken = validTokenUserIds.has(member.user_id);
      const hasRosterCharacterMatch = !!charKeys && Array.from(charKeys).some(charKey => rosterKeySet.has(charKey));
      const hasWowMembership = wowMembershipUserIds.has(member.user_id);

      if (hasValidToken || !hasAnyCharacterData) {
        skipped += 1;
        continue;
      }

      if (!hasRosterCharacterMatch && !hasWowMembership) {
        candidates.push({
          id: member.id,
          user_id: member.user_id,
          role: member.role,
        });
      }
    }

    let removed = 0;
    for (const candidate of candidates) {
      const { error: wishesDeleteError } = await supabase
        .from('class_wishes')
        .delete()
        .eq('guild_id', guild.id)
        .eq('user_id', candidate.user_id);

      if (wishesDeleteError) {
        log.error('Failed to delete wishes during guild reconciliation:', wishesDeleteError);
        continue;
      }

      const { error: memberDeleteError } = await supabase
        .from('guild_members')
        .delete()
        .eq('id', candidate.id);

      if (memberDeleteError) {
        log.error('Failed to delete guild member during guild reconciliation:', memberDeleteError);
        continue;
      }

      removed += 1;
    }

    if (removed > 0 || candidates.length > 0) {
      log.info(
        `Guild reconciliation for ${sanitizePII(guild.id, 'id')}: candidates=${candidates.length}, removed=${removed}, skipped=${skipped}`
      );
    }

    return { removed, skipped, candidates: candidates.length };
  } catch (error) {
    log.error('Error in reconcileGuildMembersWithRoster:', error);
    return { removed: 0, skipped: 0, candidates: 0 };
  }
}

/**
 * Fetches WoW characters from Battle.net API and stores them in the database.
 * Also fetches guild memberships and triggers auto-join for app guilds.
 * Uses multi-region fallback to find the correct region automatically.
 * 
 * @param supabase - Supabase client with service role key
 * @param accessToken - Battle.net OAuth access token
 * @param userId - Supabase user ID to associate characters with
 * @param preferredRegion - Battle.net region the user selected (will try others if this fails)
 * @returns Object with success status, detected region, and error details if any
 */
async function fetchAndStoreCharacters(
  supabase: any, 
  accessToken: string, 
  userId: string, 
  preferredRegion: BattleNetRegion = 'eu'
): Promise<{ success: boolean; detectedRegion?: BattleNetRegion; error?: string }> {
  try {
    log.info(`Starting character sync for user ${sanitizePII(userId, 'id')} (preferred region: ${preferredRegion.toUpperCase()})`);
    
    // Use multi-region fallback to find the correct region
    const profileResult = await fetchWowProfileWithRegionFallback(accessToken, preferredRegion);
    
    if (!profileResult.success || !profileResult.profile) {
      const errorMsg = profileResult.error?.message || 'Unknown error fetching WoW profile';
      log.error(`WoW profile fetch failed: ${errorMsg}`, {
        attemptedRegions: profileResult.error?.attemptedRegions,
        status: profileResult.error?.status,
      });
      return { 
        success: false, 
        error: errorMsg 
      };
    }
    
    const wowProfile = profileResult.profile;
    const detectedRegion = profileResult.workingRegion || preferredRegion;
    
    // Update battlenet_tokens with detected region if different from preferred
    if (detectedRegion !== preferredRegion) {
      log.info(`Updating stored region from ${preferredRegion.toUpperCase()} to ${detectedRegion.toUpperCase()}`);
      await supabase
        .from('battlenet_tokens')
        .update({ region: detectedRegion })
        .eq('user_id', userId);
    }
    
    // Use the detected region for subsequent API calls
    const region = detectedRegion;
    const apiUrl = BATTLENET_API_URLS[region];
    const namespace = BATTLENET_NAMESPACES[region];
    const locale = BATTLENET_LOCALES[region];

    log.debug('WoW Profile raw response keys:', Object.keys(wowProfile));

    const characters: CharacterData[] = [];

    if (!wowProfile.wow_accounts || wowProfile.wow_accounts.length === 0) {
      // This shouldn't happen if fallback worked, but log for diagnostics
      log.info(`No wow_accounts found in response for user ${sanitizePII(userId, 'id')} (region: ${region.toUpperCase()})`);
      log.info(`Response structure: ${JSON.stringify({
        hasWowAccounts: 'wow_accounts' in wowProfile,
        wowAccountsLength: wowProfile.wow_accounts?.length ?? 'undefined',
        topLevelKeys: Object.keys(wowProfile),
        hasCollections: !!wowProfile.collections,
        profileId: wowProfile.id ?? 'none',
      })}`);
      return { success: true, detectedRegion: region }; // Not an error, just no chars
    }

    log.debug(`Found ${wowProfile.wow_accounts.length} WoW account(s)`);

    // Flatten all characters from all WoW accounts
    for (const account of wowProfile.wow_accounts) {
      log.debug(`Processing WoW account ID: ${account.id}, characters count: ${account.characters?.length || 0}`);
      
      if (!account.characters || account.characters.length === 0) {
        continue;
      }

      for (const char of account.characters) {
        const name = char.name;
        const realm = char.realm?.name || char.realm?.slug || 'Unknown';
        const realmSlug = char.realm?.slug || 'unknown';
        const classId = char.playable_class?.id || 0;
        const level = char.level || 0;

        if (name) {
          characters.push({
            name,
            realm,
            realmSlug,
            classId,
            level,
          });
        }
      }
    }

    // Sort by level descending
    characters.sort((a, b) => b.level - a.level);
    log.info(`Total characters found: ${characters.length}`);

    if (characters.length === 0) {
      log.info('No characters to save');
      return { success: true, detectedRegion: region };
    }

    // Resolve previous main character key before deletion.
    // Priority:
    // 1) profiles.main_character_name (user-selected canonical value),
    // 2) wow_characters where is_main=true (fallback).
    const { data: profileMainRow } = await supabase
      .from('profiles')
      .select('main_character_name')
      .eq('id', userId)
      .maybeSingle();

    let previousMainKey: string | null = null;
    const profileMainCharacterName = typeof profileMainRow?.main_character_name === 'string'
      ? profileMainRow.main_character_name.trim()
      : '';

    if (profileMainCharacterName) {
      const separatorIndex = profileMainCharacterName.indexOf('-');
      if (separatorIndex > 0 && separatorIndex < profileMainCharacterName.length - 1) {
        const profileMainName = profileMainCharacterName.slice(0, separatorIndex);
        const profileMainRealmSlug = profileMainCharacterName.slice(separatorIndex + 1);
        previousMainKey = buildCharacterKey(profileMainName, profileMainRealmSlug);
      }
    }

    if (!previousMainKey) {
      const { data: currentMainRows, error: mainError } = await supabase
        .from('wow_characters')
        .select('name, realm_slug')
        .eq('user_id', userId)
        .eq('is_main', true);

      if (mainError) {
        log.info('Note: No current main character found (new user or first sync)');
      } else if (currentMainRows && currentMainRows.length > 0) {
        if (currentMainRows.length > 1) {
          log.info(`Multiple main characters found for user ${sanitizePII(userId, 'id')}, using first row`);
        }
        previousMainKey = buildCharacterKey(currentMainRows[0].name, currentMainRows[0].realm_slug);
      }
    }

    if (previousMainKey) {
      log.debug(`Previous main character: ${previousMainKey}`);
    }

    // Clear matched references in guild_roster_cache before deleting characters
    // (FK constraint: guild_roster_cache.matched_character_id -> wow_characters.id)
    const { data: userCharIds } = await supabase
      .from('wow_characters')
      .select('id')
      .eq('user_id', userId);
    
    if (userCharIds && userCharIds.length > 0) {
      const charIds = userCharIds.map((c: { id: string }) => c.id);
      await supabase
        .from('guild_roster_cache')
        .update({ matched_character_id: null, matched_user_id: null })
        .in('matched_character_id', charIds);
    }

    // Delete existing guild memberships and characters (in correct order for FK)
    await supabase.from('wow_guild_memberships').delete().eq('user_id', userId);
    await supabase.from('wow_characters').delete().eq('user_id', userId);

    // Insert characters - preserve previous main if it exists, otherwise default to highest level
    const insertData = characters.map((char, index) => {
      const charKey = buildCharacterKey(char.name, char.realmSlug);
      
      // Preserve previous main if it exists in the new character list
      const isMain = previousMainKey 
        ? charKey === previousMainKey 
        : index === 0;
      
      return {
        user_id: userId,
        name: char.name,
        realm: char.realm,
        realm_slug: char.realmSlug,
        class_id: char.classId,
        level: char.level,
        guild_name: null,
        is_main: isMain,
      };
    });

    // Ensure at least one character is main (fallback if previous main was deleted from Battle.net)
    const hasMain = insertData.some(c => c.is_main);
    if (!hasMain && insertData.length > 0) {
      insertData[0].is_main = true;
      log.info('Previous main character no longer exists on Battle.net, defaulting to highest level');
    }

    // Use upsert to handle race conditions (parallel syncs)
    const { data: insertedChars, error: charError } = await supabase
      .from('wow_characters')
      .upsert(insertData, { 
        onConflict: 'user_id,name,realm_slug',
        ignoreDuplicates: false 
      })
      .select('id, name, realm_slug');

    if (charError) {
      log.error('Failed to upsert characters:', charError);
      return { success: false, detectedRegion: region, error: 'Failed to save characters' };
    }

    const insertedCount = insertedChars?.length ?? 0;
    log.info(
      `Successfully saved ${characters.length} characters to database (upsert returned ${insertedCount})`
    );
    if (insertedCount !== characters.length) {
      const insertedKeys = new Set(
        (insertedChars ?? []).map(
          char => `${char.name.toLowerCase()}-${char.realm_slug.toLowerCase()}`
        )
      );
      const missingKeys = insertData
        .map(char => `${char.name.toLowerCase()}-${char.realm_slug.toLowerCase()}`)
        .filter(charKey => !insertedKeys.has(charKey));
      if (missingKeys.length > 0) {
        log.warn(
          `Upsert returned fewer characters than expected. Missing keys: ${missingKeys.join(', ')}`
        );
      }
    }

    // Do not rely only on upsert return payload for downstream matching. Depending on
    // PostgREST behavior, upsert can return fewer rows than provided input.
    const { data: persistedChars, error: persistedCharsError } = await supabase
      .from('wow_characters')
      .select('id, name, realm_slug')
      .eq('user_id', userId);

    if (persistedCharsError) {
      log.warn(`Failed to reload persisted characters after upsert: ${persistedCharsError.message}`);
    }

    const syncChars = (persistedChars && persistedChars.length > 0)
      ? persistedChars
      : (insertedChars || []);

    const syncCharByKey = new Map<string, { id: string; name: string; realm_slug: string }>();
    const syncCharById = new Map<string, { id: string; name: string; realm_slug: string }>();
    for (const syncChar of syncChars) {
      if (!syncChar?.id || !syncChar?.name || !syncChar?.realm_slug) continue;
      syncCharByKey.set(buildCharacterKey(syncChar.name, syncChar.realm_slug), syncChar);
      syncCharById.set(syncChar.id, syncChar);
    }

    // Sync profiles.main_character_name if not already set
    const mainChar = insertData.find(c => c.is_main);
    if (mainChar) {
      const mainCharName = `${mainChar.name}-${mainChar.realm_slug}`;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          main_character_name: mainCharName,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .is('main_character_name', null); // Only if not already set
      
      if (profileError) {
        log.debug(`Failed to set default main character: ${profileError.message}`);
      } else {
        log.info(`Set default main character: ${mainChar.name}`);
      }
    }

    // Fetch detailed character info for guild memberships
    const minGuildCharLevel = parseOptionalInt(GUILD_CHAR_MIN_LEVEL);
    const configuredGuildCharLimit = parseOptionalInt(GUILD_CHAR_MAX_CHECK);
    const maxGuildCharsToCheck =
      configuredGuildCharLimit === null || configuredGuildCharLimit <= 0
        ? null
        : Math.max(configuredGuildCharLimit, 1);
    const guildCharCandidates = minGuildCharLevel === null
      ? characters
      : characters.filter(c => c.level >= minGuildCharLevel);
    const guildCharsToCheck = maxGuildCharsToCheck === null
      ? guildCharCandidates
      : guildCharCandidates.slice(0, maxGuildCharsToCheck);
    log.debug(
      `Checking ${guildCharsToCheck.length} character(s) for guild info (min level: ${minGuildCharLevel ?? 'none'}, limit: ${maxGuildCharsToCheck ?? 'all'}).`
    );

    const guildMemberships: GuildMembershipData[] = [];
    const guildsToCheck: Map<string, { name: string; realmName: string; realmSlug: string; faction: string; characterIds: string[] }> = new Map();
    let characterDetailSuccessCount = 0;

    // Fetch character details to get guild info
    for (const char of guildCharsToCheck) {
      try {
        const charDetailUrl = `${apiUrl}/profile/wow/character/${char.realmSlug.toLowerCase()}/${char.name.toLowerCase()}?namespace=${namespace}&locale=${locale}`;
        
        const charDetailResponse = await fetch(charDetailUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!charDetailResponse.ok) {
          log.debug(`Failed to fetch details for ${char.name}: ${charDetailResponse.status}`);
          continue;
        }

        const charDetail = await charDetailResponse.json();
        characterDetailSuccessCount += 1;
        
        if (charDetail.guild) {
          log.debug(`Character ${sanitizePII(char.name, 'name')} is in guild: ${sanitizePII(charDetail.guild.name, 'name')}`);
          
          const guildRealm = resolveGuildRealmFields({
            realmName: charDetail.guild.realm?.name,
            realmSlug: charDetail.guild.realm?.slug,
            fallbackRealmName: char.realm,
          });
          const guildKey = `${charDetail.guild.name}-${guildRealm.realmSlug}`;
          const guildFaction = charDetail.guild.faction?.type || 'UNKNOWN';
          
          const insertedChar = syncCharByKey.get(buildCharacterKey(char.name, char.realmSlug));
          
          if (insertedChar) {
            await supabase
              .from('wow_characters')
              .update({ 
                guild_name: charDetail.guild.name,
                guild_realm: guildRealm.realmDisplayName,
              })
              .eq('id', insertedChar.id);

            if (!guildsToCheck.has(guildKey)) {
              guildsToCheck.set(guildKey, {
                name: charDetail.guild.name,
                realmName: guildRealm.realmDisplayName,
                realmSlug: guildRealm.realmSlug,
                faction: guildFaction,
                characterIds: [insertedChar.id],
              });
            } else {
              guildsToCheck.get(guildKey)!.characterIds.push(insertedChar.id);
            }
          }
        }
      } catch (err) {
        log.error(`Error fetching details for ${char.name}:`, err);
      }
    }

    log.debug(`Found ${guildsToCheck.size} unique guilds to check for ranks`);

    // Fetch roster for each guild to get member ranks
    for (const [, guildInfo] of guildsToCheck) {
      try {
        // Use public roster fetch with robust fallback (normalized + unicode slugs, multiple namespaces)
        // to avoid 404s on guild names with accents.
        const rosterDiagnostics = await fetchPublicGuildRosterWithDiagnostics(region, guildInfo.realmSlug, guildInfo.name, guildInfo.realmName);
        const rosterResult = rosterDiagnostics.data;

        if (!rosterResult) {
          log.debug(`Failed to fetch roster for ${guildInfo.name}: public roster fetch returned null`);
          const fallbackFaction = rosterDiagnostics.guildSummary?.faction || guildInfo.faction;

          for (const charId of guildInfo.characterIds) {
              guildMemberships.push({
                characterId: charId,
                guildName: guildInfo.name,
                guildRealm: guildInfo.realmName,
                guildRealmSlug: guildInfo.realmSlug,
                guildFaction: fallbackFaction,
                rankIndex: 99,
              rankName: 'Unknown',
            });
          }
          continue;
        }

        const rosterMembers = rosterResult.members || [];
        log.debug(`Roster has ${rosterMembers.length} members`);

        // Prefer guild faction coming from the roster payload (more reliable than character data,
        // especially with modern cross-faction guild setups)
        const rosterGuildFaction = rosterResult.faction || guildInfo.faction || 'UNKNOWN';

        // Store full roster for this guild (for GMs to see all members)
        await storeFullRoster(
          supabase,
          guildInfo.name,
          guildInfo.realmSlug,
          rosterGuildFaction,
          region,
          rosterMembers
        );

        for (const charId of guildInfo.characterIds) {
          const insertedChar = syncCharById.get(charId);
          if (!insertedChar) continue;

          const charName = insertedChar.name?.toLowerCase();
          const charRealm = insertedChar.realm_slug?.toLowerCase();
          const nameMatches = charName
            ? rosterMembers.filter(
                (m: any) => m.character?.name?.toLowerCase() === charName
              )
            : [];

          if (nameMatches.length > 1) {
            const realmList = nameMatches
              .map((m: any) => m.character?.realm?.slug)
              .filter(Boolean)
              .join(', ');
            log.info(
              `Multiple roster matches for ${sanitizePII(insertedChar.name, 'name')} (${nameMatches.length}): realms=${realmList || 'unknown'}`
            );
          }

          // Match by BOTH name AND realm to handle cross-realm guilds correctly.
          // This prevents mismatches when a user has multiple characters with the same name.
          let rosterMember = nameMatches.find(
            (m: any) => m.character?.realm?.slug?.toLowerCase() === charRealm
          );

          // Fallback: only use name-only match when it's unambiguous (or realm missing).
          if (!rosterMember && nameMatches.length > 0) {
            if (!charRealm || nameMatches.length === 1) {
              rosterMember = nameMatches[0];
              const expectedRealm = charRealm || 'unknown';
              log.info(
                `Realm fallback match for ${sanitizePII(insertedChar.name, 'name')}: expected realm ${expectedRealm}, matched ${rosterMember.character?.realm?.slug}`
              );
            } else {
              log.info(
                `Ambiguous roster match for ${sanitizePII(insertedChar.name, 'name')} (${nameMatches.length} candidates); skipping name-only fallback`
              );
            }
          }

          if (rosterMember) {
            log.debug(`Found ${sanitizePII(insertedChar.name, 'name')}-${insertedChar.realm_slug} in roster with rank ${rosterMember.rank}`);
            guildMemberships.push({
              characterId: charId,
              guildName: guildInfo.name,
              guildRealm: guildInfo.realmName,
              guildRealmSlug: guildInfo.realmSlug,
              guildFaction: rosterGuildFaction,
              rankIndex: rosterMember.rank ?? 99,
              rankName: rosterMember.rank === 0 ? 'Guild Master' : `Rank ${rosterMember.rank}`,
            });
          } else {
            guildMemberships.push({
              characterId: charId,
              guildName: guildInfo.name,
              guildRealm: guildInfo.realmName,
              guildRealmSlug: guildInfo.realmSlug,
              guildFaction: rosterGuildFaction,
              rankIndex: 99,
              rankName: 'Unknown',
            });
          }
        }
      } catch (err) {
        log.error(`Error fetching roster for ${guildInfo.name}:`, err);
      }
    }

    // Insert guild memberships
    if (guildMemberships.length > 0) {
      log.info(`Inserting ${guildMemberships.length} guild memberships`);
      
      const membershipData = guildMemberships.map(gm => ({
        user_id: userId,
        character_id: gm.characterId,
        guild_name: gm.guildName,
        guild_realm: gm.guildRealm,
        guild_realm_slug: gm.guildRealmSlug,
        guild_faction: gm.guildFaction,
        guild_region: region,
        rank_index: gm.rankIndex,
        rank_name: gm.rankName,
      }));

      const uniqueCharacterIds = Array.from(
        new Set(membershipData.map(m => m.character_id))
      );

      const { data: existingChars, error: existingCharsError } = await supabase
        .from('wow_characters')
        .select('id')
        .in('id', uniqueCharacterIds)
        .eq('user_id', userId);

      if (existingCharsError) {
        log.error('Failed to verify character ids for guild memberships:', existingCharsError);
      }

      const existingCharIdSet = new Set(
        (existingChars || []).map((char: { id: string }) => char.id)
      );

      const filteredMembershipData = membershipData.filter(m =>
        existingCharIdSet.has(m.character_id)
      );

      if (filteredMembershipData.length !== membershipData.length) {
        log.info(
          `Skipping ${membershipData.length - filteredMembershipData.length} guild memberships because characters no longer exist`
        );
      }

      if (filteredMembershipData.length === 0) {
        log.info('No valid guild memberships to insert after character verification');
      } else {
        const { error: membershipError } = await supabase
          .from('wow_guild_memberships')
          .insert(filteredMembershipData);

        if (membershipError) {
          log.error('Failed to insert guild memberships:', membershipError);
        } else {
          log.info(`Successfully saved ${filteredMembershipData.length} guild memberships`);
          
          const gmMemberships = guildMemberships.filter(gm => gm.rankIndex === 0);
          if (gmMemberships.length > 0) {
            log.info(`User is Guild Master of ${gmMemberships.length} guild(s)!`);
          }
        }
      }

    }

    // Only run cleanup when we have at least one successful character-detail fetch
    // (or no characters to check), to avoid accidental removals on transient API failures.
    const allowGuildCleanup = guildCharsToCheck.length === 0 || characterDetailSuccessCount > 0;
    await autoJoinGuilds(supabase, userId, guildMemberships, region, allowGuildCleanup);

    // Re-establish matched_user_id links in guild_roster_cache for this user's characters
    // This fixes the issue where syncing a user's characters would clear the links
    if (syncChars.length > 0) {
      log.info(`Re-matching ${syncChars.length} characters in guild_roster_cache...`);
      
      for (const char of syncChars) {
        // Blizzard APIs may return strings with different Unicode normalization (NFC vs NFD).
        // Postgres string equality/ILIKE is normalization-sensitive, so we try a few variants.
        const rawName = (char.name || '').trim();
        const rawRealmSlug = (char.realm_slug || '').trim();

        const nameVariants = Array.from(
          new Set([
            rawName,
            rawName ? rawName.normalize('NFC') : rawName,
            rawName ? rawName.normalize('NFD') : rawName,
          ].filter(Boolean))
        );

        const realmSlugVariants = Array.from(
          new Set([
            rawRealmSlug,
            rawRealmSlug ? rawRealmSlug.normalize('NFC') : rawRealmSlug,
            rawRealmSlug ? rawRealmSlug.normalize('NFD') : rawRealmSlug,
          ].filter(Boolean))
        );

        let matched = false;
        for (const nameVariant of nameVariants) {
          for (const realmSlugVariant of realmSlugVariants) {
            const { data: matchedRows, error: matchError } = await supabase
              .from('guild_roster_cache')
              .update({
                matched_user_id: userId,
                matched_character_id: char.id,
              })
              .ilike('character_name', nameVariant)
              .ilike('character_realm_slug', realmSlugVariant)
              .select('id');

            if (matchError) {
              log.debug(`Failed to re-match character ${char.name}: ${matchError.message}`);
              continue;
            }

            if (matchedRows && matchedRows.length > 0) {
              matched = true;
              break;
            }
          }
          if (matched) break;
        }

        if (!matched) {
          // Fallback: some cached rows may have an incorrect realm slug fallback
          // but still expose the realm name. Re-match by character_name + normalized realm name
          // and fix character_realm_slug while linking.
          const normalizedExpectedRealm = toRealmSlug(rawRealmSlug);
          if (normalizedExpectedRealm) {
            const { data: realmNameRows, error: realmNameError } = await supabase
              .from('guild_roster_cache')
              .select('id, character_realm, character_realm_slug')
              .ilike('character_name', rawName);

            if (!realmNameError && realmNameRows && realmNameRows.length > 0) {
              const matchingIds = realmNameRows
                .filter((row: any) => {
                  const realmFromName = toRealmSlug((row?.character_realm || '').trim());
                  const realmFromSlug = toRealmSlug((row?.character_realm_slug || '').trim());
                  return realmFromName === normalizedExpectedRealm || realmFromSlug === normalizedExpectedRealm;
                })
                .map((row: any) => row.id)
                .filter(Boolean);

              if (matchingIds.length > 0) {
                const { data: fallbackMatchedRows, error: fallbackUpdateError } = await supabase
                  .from('guild_roster_cache')
                  .update({
                    matched_user_id: userId,
                    matched_character_id: char.id,
                    character_realm: rawRealmSlug,
                    character_realm_slug: rawRealmSlug,
                  })
                  .in('id', matchingIds)
                  .select('id');

                if (!fallbackUpdateError && fallbackMatchedRows && fallbackMatchedRows.length > 0) {
                  matched = true;
                  log.info(
                    `Realm-name fallback re-match succeeded for ${sanitizePII(char.name, 'name')} on ${sanitizePII(rawRealmSlug, 'name')} (${fallbackMatchedRows.length} row(s))`
                  );
                }
              }
            }
          }
        }

        if (!matched) {
          log.info(
            `No guild_roster_cache rows matched for character ${sanitizePII(char.name, 'name')} (${sanitizePII(char.realm_slug, 'name')})`
          );
        }
      }
      
      log.info('Re-matching complete');

      const { data: gmRosterGuildRows, error: gmRosterGuildRowsError } = await supabase
        .from('guild_roster_cache')
        .select('guild_id')
        .eq('matched_user_id', userId)
        .eq('is_guild_master', true);

      if (gmRosterGuildRowsError) {
        log.error('Failed to load roster GM guilds for owner claim:', gmRosterGuildRowsError);
      } else {
        const guildIdsToClaim = Array.from(
          new Set(
            (gmRosterGuildRows || [])
              .map((row: { guild_id: string | null }) => row.guild_id)
              .filter((value): value is string => typeof value === 'string' && value.length > 0),
          ),
        );

        for (const guildId of guildIdsToClaim) {
          await claimOrphanGuildOwnerFromRosterMatch(supabase, guildId);
        }
      }
    }

    return { success: true, detectedRegion: region };
  } catch (error) {
    log.error('Error fetching characters:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Cleans up guild memberships for guilds the user has left in WoW.
 * If the user was the owner, the guild becomes orphaned (owner_id = null).
 * 
 * @param supabase - Supabase client
 * @param userId - User ID to cleanup memberships for
 * @param currentWoWGuilds - Set of guild keys the user is currently in (format: "guildname-realmslug")
 */
async function cleanupLeftGuilds(
  supabase: any,
  userId: string,
  currentWoWGuilds: Set<string>
) {
  try {
    log.debug('Cleaning up left guilds for user...');

    const { data: appMemberships, error: lookupError } = await supabase
      .from('guild_members')
      .select('id, guild_id, role, guilds(id, name, server, owner_id)')
      .eq('user_id', userId);

    if (lookupError) {
      log.error('Error looking up app guild memberships:', lookupError);
      return;
    }

    if (!appMemberships || appMemberships.length === 0) {
      log.debug('No app guild memberships to cleanup');
      return;
    }

    for (const membership of appMemberships) {
      const guild = membership.guilds;
      if (!guild) continue;

      const serverSlug = toRealmSlug(guild.server);
      const guildKey = `${guild.name.toLowerCase()}-${serverSlug}`;

      if (!currentWoWGuilds.has(guildKey)) {
        log.info(`User no longer in WoW guild ${sanitizePII(guild.name, 'name')}, removing from app...`);

        const { error: wishesDeleteError } = await supabase
          .from('class_wishes')
          .delete()
          .eq('guild_id', guild.id)
          .eq('user_id', userId);

        if (wishesDeleteError) {
          log.error(`Error deleting wishes for removed guild ${sanitizePII(guild.name, 'name')}:`, wishesDeleteError);
        }

        if (guild.owner_id === userId) {
          log.info(`User was owner of guild ${sanitizePII(guild.name, 'name')}, making it orphan...`);
          await supabase
            .from('guilds')
            .update({ owner_id: null })
            .eq('id', guild.id);
        }

        await supabase
          .from('guild_members')
          .delete()
          .eq('id', membership.id);
      }
    }

    log.debug('Cleanup of left guilds completed');
  } catch (error) {
    log.error('Error in cleanupLeftGuilds:', error);
  }
}

/**
 * Deletes wishes that no longer have a matching guild_members row for the user.
 * This catches historical orphan wishes that may remain after older cleanup flows.
 */
async function cleanupOrphanWishes(
  supabase: any,
  userId: string
) {
  try {
    const { data: memberGuildRows, error: memberGuildsError } = await supabase
      .from('guild_members')
      .select('guild_id')
      .eq('user_id', userId);

    if (memberGuildsError) {
      log.error('Error loading member guilds for orphan wish cleanup:', memberGuildsError);
      return;
    }

    const memberGuildIds = new Set(
      (memberGuildRows || []).map((row: { guild_id: string }) => row.guild_id)
    );

    const { data: wishGuildRows, error: wishGuildsError } = await supabase
      .from('class_wishes')
      .select('guild_id')
      .eq('user_id', userId);

    if (wishGuildsError) {
      log.error('Error loading user wishes for orphan cleanup:', wishGuildsError);
      return;
    }

    const orphanGuildIds = Array.from(
      new Set(
        (wishGuildRows || [])
          .map((row: { guild_id: string }) => row.guild_id)
          .filter((guildId: string) => !memberGuildIds.has(guildId))
      )
    );

    if (orphanGuildIds.length === 0) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('class_wishes')
      .delete()
      .eq('user_id', userId)
      .in('guild_id', orphanGuildIds);

    if (deleteError) {
      log.error('Error deleting orphan wishes:', deleteError);
      return;
    }

    log.info(`Deleted orphan wishes for user ${sanitizePII(userId, 'id')} in ${orphanGuildIds.length} guild(s)`);
  } catch (error) {
    log.error('Error in cleanupOrphanWishes:', error);
  }
}

/**
 * Best-effort reconciliation for WoW guild renames.
 *
 * Problem: the app historically keyed guilds by (region, serverSlug, name). If a WoW guild is renamed,
 * the user would appear to have "left" the old guild and "joined" a new one, orphaning data.
 *
 * Strategy: when a user is GM in WoW for a guild we cannot find by the current name, try to locate an
 * existing app guild on the same realm that is strongly associated with that user (owner/GM).
 * If exactly one candidate is found, rename that app guild to the current WoW name so we keep the same guild_id.
 */
async function reconcileRenamedGuildIfPossible(
  supabase: any,
  userId: string,
  guildInfo: Pick<GuildInfo, 'name' | 'server' | 'region' | 'faction'>
): Promise<string | null> {
  try {
    // Owner candidates (strongest signal: this is the guild whose data the GM cares about).
    const { data: ownerCandidates, error: ownerCandidatesError } = await supabase
      .from('guilds')
      .select('id, name, owner_id, faction')
      .eq('region', guildInfo.region)
      .eq('server', guildInfo.server)
      .eq('owner_id', userId)
      .neq('name', guildInfo.name);

    if (ownerCandidatesError) {
      log.error('Error loading owner candidates for rename reconciliation:', ownerCandidatesError);
    }

    // GM candidates via guild_members (works when membership still exists).
    const { data: gmMembershipRows, error: gmMembershipError } = await supabase
      .from('guild_members')
      .select('guild_id, guilds(id, name, server, region, faction)')
      .eq('user_id', userId)
      .eq('role', 'gm');

    if (gmMembershipError) {
      log.error('Error loading GM membership candidates for rename reconciliation:', gmMembershipError);
    }

    const gmGuildCandidates = (gmMembershipRows || [])
      .map((row: any) => row.guilds)
      .filter(Boolean)
      .filter((g: any) =>
        String(g.region).toLowerCase() === String(guildInfo.region).toLowerCase() &&
        String(g.server).toLowerCase() === String(guildInfo.server).toLowerCase() &&
        String(g.name) !== String(guildInfo.name)
      )
      .map((g: any) => ({
        id: g.id,
        name: g.name,
        faction: g.faction ?? null,
      }));

    const byId = new Map<string, any>();
    for (const c of ([...(ownerCandidates || []), ...gmGuildCandidates] as any[])) {
      if (!c?.id) continue;
      byId.set(c.id, c);
    }

    const candidates = Array.from(byId.values());
    if (candidates.length === 0) return null;

    if (candidates.length > 1) {
      const candidateList = candidates
        .map((c) => `${sanitizePII(c.name, 'name')}(${sanitizePII(c.id, 'id')})`)
        .join(', ');
      log.info(
        `Rename reconciliation skipped for ${sanitizePII(guildInfo.name, 'name')} on ${sanitizePII(guildInfo.server, 'name')}: multiple candidates (${candidates.length}): ${candidateList}`
      );
      return null;
    }

    const candidate = candidates[0];

    const normalizeNameKey = (name: string | null | undefined) => {
      const n = String(name ?? '').trim().toLowerCase();
      if (!n || n === 'unknown') return null;
      return n;
    };

    const normalizeFullKey = (name: string | null | undefined, realmSlug: string | null | undefined) => {
      const nameKey = normalizeNameKey(name);
      const realmKey = String(realmSlug ?? '').trim().toLowerCase();
      if (!nameKey) return null;
      if (!realmKey || realmKey === 'unknown') return null;
      return `${nameKey}-${realmKey}`;
    };

    const sizeOfIntersection = (a: Set<string>, b: Set<string>) => {
      let count = 0;
      const [small, big] = a.size <= b.size ? [a, b] : [b, a];
      for (const v of small) {
        if (big.has(v)) count++;
      }
      return count;
    };

    // Extra safety: ensure the *old* guild name is actually not found on Blizzard.
    // If it is found, it likely represents a different, still-existing guild on the same realm.
    const candidateCheck = await fetchPublicGuildRosterWithDiagnostics(
      guildInfo.region,
      guildInfo.server,
      candidate.name,
      guildInfo.server
    );

    if (candidateCheck.data) {
      log.info(
        `Rename reconciliation skipped: candidate guild still exists on Blizzard (${sanitizePII(candidate.name, 'name')} on ${sanitizePII(guildInfo.server, 'name')}).`
      );
      return null;
    }

    if (candidateCheck.failure?.status !== 404) {
      log.info(
        `Rename reconciliation skipped: could not confirm old-name 404 on Blizzard for ${sanitizePII(candidate.name, 'name')} (status=${candidateCheck.failure?.status ?? 'unknown'}).`
      );
      return null;
    }

    // Extra safety: ensure the new guild shares a strong member overlap with the cached old guild.
    // This reduces false positives for "disband + new guild" scenarios.
    const cachedOldMembers = await fetchAllGuildRosterCacheMembersForOverlap(supabase, candidate.id);
    const oldNameSet = new Set<string>();
    const oldFullSet = new Set<string>();
    for (const row of cachedOldMembers) {
      const nameKey = normalizeNameKey(row.character_name);
      if (nameKey) oldNameSet.add(nameKey);
      const fullKey = normalizeFullKey(row.character_name, row.character_realm_slug);
      if (fullKey) oldFullSet.add(fullKey);
    }

    const newRoster = await fetchPublicGuildRosterWithDiagnostics(
      guildInfo.region,
      guildInfo.server,
      guildInfo.name,
      guildInfo.server
    );

    if (!newRoster.data) {
      log.info(
        `Rename reconciliation skipped: could not fetch new guild members for ${sanitizePII(guildInfo.name, 'name')} on ${sanitizePII(guildInfo.server, 'name')}.`
      );
      return null;
    }

    const newNameSet = new Set<string>();
    const newFullSet = new Set<string>();
    for (const m of (newRoster.data.members || [])) {
      const name = m?.character?.name;
      const realmSlug = m?.character?.realm?.slug;
      const nameKey = normalizeNameKey(name);
      if (nameKey) newNameSet.add(nameKey);
      const fullKey = normalizeFullKey(name, realmSlug);
      if (fullKey) newFullSet.add(fullKey);
    }

    const useFullKeys = oldFullSet.size >= 10 && newFullSet.size >= 10;
    const oldSet = useFullKeys ? oldFullSet : oldNameSet;
    const newSet = useFullKeys ? newFullSet : newNameSet;

    const oldCount = oldSet.size;
    const newCount = newSet.size;
    const intersection = sizeOfIntersection(oldSet, newSet);

    if (oldCount === 0 || newCount === 0) {
      log.info(
        `Rename reconciliation skipped: insufficient member evidence (old=${oldCount}, new=${newCount}) for ${sanitizePII(candidate.name, 'name')} -> ${sanitizePII(guildInfo.name, 'name')}.`
      );
      return null;
    }

    const minCount = Math.min(oldCount, newCount);
    const maxCount = Math.max(oldCount, newCount);
    const overlapOfSmaller = minCount > 0 ? intersection / minCount : 0;
    const sizeRatio = maxCount > 0 ? minCount / maxCount : 0;

    const strongOverlap =
      // Small guilds: require near-identical size and full containment
      (minCount < 10
        ? minCount >= 2 && intersection === minCount && sizeRatio >= 0.7
        : intersection >= 10 && overlapOfSmaller >= 0.8 && sizeRatio >= 0.7);

    if (!strongOverlap) {
      log.info(
        `Rename reconciliation skipped: weak member overlap (${useFullKeys ? 'fullKey' : 'nameKey'}) ` +
          `old=${oldCount} new=${newCount} intersection=${intersection} overlapOfSmaller=${overlapOfSmaller.toFixed(2)} sizeRatio=${sizeRatio.toFixed(2)} ` +
          `candidate=${sanitizePII(candidate.name, 'name')} newName=${sanitizePII(guildInfo.name, 'name')}`
      );
      return null;
    }

    log.info(
      `Reconciling renamed guild: ${sanitizePII(candidate.name, 'name')} -> ${sanitizePII(guildInfo.name, 'name')} on ${sanitizePII(guildInfo.server, 'name')} (id=${sanitizePII(candidate.id, 'id')})`
    );

    const { error: renameError } = await supabase
      .from('guilds')
      .update({
        name: guildInfo.name,
        faction: guildInfo.faction,
      })
      .eq('id', candidate.id);

    if (renameError) {
      log.error('Failed to reconcile renamed guild (update failed):', renameError);
      return null;
    }

    return candidate.id;
  } catch (error) {
    log.error('Error in reconcileRenamedGuildIfPossible:', error);
    return null;
  }
}

/**
 * Auto-creates or joins app guilds based on WoW guild memberships.
 * Handles ownership based on GM status - Battle.net is the source of truth.
 * 
 * @param supabase - Supabase client
 * @param userId - User ID to process guilds for
 * @param guildMemberships - Array of guild membership data from WoW
 * @param region - Battle.net region
 */
async function autoJoinGuilds(
  supabase: any,
  userId: string,
  guildMemberships: GuildMembershipData[],
  region: BattleNetRegion = 'eu',
  allowCleanup = true
) {
  try {
    // Group memberships by unique guild
    const uniqueGuilds = new Map<string, GuildInfo>();

    for (const membership of guildMemberships) {
      const guildKey = `${membership.guildName.toLowerCase()}-${membership.guildRealmSlug}`;
      const existing = uniqueGuilds.get(guildKey);
      const isGM = membership.rankIndex === 0;
      
      if (!existing) {
        uniqueGuilds.set(guildKey, {
          name: membership.guildName,
          server: membership.guildRealm,
          serverSlug: membership.guildRealmSlug,
          faction: membership.guildFaction.toLowerCase() === 'horde' ? 'horde' : 'alliance',
          region,
          isGM,
        });
      } else if (isGM && !existing.isGM) {
        existing.isGM = true;
      }
    }

    const currentWoWGuilds = new Set<string>(uniqueGuilds.keys());
    log.debug(`Processing ${uniqueGuilds.size} unique guilds for auto-join...`);

    for (const [, guildInfo] of uniqueGuilds) {
      try {
        const { data: existingGuildInitial, error: guildLookupError } = await supabase
          .from('guilds')
          .select('id, owner_id, faction, server')
          .eq('name', guildInfo.name)
          .eq('server', guildInfo.server)
          .eq('region', guildInfo.region)
          .maybeSingle();

        if (guildLookupError) {
          log.error(`Error looking up guild ${sanitizePII(guildInfo.name, 'name')}:`, guildLookupError);
          continue;
        }

        let existingGuild = existingGuildInitial;
        let guildId: string;

        if (!existingGuild) {
          const { data: guildCandidates, error: guildCandidatesError } = await supabase
            .from('guilds')
            .select('id, owner_id, faction, server')
            .eq('name', guildInfo.name)
            .eq('region', guildInfo.region);

          if (guildCandidatesError) {
            log.error(`Error loading guild candidates for ${sanitizePII(guildInfo.name, 'name')}:`, guildCandidatesError);
          } else if (guildCandidates?.length) {
            const normalizedMatches = guildCandidates.filter((candidate: { server: string }) =>
              normalizeRealmKey(candidate.server) === normalizeRealmKey(guildInfo.server)
            );

            if (normalizedMatches.length > 0) {
              existingGuild = normalizedMatches[0];
              if (normalizedMatches.length > 1) {
                log.info(
                  `Multiple normalized realm matches found for ${sanitizePII(guildInfo.name, 'name')} on ${sanitizePII(guildInfo.server, 'name')}; using first candidate ${sanitizePII(existingGuild.id, 'id')}`
                );
              }
            }
          }
        }

        if (!existingGuild && guildInfo.isGM) {
          // Attempt to reconcile renamed guilds BEFORE we create a new record.
          // This prevents orphaning existing data when Blizzard guild names change.
          const reconciledGuildId = await reconcileRenamedGuildIfPossible(supabase, userId, guildInfo);
          if (reconciledGuildId) {
            const { data: reconciledGuild, error: reconciledGuildError } = await supabase
              .from('guilds')
              .select('id, owner_id, faction, server')
              .eq('id', reconciledGuildId)
              .maybeSingle();

            if (reconciledGuildError) {
              log.error('Error reloading reconciled guild:', reconciledGuildError);
            } else {
              existingGuild = reconciledGuild;
            }
          }
        }

        if (existingGuild) {
          guildId = existingGuild.id;
          log.debug(`Guild ${sanitizePII(guildInfo.name, 'name')} already exists (id: ${sanitizePII(guildId, 'id')})`);

          if (shouldRepairGuildServerDisplay(existingGuild.server, guildInfo.server)) {
            log.info(
              `Repairing stored realm display name for ${sanitizePII(guildInfo.name, 'name')} from ${sanitizePII(existingGuild.server, 'name')} to ${sanitizePII(guildInfo.server, 'name')}`
            );
            await supabase
              .from('guilds')
              .update({ server: guildInfo.server })
              .eq('id', guildId);
          }

          // Update faction if it changed in Battle.net (source of truth)
          if (existingGuild.faction !== guildInfo.faction) {
            log.info(`Updating faction for guild ${sanitizePII(guildInfo.name, 'name')} from ${existingGuild.faction} to ${guildInfo.faction}`);
            await supabase
              .from('guilds')
              .update({ faction: guildInfo.faction })
              .eq('id', guildId);
          }
          // Handle ownership changes
          if (existingGuild.owner_id === userId && !guildInfo.isGM) {
            // User lost GM status - revoke ownership
            log.info(`User lost GM status for guild ${sanitizePII(guildInfo.name, 'name')}, revoking ownership...`);
            await supabase
              .from('guilds')
              .update({ owner_id: null })
              .eq('id', guildId);
          } else if (existingGuild.owner_id === null && guildInfo.isGM) {
            // Guild is orphan and user is GM - claim ownership
            log.info(`Guild ${sanitizePII(guildInfo.name, 'name')} is orphan and user is GM, claiming ownership...`);
            await supabase
              .from('guilds')
              .update({ owner_id: userId })
              .eq('id', guildId);
            await syncExistingMembers(supabase, guildId, guildInfo.name, guildInfo.serverSlug, guildInfo.region);
          } else if (existingGuild.owner_id !== null && existingGuild.owner_id !== userId && guildInfo.isGM) {
            // Battle.net is source of truth: new GM takes ownership immediately
            log.info(`User is now GM in WoW for guild ${sanitizePII(guildInfo.name, 'name')}, transferring ownership...`);
            
            const previousOwnerId = existingGuild.owner_id;
            
            await supabase
              .from('guilds')
              .update({ owner_id: userId })
              .eq('id', guildId);

            await supabase
              .from('guild_members')
              .update({ role: 'member' })
              .eq('guild_id', guildId)
              .eq('user_id', previousOwnerId);

            await syncExistingMembers(supabase, guildId, guildInfo.name, guildInfo.serverSlug, guildInfo.region);
          }
        } else {
          // Create new guild
          const { data: newGuild, error: createGuildError } = await supabase
            .from('guilds')
            .insert({
              name: guildInfo.name,
              server: guildInfo.server,
              region: guildInfo.region,
              faction: guildInfo.faction,
              owner_id: guildInfo.isGM ? userId : null,
              created_by_user_id: userId,
            })
            .select('id')
            .single();

          if (createGuildError || !newGuild) {
            log.error(`Failed to create guild ${sanitizePII(guildInfo.name, 'name')}:`, createGuildError);
            continue;
          }

          guildId = newGuild.id;
          log.info(`Created guild ${sanitizePII(guildInfo.name, 'name')} (id: ${sanitizePII(guildId, 'id')}) ${guildInfo.isGM ? 'with user as owner' : 'as orphan'}`);
        }

        // Check/update membership
        const { data: existingMembership } = await supabase
          .from('guild_members')
          .select('id, role')
          .eq('guild_id', guildId)
          .eq('user_id', userId)
          .maybeSingle();

        const role = guildInfo.isGM ? 'gm' : 'member';

        if (existingMembership) {
          if (existingMembership.role !== role) {
            await supabase
              .from('guild_members')
              .update({ role })
              .eq('id', existingMembership.id);
            log.debug(`Updated user role from ${existingMembership.role} to ${role} for guild ${sanitizePII(guildInfo.name, 'name')}`);
          }
        } else {
          const { error: insertError } = await supabase
            .from('guild_members')
            .insert({
              guild_id: guildId,
              user_id: userId,
              role,
              status: 'potential',
            });
          
          if (insertError) {
            log.error(`Failed to join guild ${sanitizePII(guildInfo.name, 'name')}:`, insertError);
          } else {
            log.info(`User joined guild ${sanitizePII(guildInfo.name, 'name')} as ${role}`);
          }
        }
      } catch (err) {
        log.error(`Error processing guild ${sanitizePII(guildInfo.name, 'name')}:`, err);
      }
    }

    if (allowCleanup) {
      await cleanupLeftGuilds(supabase, userId, currentWoWGuilds);
    } else {
      log.info(`Skipping guild membership cleanup for user ${sanitizePII(userId, 'id')} due to missing character detail fetch results`);
    }

    await cleanupOrphanWishes(supabase, userId);

    log.info('Auto-join guilds completed');
  } catch (error) {
    log.error('Error in autoJoinGuilds:', error);
  }
}

/**
 * Syncs existing users who have this guild in wow_guild_memberships to guild_members.
 * Called when a GM claims an orphan guild to add all existing WoW guild members.
 * 
 * @param supabase - Supabase client
 * @param guildId - App guild ID
 * @param guildName - Guild name for lookup
 * @param guildServer - Guild server for lookup
 */
async function syncExistingMembers(
  supabase: any,
  guildId: string,
  guildName: string,
  guildServerSlug: string,
  guildRegion: BattleNetRegion
) {
  try {
    log.debug(`Syncing existing members for guild ${sanitizePII(guildName, 'name')}...`);

    const { data: wowMemberships, error: lookupError } = await supabase
      .from('wow_guild_memberships')
      .select('user_id, rank_index')
      .ilike('guild_name', guildName)
      .ilike('guild_realm_slug', guildServerSlug)
      .ilike('guild_region', guildRegion);

    if (lookupError) {
      log.error('Error looking up wow_guild_memberships:', lookupError);
      return;
    }

    if (!wowMemberships || wowMemberships.length === 0) {
      log.debug('No existing members found in wow_guild_memberships');
      return;
    }

    log.debug(`Found ${wowMemberships.length} potential members to sync`);

    const userRoles = new Map<string, boolean>();
    for (const membership of wowMemberships) {
      const existing = userRoles.get(membership.user_id);
      const isGM = membership.rank_index === 0;
      if (!existing || isGM) {
        userRoles.set(membership.user_id, isGM);
      }
    }

    for (const [syncUserId, isGM] of userRoles) {
      const { data: existingMember } = await supabase
        .from('guild_members')
        .select('id')
        .eq('guild_id', guildId)
        .eq('user_id', syncUserId)
        .maybeSingle();

      if (existingMember) {
        continue;
      }

      const role = isGM ? 'gm' : 'member';
      await supabase
        .from('guild_members')
        .insert({
          guild_id: guildId,
          user_id: syncUserId,
          role,
          status: 'active',
        });
      log.debug(`Added user ${sanitizePII(syncUserId, 'id')} to guild as ${role}`);
    }

    log.info(`Sync completed for guild ${sanitizePII(guildName, 'name')}`);
  } catch (error) {
    log.error('Error in syncExistingMembers:', error);
  }
}
