import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildSubNav } from '@/components/guild/GuildSubNav';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { Loader2 } from 'lucide-react';
import { toSlug } from '@/lib/guildSlug';

interface Guild {
  id: string;
  name: string;
  server: string;
  region: string;
  avatar_url: string | null;
}

const GuildActivity = () => {
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGM, setIsGM] = useState(false);
  const [hasActivityPermission, setHasActivityPermission] = useState(false);

  useEffect(() => {
    const loadGuild = async () => {
      if (!regionSlug || !serverSlug || !guildSlug) return;

      // Find guild by matching slugified values
      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, avatar_url');
      
      const matchedGuild = allGuilds?.find(g => 
        toSlug(g.region || 'eu') === regionSlug && 
        toSlug(g.server) === serverSlug && 
        toSlug(g.name) === guildSlug
      );

      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }

      setGuild(matchedGuild);

      // Check if user is GM
      if (user) {
        const { data: isGMData } = await supabase
          .rpc('is_guild_gm', { p_guild_id: matchedGuild.id, p_user_id: user.id });
        setIsGM(!!isGMData);

        // Check activity log permission
        const { data: hasPermission } = await supabase
          .rpc('has_guild_permission', { 
            p_guild_id: matchedGuild.id, 
            p_permission: 'view_activity_log',
            p_user_id: user.id 
          });
        setHasActivityPermission(!!hasPermission);
      }

      setLoading(false);
    };

    loadGuild();
  }, [regionSlug, serverSlug, guildSlug, user, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guild) {
    return null;
  }

  // Check access
  if (!isGM && !hasActivityPermission) {
    navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}`);
    return null;
  }

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  return (
    <div className="flex-1 flex flex-col">
      <CosmicBackground />
      
      <GuildSubNav
        guild={guild}
        basePath={basePath}
        isGM={isGM}
        hasActivityPermission={hasActivityPermission}
        activeTab="activity"
      />

      <main className="container mx-auto px-4 pt-20 pb-8 relative z-10 max-w-6xl">
        <h1 className="font-display text-2xl md:text-3xl text-foreground mb-6">
          {language === 'fr' ? 'Journal d\'activité' : 'Activity Log'}
        </h1>
        
        <ActivityLog guildId={guild.id} />
      </main>
    </div>
  );
};

export default GuildActivity;
