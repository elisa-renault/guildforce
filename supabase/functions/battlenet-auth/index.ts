import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATTLENET_CLIENT_ID = Deno.env.get('BATTLENET_CLIENT_ID')!;
const BATTLENET_CLIENT_SECRET = Deno.env.get('BATTLENET_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

// ============================================================================
// TYPES
// ============================================================================

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
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
      authUrl.searchParams.set('scope', 'wow.profile openid');
      authUrl.searchParams.set('state', JSON.stringify({ state, mode, region }));

      log.debug(`Generated auth URL for redirect (region: ${region})`);

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle Battle.net login/signup (no existing Supabase session)
    if (path === 'login' && req.method === 'POST') {
      const { code, redirectUri, region: requestedRegion } = await req.json();
      const region = getValidRegion(requestedRegion);

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

      if (existingProfile) {
        userId = existingProfile.id;
        log.info(`Existing user found by battlenet_id: ${sanitizePII(userId, 'id')}`);
      } else {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingBnetEmailUser = existingUsers?.users?.find((u) => u.email === bnetEmail);

        if (existingBnetEmailUser) {
          userId = existingBnetEmailUser.id;
          isNewUser = false;
          log.info(`Existing auth user found by bnet email: ${sanitizePII(userId, 'id')}`);
        } else {
          const { data: profileByBattletag } = await supabase
            .from('profiles')
            .select('id')
            .eq('battletag', userInfo.battletag)
            .maybeSingle();

          if (profileByBattletag) {
            userId = profileByBattletag.id;
            isNewUser = false;
            log.info(`Existing user found by battletag: ${sanitizePII(userId, 'id')}`);
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
                preferred_language: 'fr',
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
          preferred_language: existingProfileRow?.preferred_language || 'fr',
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

      // Store Battle.net token in separate secure table
      const { error: tokenError } = await supabase
        .from('battlenet_tokens')
        .upsert({
          user_id: userId,
          access_token: tokenData.access_token,
          expires_at: expiresAt,
        }, { onConflict: 'user_id' });

      if (tokenError) {
        log.error('Failed to store token:', tokenError);
        // Continue anyway - profile was saved
      }

      // Fetch and store WoW characters
      await fetchAndStoreCharacters(supabase, tokenData.access_token, userId, region);

      // Generate magic link for session
      const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: bnetEmail,
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
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        log.error('Failed to get user:', userError);
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if this Battle.net account is already linked to another user
      const { data: existingLink } = await supabase
        .from('profiles')
        .select('id')
        .eq('battlenet_id', String(userInfo.id))
        .neq('id', user.id)
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
        .eq('id', user.id)
        .maybeSingle();

      const upsertPayload: any = {
        id: user.id,
        battlenet_id: String(userInfo.id),
        battletag: userInfo.battletag,
        username: existingProfileRow?.username || battletagName,
        preferred_language: existingProfileRow?.preferred_language || 'fr',
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

      // Store Battle.net token in separate secure table
      const { error: tokenError } = await supabase
        .from('battlenet_tokens')
        .upsert({
          user_id: user.id,
          access_token: tokenData.access_token,
          expires_at: expiresAt,
        }, { onConflict: 'user_id' });

      if (tokenError) {
        log.error('Failed to store token:', tokenError);
        // Continue anyway - profile was saved
      }

      // Fetch and store WoW characters
      await fetchAndStoreCharacters(supabase, tokenData.access_token, user.id, region);

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
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: characters, error } = await supabase
        .from('wow_characters')
        .select('*')
        .eq('user_id', user.id)
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
 * Fetches WoW characters from Battle.net API and stores them in the database.
 * Also fetches guild memberships and triggers auto-join for app guilds.
 * 
 * @param supabase - Supabase client with service role key
 * @param accessToken - Battle.net OAuth access token
 * @param userId - Supabase user ID to associate characters with
 * @param region - Battle.net region (eu, us, kr, tw)
 */
async function fetchAndStoreCharacters(supabase: any, accessToken: string, userId: string, region: BattleNetRegion = 'eu') {
  try {
    const apiUrl = BATTLENET_API_URLS[region];
    const namespace = BATTLENET_NAMESPACES[region];
    const locale = BATTLENET_LOCALES[region];
    
    log.info(`Fetching WoW profile from Battle.net API (${region.toUpperCase()})...`);
    
    const wowProfileResponse = await fetch(
      `${apiUrl}/profile/user/wow?namespace=${namespace}&locale=${locale}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!wowProfileResponse.ok) {
      const errorText = await wowProfileResponse.text();
      log.error('WoW profile fetch failed:', wowProfileResponse.status, errorText);
      return;
    }

    const wowProfile = await wowProfileResponse.json();
    log.debug('WoW Profile raw response keys:', Object.keys(wowProfile));

    const characters: CharacterData[] = [];

    if (!wowProfile.wow_accounts || wowProfile.wow_accounts.length === 0) {
      log.info('No wow_accounts found in response');
      return;
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
      return;
    }

    // Delete existing characters and guild memberships
    await supabase.from('wow_guild_memberships').delete().eq('user_id', userId);
    await supabase.from('wow_characters').delete().eq('user_id', userId);

    // Insert characters
    const insertData = characters.map((char, index) => ({
      user_id: userId,
      name: char.name,
      realm: char.realm,
      realm_slug: char.realmSlug,
      class_id: char.classId,
      level: char.level,
      guild_name: null,
      is_main: index === 0,
    }));

    const { data: insertedChars, error: charError } = await supabase
      .from('wow_characters')
      .insert(insertData)
      .select('id, name, realm_slug');

    if (charError) {
      log.error('Failed to insert characters:', charError);
      return;
    }

    log.info(`Successfully saved ${characters.length} characters to database`);

    // Fetch detailed character info for guild memberships
    const maxLevelChars = characters.filter(c => c.level >= 70).slice(0, 20);
    log.debug(`Checking ${maxLevelChars.length} max-level characters for guild info...`);

    const guildMemberships: GuildMembershipData[] = [];
    const guildsToCheck: Map<string, { name: string; realmSlug: string; faction: string; characterIds: string[] }> = new Map();

    // Fetch character details to get guild info
    for (const char of maxLevelChars) {
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
        
        if (charDetail.guild) {
          log.debug(`Character ${sanitizePII(char.name, 'name')} is in guild: ${sanitizePII(charDetail.guild.name, 'name')}`);
          
          const guildKey = `${charDetail.guild.name}-${charDetail.guild.realm?.slug || char.realmSlug}`;
          const guildRealmSlug = charDetail.guild.realm?.slug || char.realmSlug;
          const guildFaction = charDetail.faction?.type || 'UNKNOWN';
          
          const insertedChar = insertedChars?.find(
            (ic: any) => ic.name.toLowerCase() === char.name.toLowerCase() && ic.realm_slug === char.realmSlug
          );
          
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
        const guildSlug = guildInfo.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const rosterUrl = `${apiUrl}/data/wow/guild/${guildInfo.realmSlug}/${encodeURIComponent(guildSlug)}/roster?namespace=${namespace}&locale=${locale}`;
        
        log.debug(`Fetching roster for guild: ${sanitizePII(guildInfo.name, 'name')}`);
        
        const rosterResponse = await fetch(rosterUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!rosterResponse.ok) {
          log.debug(`Failed to fetch roster for ${guildInfo.name}: ${rosterResponse.status}`);
          
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

        const roster = await rosterResponse.json();
        log.debug(`Roster has ${roster.members?.length || 0} members`);

        for (const charId of guildInfo.characterIds) {
          const insertedChar = insertedChars?.find((ic: any) => ic.id === charId);
          if (!insertedChar) continue;

          const rosterMember = roster.members?.find(
            (m: any) => m.character?.name?.toLowerCase() === insertedChar.name.toLowerCase()
          );

          if (rosterMember) {
            log.debug(`Found ${sanitizePII(insertedChar.name, 'name')} in roster with rank ${rosterMember.rank}`);
            guildMemberships.push({
              characterId: charId,
              guildName: guildInfo.name,
              guildRealm: guildInfo.realmSlug,
              guildRealmSlug: guildInfo.realmSlug,
              guildFaction: guildInfo.faction,
              rankIndex: rosterMember.rank ?? 99,
              rankName: rosterMember.rank === 0 ? 'Guild Master' : `Rank ${rosterMember.rank}`,
            });
          } else {
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

      const { error: membershipError } = await supabase
        .from('wow_guild_memberships')
        .insert(membershipData);

      if (membershipError) {
        log.error('Failed to insert guild memberships:', membershipError);
      } else {
        log.info(`Successfully saved ${guildMemberships.length} guild memberships`);
        
        const gmMemberships = guildMemberships.filter(gm => gm.rankIndex === 0);
        if (gmMemberships.length > 0) {
          log.info(`User is Guild Master of ${gmMemberships.length} guild(s)!`);
        }
      }

      await autoJoinGuilds(supabase, userId, guildMemberships, region);
    }

  } catch (error) {
    log.error('Error fetching characters:', error);
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
  region: BattleNetRegion = 'eu'
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
    await cleanupLeftGuilds(supabase, userId, currentWoWGuilds);

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
              status: 'confirmed',
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
