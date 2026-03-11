import { Loader2, ArrowLeft, Lock } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CosmicBackground } from '@/components/CosmicBackground';
import { PageContainer } from '@/components/layout/PageContainer';
import { PollResults } from '@/components/polls';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import { usePollResults, usePollMutations } from '@/hooks/useGuildPolls';
import { supabase } from '@/integrations/supabase/client';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';

const GuildPollResultsPage = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, pollId } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [canViewResults, setCanViewResults] = useState<boolean | null>(null);

  const { poll, loading: resultsLoading } = usePollResults(pollId);
  const { checkCanViewResults } = usePollMutations();
  const { hasPermission: hasManagePolls } = useHasGuildPermission(guildId, 'manage_polls');

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  // Handle back navigation - use history or fallback to polls list
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`${basePath}/polls`);
    }
  }, [navigate, basePath]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !regionSlug || !serverSlug || !guildSlug) return;

      const matchedGuild = await findGuildByRouteSlugs({
        supabase,
        regionSlug,
        serverSlug,
        guildSlug,
      });

      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }

      setGuildId(matchedGuild.id);

      // Check GM status
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: matchedGuild.id,
        p_user_id: user.id,
      });

      setIsGM(gmCheck || false);
      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, pollId, navigate]);

  // Check results access permission
  useEffect(() => {
    const checkAccess = async () => {
      if (pollId && !isGM && !hasManagePolls) {
        const canView = await checkCanViewResults(pollId);
        setCanViewResults(canView);
      } else if (isGM || hasManagePolls) {
        setCanViewResults(true);
      }
    };
    if (!loading) {
      checkAccess();
    }
  }, [pollId, isGM, hasManagePolls, checkCanViewResults, loading]);

  // User can view if GM, has manage_polls permission, or has specific results access
  const userCanViewResults = isGM || hasManagePolls || canViewResults === true;

  if (loading || resultsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  // If user doesn't have access to view results, show restricted message
  if (!userCanViewResults) {
    return (
      <div className="flex-1 relative pt-16">
        <CosmicBackground />
        <PageContainer className="py-8" width="contained">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{poll.title}</h1>
              <p className="text-muted-foreground">
                {t.common.results}
              </p>
            </div>
          </div>
          <div className="bg-muted/30 border border-muted rounded-lg p-8 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t.polls.resultsRestricted}
            </p>
          </div>
        </PageContainer>
      </div>
    );
  }


  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <PageContainer className="py-8" width="wide">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <PollResults
          poll={poll}
          variant="full"
          canUseCohortFilters={isGM || hasManagePolls}
        />
      </PageContainer>
    </div>
  );
};

export default GuildPollResultsPage;
