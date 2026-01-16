import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { GuildSubNav } from '@/components/guild/GuildSubNav';
import { RosterManager } from '@/components/roster';
import { GuildPermissionsEditor } from '@/components/permissions';
import { 
  GuildSettingsSidebar, 
  GuildProfileSection, 
  GuildBattleNetSection, 
  GuildActivitySection,
  type SettingsSection 
} from '@/components/settings';
import { Loader2 } from 'lucide-react';
import { toSlug, getGuildPath } from '@/lib/guildSlug';

interface GuildData {
  id: string;
  name: string;
  server: string;
  region: string;
  faction: string;
  avatar_url: string | null;
  officer_rank_threshold: number;
}

interface AccessRule {
  id: string;
  access_type: 'user' | 'rank';
  user_id?: string;
  min_rank_index?: number;
  max_rank_index?: number;
}

interface Roster {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  access_rules: AccessRule[];
}

interface GuildMember {
  user_id: string;
  username: string;
}

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

const GuildSettings = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = (searchParams.get('section') as SettingsSection) || 'profile';
  const initialRosterId = searchParams.get('roster');
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [hasManageRosters, setHasManageRosters] = useState(false);
  const [hasViewActivityLog, setHasViewActivityLog] = useState(false);
  const [officerRank, setOfficerRank] = useState<number>(2);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [ranks, setRanks] = useState<GuildRank[]>([]);
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  const loadRostersAndMembers = async (guildId: string) => {
    // Load rosters with access rules
    const { data: rostersData } = await supabase
      .from('rosters')
      .select('*')
      .eq('guild_id', guildId)
      .order('is_default', { ascending: false })
      .order('created_at');

    if (rostersData) {
      const rostersWithRules: Roster[] = await Promise.all(
        rostersData.map(async (roster) => {
          const { data: rulesData } = await supabase
            .from('roster_access_rules')
            .select('*')
            .eq('roster_id', roster.id);

          return {
            id: roster.id,
            name: roster.name,
            description: roster.description,
            is_default: roster.is_default,
            access_rules: (rulesData || []).map(r => ({
              id: r.id,
              access_type: r.access_type as 'user' | 'rank',
              user_id: r.user_id ?? undefined,
              min_rank_index: r.min_rank_index ?? undefined,
              max_rank_index: r.max_rank_index ?? undefined,
            })),
          };
        })
      );
      setRosters(rostersWithRules);
    }

    // Load guild members with usernames
    const { data: membersData } = await supabase
      .from('guild_members')
      .select('user_id')
      .eq('guild_id', guildId);

    if (membersData) {
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const membersWithNames: GuildMember[] = membersData.map(m => ({
        user_id: m.user_id,
        username: profilesData?.find(p => p.id === m.user_id)?.username || 'Unknown',
      }));
      setMembers(membersWithNames);
    }

    // Load guild ranks from wow_guild_memberships
    const { data: guildData } = await supabase
      .from('guilds')
      .select('name, server, region')
      .eq('id', guildId)
      .single();

    if (guildData) {
      const { data: ranksData } = await supabase
        .from('wow_guild_memberships')
        .select('rank_index, rank_name')
        .ilike('guild_name', guildData.name)
        .ilike('guild_realm_slug', guildData.server)
        .ilike('guild_region', guildData.region);

      if (ranksData) {
        const uniqueRanks = new Map<number, string>();
        ranksData.forEach(r => {
          if (!uniqueRanks.has(r.rank_index)) {
            uniqueRanks.set(r.rank_index, r.rank_name || `Rank ${r.rank_index}`);
          }
        });

        const ranksArray: GuildRank[] = Array.from(uniqueRanks.entries())
          .map(([rank_index, rank_name]) => ({ rank_index, rank_name }))
          .sort((a, b) => a.rank_index - b.rank_index);
        
        setRanks(ranksArray);
      }
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadGuildAndCheckAccess = async () => {
      // Find the guild by matching slugified region, server and name
      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, faction, avatar_url, officer_rank_threshold');
      
      const matchedGuild = allGuilds?.find(g => 
        toSlug(g.region || 'eu') === regionSlug && 
        toSlug(g.server) === serverSlug && 
        toSlug(g.name) === guildSlug
      );
      
      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }

      // Check if user is GM
      const { data: isOwnerOrGM } = await supabase.rpc('is_guild_owner_or_gm', {
        _guild_id: matchedGuild.id
      });
      
      const gmStatus = !!isOwnerOrGM;
      setIsGM(gmStatus);

      // Check delegated permissions
      const [rostersPermResult, activityPermResult] = await Promise.all([
        supabase.rpc('has_guild_permission', {
          p_guild_id: matchedGuild.id,
          p_permission: 'manage_rosters',
          p_user_id: user.id,
        }),
        supabase.rpc('has_guild_permission', {
          p_guild_id: matchedGuild.id,
          p_permission: 'view_activity_log',
          p_user_id: user.id,
        }),
      ]);

      const hasRostersPerm = !!rostersPermResult.data;
      const hasActivityPerm = !!activityPermResult.data;
      
      setHasManageRosters(hasRostersPerm);
      setHasViewActivityLog(hasActivityPerm);

      // Check if user has ANY access to settings
      const hasAnyAccess = gmStatus || hasRostersPerm || hasActivityPerm;
      
      if (!hasAnyAccess) {
        navigate(getGuildPath(matchedGuild.region || 'eu', matchedGuild.server, matchedGuild.name));
        return;
      }

      setGuild(matchedGuild);
      setOfficerRank(matchedGuild.officer_rank_threshold ?? 2);
      
      // Load rosters, members, and ranks
      await loadRostersAndMembers(matchedGuild.id);
      
      // Determine first accessible section
      const visibleSections = getVisibleSections(gmStatus, hasRostersPerm, hasActivityPerm);
      const requestedSection = searchParams.get('section') as SettingsSection;
      
      if (requestedSection && visibleSections.includes(requestedSection)) {
        setActiveSection(requestedSection);
      } else {
        setActiveSection(visibleSections[0] || 'profile');
      }
      
      setLoading(false);
    };

    loadGuildAndCheckAccess();
  }, [user, regionSlug, serverSlug, guildSlug, navigate]);

  const getVisibleSections = (gm: boolean, rosters: boolean, activity: boolean): SettingsSection[] => {
    const sections: SettingsSection[] = [];
    
    if (gm) {
      sections.push('profile', 'permissions', 'rosters', 'activity', 'battlenet');
    } else {
      if (rosters) sections.push('rosters');
      if (activity) sections.push('activity');
    }
    
    return sections;
  };

  const visibleSections = getVisibleSections(isGM, hasManageRosters, hasViewActivityLog);

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    setSearchParams({ section });
  };

  const handleResyncComplete = async () => {
    if (guild) {
      await loadRostersAndMembers(guild.id);
      
      // Reload guild data
      const { data: updatedGuild } = await supabase
        .from('guilds')
        .select('id, name, server, region, faction, avatar_url, officer_rank_threshold')
        .eq('id', guild.id)
        .single();
      
      if (updatedGuild) {
        setGuild(updatedGuild);
      }
    }
  };

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

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <GuildProfileSection
            guild={guild}
            ranks={ranks}
            officerRank={officerRank}
            onOfficerRankChange={setOfficerRank}
            onGuildUpdate={setGuild}
          />
        );
      
      case 'permissions':
        return (
          <GlowCard className="p-6">
            <GuildPermissionsEditor guildId={guild.id} />
          </GlowCard>
        );
      
      case 'rosters':
        return (
          <RosterManager
            guildId={guild.id}
            rosters={rosters}
            members={members}
            ranks={ranks}
            onRosterChange={() => loadRostersAndMembers(guild.id)}
            initialRosterId={initialRosterId}
          />
        );
      
      case 'activity':
        return <GuildActivitySection guildId={guild.id} />;
      
      case 'battlenet':
        return (
          <GuildBattleNetSection
            guildId={guild.id}
            onResyncComplete={handleResyncComplete}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 relative pt-16 flex flex-col">
      <CosmicBackground />

      {/* Guild Sub-Navigation */}
      <GuildSubNav
        guild={guild}
        basePath={basePath}
        isGM={isGM}
        hasSettingsPermission={isGM || hasManageRosters || hasViewActivityLog}
        activeTab="settings"
      />

      {/* Settings Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative z-10">
        {/* Sidebar */}
        <GuildSettingsSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          visibleSections={visibleSections}
        />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          {renderSectionContent()}
        </main>
      </div>
    </div>
  );
};

export default GuildSettings;
