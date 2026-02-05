import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  guildName: string
): Promise<{ members: any[]; faction: string } | null> {
  try {
    const clientToken = await getClientCredentialsToken(region);
    if (!clientToken) {
      log.error('Could not get client token for public roster fetch');
      return null;
    }

    const apiUrl = BATTLENET_API_URLS[region];
    const locale = BATTLENET_LOCALES[region];
    const serverSlug = realmSlug.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');

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

    let lastFailure: { status: number; body: string; rosterUrl: string; namespace: string; slugType: string } | null = null;

    for (const { slug: guildSlug, type: slugType } of slugsToTry) {
      for (const namespace of namespacesToTry) {
        const rosterUrl = `${apiUrl}/data/wow/guild/${serverSlug}/${encodeURIComponent(guildSlug)}/roster?namespace=${namespace}&locale=${locale}`;
        
        if (isTargetedGuild) {
          log.info(`[TARGETED] Trying ${guildName}: slugType=${slugType}, slug="${guildSlug}", url=${rosterUrl}`);
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

    if (lastFailure) {
      // Use info level so we can diagnose production issues
      log.info(
        `Public roster fetch failed for ${guildName} on ${serverSlug} (${region.toUpperCase()}) ` +
          `[${lastFailure.slugType}/${lastFailure.namespace}] ${lastFailure.status} url=${lastFailure.rosterUrl} body=${lastFailure.body?.slice(0, 200)}`
      );
    } else {
      log.info(`Public roster fetch failed for ${guildName} on ${serverSlug} (${region.toUpperCase()}): no combinations tried`);
    }

    return null;
  } catch (error) {
    log.error('Error fetching public guild roster:', error);
    return null;
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
    // Generate OAuth URL for frontend to redirect to
    if (path === 'auth-url' && req.method === 'POST') {
      const { redirectUri, state, mode, region: requestedRegion } = await req.json();
      const region = getValidRegion(requestedRegion);
      
      const authUrl = new URL(`${BATTLENET_OAUTH_URL}/authorize`);
      authUrl.searchParams.set('client_id', BATTLENET_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'wow.profile openid offline_access');
      authUrl.searchParams.set('state', JSON.stringify({ state, mode, region }));

      log.debug(`Generated auth URL for redirect (region: ${region})`);

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle Battle.net login/signup (no existing Supabase session)
    if (path === 'login' && req.method === 'POST') {
      const { code, redirectUri, region: requestedRegion, browserLanguage } = await req.json();
      const region = getValidRegion(requestedRegion);
      const defaultLanguage = normalizePreferredLanguage(browserLanguage);

      log.info(`Battle.net login (${region.toUpperCase()}) - exchanging code for token...`);

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
      log.info(`Token obtained successfully, scope: ${tokenData.scope}`);

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

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

      // Generate magic link for session using the correct email
      log.info(`Generating magic link for email: ${sanitizePII(userEmail, 'email')}`);
      const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
      });

      if (magicLinkError || !magicLinkData?.properties?.hashed_token) {
        log.error('Failed to generate magic link:', magicLinkError);
        return new Response(JSON.stringify({ error: 'Failed to generate session' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
        // Get stored Battle.net token
        const { data: tokenData, error: tokenError } = await supabase
          .from('battlenet_tokens')
          .select('access_token, expires_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (tokenError || !tokenData) {
          log.error('No Battle.net token found for user');
          return new Response(JSON.stringify({ error: 'No Battle.net account linked. Please connect your Battle.net account first.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if token is expired
        if (new Date(tokenData.expires_at) < new Date()) {
          log.error('Battle.net token expired');
          return new Response(JSON.stringify({ error: 'Battle.net session expired. Please reconnect your Battle.net account.' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get user's region from battlenet_tokens (stored during OAuth callback)
        const { data: tokenInfo } = await supabase
          .from('battlenet_tokens')
          .select('region')
          .eq('user_id', userId)
          .maybeSingle();

        const preferredRegion = getValidRegion(tokenInfo?.region);
        log.info(`Resync using preferred region: ${preferredRegion.toUpperCase()}`);

        // Re-fetch characters and guilds with multi-region fallback
        const syncResult = await fetchAndStoreCharacters(supabase, tokenData.access_token, userId, preferredRegion);

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

    // Resync all guild members for a specific guild (GM/owner only)
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

      if (!isOwner && !isGM) {
        return new Response(JSON.stringify({ error: 'Only guild owner or GM can trigger guild sync' }), {
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
          const guildServerSlug = guild.server.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
          let rosterSynced = false;
          let reconciliation = { removed: 0, skipped: 0, candidates: 0 };
          try {
            const rosterData = await fetchPublicGuildRoster(guildRegion, guildServerSlug, guild.name);
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
            }
          } catch (err) {
            log.error(`Guild-resync ${jobId}: roster sync failed for guild ${sanitizePII(guild.name, 'name')}`, err);
          }

          return { rosterSynced, reconciliation };
        };

        // Run roster reconciliation before long per-member sync to avoid timeouts skipping cleanup.
        const initialRosterRun = await refreshRosterAndReconcile();
        let rosterSynced = initialRosterRun.rosterSynced;
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
            const serverSlug = guild.server.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
            const rosterData = await fetchPublicGuildRoster(region, serverSlug, guild.name);

            if (!rosterData) {
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
      const charRealm = member.character?.realm?.name || guildRealmSlug;
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

    // Delete old roster cache for this guild and insert new data
    await supabase
      .from('guild_roster_cache')
      .delete()
      .eq('guild_id', guildId);

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

    log.info(`Successfully cached ${dedupedRosterData.length} roster members for guild ${sanitizePII(guildName, 'name')}`);
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
      const charRealm = member.character?.realm?.name || 'Unknown';
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

    // Delete old roster cache for this guild and insert new data
    await supabase
      .from('guild_roster_cache')
      .delete()
      .eq('guild_id', guildId);

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

    log.info(`Successfully cached ${dedupedRosterData.length} roster members for guild ${sanitizePII(guildName, 'name')}`);
  } catch (error) {
    log.error('Error storing full roster for guild:', error);
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

    const guildServerSlug = guild.server.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
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

    // Get the current main character before deletion to preserve user's choice
    const { data: currentMain, error: mainError } = await supabase
      .from('wow_characters')
      .select('name, realm_slug')
      .eq('user_id', userId)
      .eq('is_main', true)
      .maybeSingle();
    
    if (mainError) {
      log.info(`Note: No current main character found (new user or first sync)`);
    }

    const previousMainKey = currentMain 
      ? `${currentMain.name.toLowerCase()}-${currentMain.realm_slug.toLowerCase()}` 
      : null;

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
      const charKey = `${char.name.toLowerCase()}-${char.realmSlug.toLowerCase()}`;
      
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

    const insertedCharMap = new Map<string, { id: string; name: string; realm_slug: string }>();
    if (insertedChars) {
      for (const insertedChar of insertedChars) {
        if (!insertedChar?.name || !insertedChar?.realm_slug) continue;
        insertedCharMap.set(buildCharacterKey(insertedChar.name, insertedChar.realm_slug), insertedChar);
      }
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
    const guildsToCheck: Map<string, { name: string; realmSlug: string; faction: string; characterIds: string[] }> = new Map();
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
          
          const guildKey = `${charDetail.guild.name}-${charDetail.guild.realm?.slug || char.realmSlug}`;
          const guildRealmSlug = charDetail.guild.realm?.slug || char.realmSlug;
          const guildFaction = charDetail.guild.faction?.type || 'UNKNOWN';
          
          const insertedChar = insertedCharMap.get(buildCharacterKey(char.name, char.realmSlug));
          
          if (insertedChar) {
            await supabase
              .from('wow_characters')
              .update({ 
                guild_name: charDetail.guild.name,
                guild_realm: charDetail.guild.realm?.name || char.realm,
              })
              .eq('id', insertedChar.id);

            if (!guildsToCheck.has(guildKey)) {
              guildsToCheck.set(guildKey, {
                name: charDetail.guild.name,
                realmSlug: guildRealmSlug,
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
    for (const [guildKey, guildInfo] of guildsToCheck) {
      try {
        // Use public roster fetch with robust fallback (normalized + unicode slugs, multiple namespaces)
        // to avoid 404s on guild names with accents.
        const rosterResult = await fetchPublicGuildRoster(region, guildInfo.realmSlug, guildInfo.name);

        if (!rosterResult) {
          log.debug(`Failed to fetch roster for ${guildInfo.name}: public roster fetch returned null`);

          for (const charId of guildInfo.characterIds) {
            guildMemberships.push({
              characterId: charId,
              guildName: guildInfo.name,
              guildRealm: guildInfo.realmSlug,
              guildRealmSlug: guildInfo.realmSlug,
              guildFaction: guildInfo.faction,
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
          const insertedChar = insertedChars?.find((ic: any) => ic.id === charId);
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
              guildRealm: guildInfo.realmSlug,
              guildRealmSlug: guildInfo.realmSlug,
              guildFaction: rosterGuildFaction,
              rankIndex: rosterMember.rank ?? 99,
              rankName: rosterMember.rank === 0 ? 'Guild Master' : `Rank ${rosterMember.rank}`,
            });
          } else {
            guildMemberships.push({
              characterId: charId,
              guildName: guildInfo.name,
              guildRealm: guildInfo.realmSlug,
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
    if (insertedChars && insertedChars.length > 0) {
      log.info(`Re-matching ${insertedChars.length} characters in guild_roster_cache...`);
      
      for (const char of insertedChars) {
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
          log.info(
            `No guild_roster_cache rows matched for character ${sanitizePII(char.name, 'name')} (${sanitizePII(char.realm_slug, 'name')})`
          );
        }
      }
      
      log.info('Re-matching complete');
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

      const serverSlug = guild.server.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
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
    if (allowCleanup) {
      await cleanupLeftGuilds(supabase, userId, currentWoWGuilds);
    } else {
      log.info(`Skipping guild membership cleanup for user ${sanitizePII(userId, 'id')} due to missing character detail fetch results`);
    }

    log.debug(`Processing ${uniqueGuilds.size} unique guilds for auto-join...`);

    for (const [guildKey, guildInfo] of uniqueGuilds) {
      try {
        const { data: existingGuild, error: guildLookupError } = await supabase
          .from('guilds')
          .select('id, owner_id, faction')
          .eq('name', guildInfo.name)
          .eq('server', guildInfo.server)
          .maybeSingle();

        if (guildLookupError) {
          log.error(`Error looking up guild ${sanitizePII(guildInfo.name, 'name')}:`, guildLookupError);
          continue;
        }

        let guildId: string;

        if (existingGuild) {
          guildId = existingGuild.id;
          log.debug(`Guild ${sanitizePII(guildInfo.name, 'name')} already exists (id: ${sanitizePII(guildId, 'id')})`);

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
            await syncExistingMembers(supabase, guildId, guildInfo.name, guildInfo.server);
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

            await syncExistingMembers(supabase, guildId, guildInfo.name, guildInfo.server);
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
  guildServer: string
) {
  try {
    log.debug(`Syncing existing members for guild ${sanitizePII(guildName, 'name')}...`);

    const { data: wowMemberships, error: lookupError } = await supabase
      .from('wow_guild_memberships')
      .select('user_id, rank_index')
      .ilike('guild_name', guildName)
      .ilike('guild_realm', guildServer);

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
