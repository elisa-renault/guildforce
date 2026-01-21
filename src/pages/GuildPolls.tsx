import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildSubNav } from '@/components/guild';
import { PollCard } from '@/components/polls';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2 } from 'lucide-react';
import { useGuildPolls, usePollMutations } from '@/hooks/useGuildPolls';
import { toast } from 'sonner';
import { toSlug } from '@/lib/guildSlug';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';

const GuildPolls = () => {
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; avatar_url: string | null } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [loading, setLoading] = useState(true);

  const fullSlug = `${regionSlug}/${serverSlug}/${guildSlug}`;
  const basePath = `/guild/${fullSlug}`;
  const { polls, loading: pollsLoading, refetch } = useGuildPolls(guildId || undefined);
  const { publishPoll, closePoll, deletePoll, duplicatePoll, saving } = usePollMutations();
  const { hasPermission: hasManagePolls, loading: permLoading } = useHasGuildPermission(guildId, 'manage_polls');

  // User can manage polls if they are GM OR have manage_polls permission
  const canManagePolls = isGM || hasManagePolls;

  useEffect(() => {
    const loadGuild = async () => {
      if (!regionSlug || !serverSlug || !guildSlug || !user) return;
      
      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, avatar_url');

      const matchedGuild = allGuilds?.find(g =>
        toSlug(g.region || 'eu') === regionSlug &&
        toSlug(g.server) === serverSlug &&
        toSlug(g.name) === guildSlug
      );

      if (matchedGuild) {
        setGuildId(matchedGuild.id);
        setGuild({
          name: matchedGuild.name,
          server: matchedGuild.server,
          region: matchedGuild.region || 'eu',
          avatar_url: matchedGuild.avatar_url,
        });
        
        const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
          p_guild_id: matchedGuild.id,
          p_user_id: user.id,
        });
        setIsGM(gmCheck || false);
      }
      setLoading(false);
    };

    loadGuild();
  }, [regionSlug, serverSlug, guildSlug, user]);

  const handlePublish = async (pollId: string) => {
    await publishPoll(pollId);
    refetch();
  };

  const handleClose = async (pollId: string) => {
    await closePoll(pollId);
    refetch();
  };

  const handleDelete = async (pollId: string) => {
    await deletePoll(pollId);
    refetch();
  };

  const handleDuplicate = async (pollId: string) => {
    const newPollId = await duplicatePoll(pollId);
    if (newPollId) {
      toast.success(language === 'fr' ? 'Sondage dupliqué en brouillon' : 'Poll duplicated as draft');
      refetch();
    }
  };

  const draftPolls = polls.filter(p => p.status === 'draft');
  const activePolls = polls.filter(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status === 'closed');

  if (loading || permLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      {guild && (
        <GuildSubNav
          guild={guild}
          basePath={basePath}
          isGM={isGM}
          activeTab="polls"
        />
      )}

      <main className="container mx-auto px-3 md:px-4 py-6 md:py-8 relative z-10 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h1 className="text-xl md:text-2xl font-bold">
              {language === 'fr' ? 'Sondages' : 'Polls'}
            </h1>

            {canManagePolls && (
              <Button onClick={() => navigate(`${basePath}/polls/new`)} size="sm" className="md:size-default">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden sm:inline">{language === 'fr' ? 'Nouveau sondage' : 'New Poll'}</span>
              </Button>
            )}
          </div>

          {pollsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : polls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {language === 'fr' ? 'Aucun sondage pour le moment.' : 'No polls yet.'}
            </div>
          ) : (
            <Tabs defaultValue="active">
              <TabsList className="mb-6">
                <TabsTrigger value="active">
                  {language === 'fr' ? 'Actifs' : 'Active'} ({activePolls.length})
                </TabsTrigger>
                {canManagePolls && (
                  <TabsTrigger value="draft">
                    {language === 'fr' ? 'Brouillons' : 'Drafts'} ({draftPolls.length})
                  </TabsTrigger>
                )}
                <TabsTrigger value="closed">
                  {language === 'fr' ? 'Clôturés' : 'Closed'} ({closedPolls.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {activePolls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    isGM={canManagePolls}
                    guildSlug={fullSlug}
                    onClose={handleClose}
                    onDuplicate={canManagePolls ? handleDuplicate : undefined}
                  />
                ))}
                {activePolls.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    {language === 'fr' ? 'Aucun sondage actif' : 'No active polls'}
                  </p>
                )}
              </TabsContent>

              {canManagePolls && (
                <TabsContent value="draft" className="space-y-4">
                  {draftPolls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      isGM={canManagePolls}
                      guildSlug={fullSlug}
                      onPublish={handlePublish}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                  {draftPolls.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">
                      {language === 'fr' ? 'Aucun brouillon' : 'No drafts'}
                    </p>
                  )}
                </TabsContent>
              )}

              <TabsContent value="closed" className="space-y-4">
                {closedPolls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    isGM={canManagePolls}
                    guildSlug={fullSlug}
                    onDelete={canManagePolls ? handleDelete : undefined}
                    onDuplicate={canManagePolls ? handleDuplicate : undefined}
                  />
                ))}
                {closedPolls.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    {language === 'fr' ? 'Aucun sondage clôturé' : 'No closed polls'}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default GuildPolls;
