import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATTLENET_CLIENT_ID = Deno.env.get('BATTLENET_CLIENT_ID')!;
const BATTLENET_CLIENT_SECRET = Deno.env.get('BATTLENET_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Battle.net OAuth URLs (EU region - can be changed)
const BATTLENET_OAUTH_URL = 'https://oauth.battle.net';
const BATTLENET_API_URL = 'https://eu.api.blizzard.com';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface WoWCharacter {
  character: {
    name: string;
    id: number;
    realm: {
      name: string;
      slug: string;
    };
    playable_class: {
      id: number;
    };
    level: number;
  };
}

interface WoWProfile {
  wow_accounts: Array<{
    characters: WoWCharacter[];
  }>;
}

interface UserInfo {
  id: number;
  battletag: string;
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
      const { redirectUri, state } = await req.json();
      
      const authUrl = new URL(`${BATTLENET_OAUTH_URL}/authorize`);
      authUrl.searchParams.set('client_id', BATTLENET_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'wow.profile openid');
      authUrl.searchParams.set('state', state);

      console.log('Generated auth URL for redirect:', authUrl.toString());

      return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange authorization code for token and fetch characters
    if (path === 'callback' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { code, redirectUri } = await req.json();

      console.log('Exchanging code for token...');

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

      // Get WoW profile with characters
      const wowProfileResponse = await fetch(
        `${BATTLENET_API_URL}/profile/user/wow?namespace=profile-eu&locale=en_GB`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        }
      );

      let characters: Array<{
        name: string;
        realm: string;
        realmSlug: string;
        classId: number;
        level: number;
        guildName?: string;
      }> = [];

      if (wowProfileResponse.ok) {
        const wowProfile: WoWProfile = await wowProfileResponse.json();
        console.log('Got WoW profile');

        // Flatten all characters from all WoW accounts
        for (const account of wowProfile.wow_accounts || []) {
          for (const char of account.characters || []) {
            characters.push({
              name: char.character.name,
              realm: char.character.realm.name,
              realmSlug: char.character.realm.slug,
              classId: char.character.playable_class.id,
              level: char.character.level,
            });
          }
        }

        // Sort by level descending
        characters.sort((a, b) => b.level - a.level);
        console.log(`Found ${characters.length} characters`);
      } else {
        console.log('No WoW profile found or error fetching');
      }

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

      // Store characters in database
      if (characters.length > 0) {
        // First delete existing characters for this user
        await supabase.from('wow_characters').delete().eq('user_id', user.id);

        // Insert new characters
        const { error: charError } = await supabase.from('wow_characters').insert(
          characters.map((char, index) => ({
            user_id: user.id,
            name: char.name,
            realm: char.realm,
            realm_slug: char.realmSlug,
            class_id: char.classId,
            level: char.level,
            guild_name: char.guildName || null,
            is_main: index === 0, // First (highest level) character is main by default
          }))
        );

        if (charError) {
          console.error('Failed to insert characters:', charError);
        } else {
          console.log('Characters saved to database');
        }
      }

      return new Response(JSON.stringify({
        success: true,
        battletag: userInfo.battletag,
        characters,
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
