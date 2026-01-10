import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATTLENET_CLIENT_ID = Deno.env.get('BATTLENET_CLIENT_ID')!;
const BATTLENET_CLIENT_SECRET = Deno.env.get('BATTLENET_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Battle.net OAuth URLs (EU region)
const BATTLENET_OAUTH_URL = 'https://oauth.battle.net';
const BATTLENET_API_URL = 'https://eu.api.blizzard.com';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Battle.net API character structure - characters are returned directly, not nested
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

// Generate a secure random password
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
      const { redirectUri, state, mode } = await req.json();
      
      const authUrl = new URL(`${BATTLENET_OAUTH_URL}/authorize`);
      authUrl.searchParams.set('client_id', BATTLENET_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'wow.profile openid');
      // Include mode in state so we know if it's login or link
      authUrl.searchParams.set('state', JSON.stringify({ state, mode }));

      console.log('Generated auth URL for redirect:', authUrl.toString());

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle Battle.net login/signup (no existing Supabase session)
    if (path === 'login' && req.method === 'POST') {
      const { code, redirectUri } = await req.json();

      console.log('Battle.net login - exchanging code for token...');

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
        console.error('Token exchange failed:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to exchange token', details: errorText }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenData: TokenResponse = await tokenResponse.json();
      console.log('Token obtained successfully');

      // Get user info (BattleTag)
      const userInfoResponse = await fetch(`${BATTLENET_OAUTH_URL}/userinfo`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        console.error('Failed to get user info');
        return new Response(JSON.stringify({ error: 'Failed to get user info' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userInfo: UserInfo = await userInfoResponse.json();
      console.log('Got BattleTag:', userInfo.battletag);

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Battle.net "technical" email used for accounts created via BNet-first flow
      const bnetEmail = `bnet_${userInfo.id}@battlenet.local`;

      // Check if a user with this Battle.net ID already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('battlenet_id', String(userInfo.id))
        .maybeSingle();

      let userId: string;
      let isNewUser = false;

      if (existingProfile) {
        // User exists, sign them in
        userId = existingProfile.id;
        console.log('Existing user found by battlenet_id:', userId);
      } else {
        // Check if there's already an auth user with this email (avoid duplicates)
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingAuthUser = existingUsers?.users?.find((u) => u.email === bnetEmail);

        if (existingAuthUser) {
          // Auth user exists but profile doesn't have battlenet_id yet - use this user
          userId = existingAuthUser.id;
          isNewUser = false;
          console.log('Existing auth user found by email:', userId);
        } else {
          // Create new user
          isNewUser = true;
          const password = generateSecurePassword();

          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: bnetEmail,
            password,
            email_confirm: true,
            user_metadata: {
              discord_pseudo: userInfo.battletag.split('#')[0],
              preferred_language: 'fr',
              battlenet_id: String(userInfo.id),
            },
          });

          if (createError || !newUser.user) {
            console.error('Failed to create user:', createError);
            return new Response(JSON.stringify({ error: 'Failed to create user' }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          userId = newUser.user.id;
          console.log('New user created:', userId);
        }
      }

      // Ensure the profile exists and is updated with Battle.net info
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      const battletagName = userInfo.battletag.split('#')[0];

      const profileUpsert: any = {
        id: userId,
        battlenet_id: String(userInfo.id),
        battlenet_token: tokenData.access_token,
        battlenet_token_expires_at: expiresAt,
        battletag: userInfo.battletag,
      };

      // If new user, set the pseudo to their BattleTag name
      if (isNewUser) {
        profileUpsert.discord_pseudo = battletagName;
      }

      await supabase
        .from('profiles')
        .upsert(profileUpsert, { onConflict: 'id' });

      // Fetch and store WoW characters
      await fetchAndStoreCharacters(supabase, tokenData.access_token, userId);

      // Generate a session for the user
      // NOTE: `generateLink` targets an email address.
      // If the account was initially created via email/password and later linked to BNet,
      // we MUST generate the link for the user's *real* email (not the bnet_... one),
      // otherwise we can accidentally log them into a different auth user.
      let loginEmail = bnetEmail;
      if (!isNewUser) {
        const { data: userById, error: getUserErr } = await supabase.auth.admin.getUserById(userId);
        const existingEmail = userById?.user?.email;
        if (!getUserErr && existingEmail) {
          loginEmail = existingEmail;
        }
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: loginEmail,
      });

      if (sessionError || !sessionData) {
        console.error('Failed to generate session:', sessionError);
        return new Response(JSON.stringify({ error: 'Failed to generate session' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Supabase returns the token hash to verify as `hashed_token`.
      // Fallback to parsing from action_link for compatibility.
      const tokenHashFromProps = (sessionData.properties as any)?.hashed_token as string | undefined;
      let tokenHashFromLink: string | null = null;
      let tokenTypeFromLink: string | null = null;

      try {
        const magicLinkUrl = new URL(sessionData.properties.action_link);
        tokenHashFromLink = magicLinkUrl.searchParams.get('token');
        tokenTypeFromLink = magicLinkUrl.searchParams.get('type');
      } catch (e) {
        console.warn('Could not parse action_link URL');
      }

      const verifyToken = tokenHashFromProps || tokenHashFromLink;

      return new Response(
        JSON.stringify({
          success: true,
          isNewUser,
          battletag: userInfo.battletag,
          verifyToken,
          tokenType: tokenTypeFromLink || 'magiclink',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Link Battle.net to existing account (requires auth)
    if (path === 'callback' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { code, redirectUri } = await req.json();

      console.log('Linking Battle.net - exchanging code for token...');

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
        console.error('Token exchange failed:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to exchange token', details: errorText }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokenData: TokenResponse = await tokenResponse.json();
      console.log('Token obtained successfully');

      // Get user info (BattleTag)
      const userInfoResponse = await fetch(`${BATTLENET_OAUTH_URL}/userinfo`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        console.error('Failed to get user info');
        return new Response(JSON.stringify({ error: 'Failed to get user info' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userInfo: UserInfo = await userInfoResponse.json();
      console.log('Got BattleTag:', userInfo.battletag);

      // Get Supabase user from auth header
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        console.error('Failed to get user:', userError);
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
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          battlenet_id: String(userInfo.id),
          battlenet_token: tokenData.access_token,
          battlenet_token_expires_at: expiresAt,
          battletag: userInfo.battletag,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch and store WoW characters
      await fetchAndStoreCharacters(supabase, tokenData.access_token, user.id);

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
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to fetch and store WoW characters and guild memberships
async function fetchAndStoreCharacters(supabase: any, accessToken: string, userId: string) {
  try {
    console.log('Fetching WoW profile from Battle.net API...');
    
    const wowProfileResponse = await fetch(
      `${BATTLENET_API_URL}/profile/user/wow?namespace=profile-eu&locale=en_GB`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!wowProfileResponse.ok) {
      const errorText = await wowProfileResponse.text();
      console.error('WoW profile fetch failed:', wowProfileResponse.status, errorText);
      return;
    }

    const wowProfile = await wowProfileResponse.json();
    console.log('WoW Profile raw response keys:', Object.keys(wowProfile));

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

    const characters: CharacterData[] = [];

    // Check if wow_accounts exists and has data
    if (!wowProfile.wow_accounts || wowProfile.wow_accounts.length === 0) {
      console.log('No wow_accounts found in response');
      return;
    }

    console.log(`Found ${wowProfile.wow_accounts.length} WoW account(s)`);

    // Flatten all characters from all WoW accounts
    for (const account of wowProfile.wow_accounts) {
      console.log(`Processing WoW account ID: ${account.id}, characters count: ${account.characters?.length || 0}`);
      
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
    console.log(`Total characters found: ${characters.length}`);

    if (characters.length === 0) {
      console.log('No characters to save');
      return;
    }

    // First delete existing characters and guild memberships for this user
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
      console.error('Failed to insert characters:', charError);
      return;
    }

    console.log(`Successfully saved ${characters.length} characters to database`);

    // Now fetch detailed character info to get guild memberships
    // Only check max level characters to save API calls
    const maxLevelChars = characters.filter(c => c.level >= 70).slice(0, 20);
    console.log(`Checking ${maxLevelChars.length} max-level characters for guild info...`);

    const guildMemberships: Array<{
      characterId: string;
      guildName: string;
      guildRealm: string;
      guildRealmSlug: string;
      guildFaction: string;
      rankIndex: number;
      rankName: string;
    }> = [];

    // Map to track unique guilds we need to fetch rosters for
    const guildsToCheck: Map<string, { name: string; realmSlug: string; faction: string; characterIds: string[] }> = new Map();

    // Fetch character details to get guild info
    for (const char of maxLevelChars) {
      try {
        const charDetailUrl = `${BATTLENET_API_URL}/profile/wow/character/${char.realmSlug.toLowerCase()}/${char.name.toLowerCase()}?namespace=profile-eu&locale=en_GB`;
        
        const charDetailResponse = await fetch(charDetailUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!charDetailResponse.ok) {
          console.log(`Failed to fetch details for ${char.name}: ${charDetailResponse.status}`);
          continue;
        }

        const charDetail = await charDetailResponse.json();
        
        if (charDetail.guild) {
          console.log(`Character ${char.name} is in guild: ${charDetail.guild.name}`);
          
          const guildKey = `${charDetail.guild.name}-${charDetail.guild.realm?.slug || char.realmSlug}`;
          const guildRealmSlug = charDetail.guild.realm?.slug || char.realmSlug;
          const guildFaction = charDetail.faction?.type || 'UNKNOWN';
          
          // Find the inserted character ID
          const insertedChar = insertedChars?.find(
            (ic: any) => ic.name.toLowerCase() === char.name.toLowerCase() && ic.realm_slug === char.realmSlug
          );
          
          if (insertedChar) {
            // Update the character with guild name
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
        console.error(`Error fetching details for ${char.name}:`, err);
      }
    }

    console.log(`Found ${guildsToCheck.size} unique guilds to check for ranks`);

    // Now fetch roster for each guild to get member ranks
    for (const [guildKey, guildInfo] of guildsToCheck) {
      try {
        // Guild name needs to be slugified (lowercase, spaces to hyphens)
        const guildSlug = guildInfo.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const rosterUrl = `${BATTLENET_API_URL}/data/wow/guild/${guildInfo.realmSlug}/${encodeURIComponent(guildSlug)}/roster?namespace=profile-eu&locale=en_GB`;
        
        console.log(`Fetching roster for guild: ${guildInfo.name} (${rosterUrl})`);
        
        const rosterResponse = await fetch(rosterUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!rosterResponse.ok) {
          console.log(`Failed to fetch roster for ${guildInfo.name}: ${rosterResponse.status}`);
          
          // Even without roster, save guild membership with unknown rank
          for (const charId of guildInfo.characterIds) {
            guildMemberships.push({
              characterId: charId,
              guildName: guildInfo.name,
              guildRealm: guildInfo.realmSlug,
              guildRealmSlug: guildInfo.realmSlug,
              guildFaction: guildInfo.faction,
              rankIndex: 99, // Unknown rank
              rankName: 'Unknown',
            });
          }
          continue;
        }

        const roster = await rosterResponse.json();
        console.log(`Roster has ${roster.members?.length || 0} members`);

        // Find our characters in the roster
        for (const charId of guildInfo.characterIds) {
          const insertedChar = insertedChars?.find((ic: any) => ic.id === charId);
          if (!insertedChar) continue;

          const rosterMember = roster.members?.find(
            (m: any) => m.character?.name?.toLowerCase() === insertedChar.name.toLowerCase()
          );

          if (rosterMember) {
            console.log(`Found ${insertedChar.name} in roster with rank ${rosterMember.rank}`);
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
            // Character not found in roster, save with unknown rank
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
        console.error(`Error fetching roster for ${guildInfo.name}:`, err);
      }
    }

    // Insert guild memberships
    if (guildMemberships.length > 0) {
      console.log(`Inserting ${guildMemberships.length} guild memberships`);
      
      const membershipData = guildMemberships.map(gm => ({
        user_id: userId,
        character_id: gm.characterId,
        guild_name: gm.guildName,
        guild_realm: gm.guildRealm,
        guild_realm_slug: gm.guildRealmSlug,
        guild_faction: gm.guildFaction,
        rank_index: gm.rankIndex,
        rank_name: gm.rankName,
      }));

      const { error: membershipError } = await supabase
        .from('wow_guild_memberships')
        .insert(membershipData);

      if (membershipError) {
        console.error('Failed to insert guild memberships:', membershipError);
      } else {
        console.log(`Successfully saved ${guildMemberships.length} guild memberships`);
        
        // Log GM status
        const gmMemberships = guildMemberships.filter(gm => gm.rankIndex === 0);
        if (gmMemberships.length > 0) {
          console.log(`User is Guild Master of ${gmMemberships.length} guild(s)!`);
        }
      }
    }

  } catch (error) {
    console.error('Error fetching characters:', error);
  }
}
