import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlobalNav } from '@/components/GlobalNav';
import { Footer } from '@/components/Footer';
import { PollCard } from '@/components/polls';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { useGuildPolls, usePollMutations } from '@/hooks/useGuildPolls';
import { parseGuildSlug } from '@/lib/guildSlug';

const GuildPolls = () => {
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [guildId, setGuildId] = useState<string | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [loading, setLoading] = useState(true);

  const fullSlug = `${regionSlug}/${serverSlug}/${guildSlug}`;
  const { polls, loading: pollsLoading, refetch } = useGuildPolls(guildId || undefined);
  const { publishPoll, closePoll, deletePoll, saving } = usePollMutations();

  useEffect(() => {
    const loadGuild = async () => {
      if (!regionSlug || !serverSlug || !guildSlug || !user) return;
      
      const parsed = parseGuildSlug(guildSlug);
      if (!parsed) return;

      const { data: guild } = await supabase
        .from('guilds')
        .select('id, owner_id')
        .eq('region', regionSlug.toUpperCase())
        .eq('server', parsed.server)
        .eq('name', parsed.name)
        .single();

      if (guild) {
        setGuildId(guild.id);
        setIsGM(guild.owner_id === user.id);
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

  const draftPolls = polls.filter(p => p.status === 'draft');
  const activePolls = polls.filter(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status === 'closed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <CosmicBackground />
      <GlobalNav />

      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">
                {language === 'fr' ? 'Sondages' : 'Polls'}
              </h1>
            </div>

            {isGM && (
              <Button onClick={() => navigate(`/guild/${fullSlug}/polls/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Nouveau sondage' : 'New Poll'}
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
                {isGM && (
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
                    isGM={isGM}
                    guildSlug={fullSlug}
                    onClose={handleClose}
                  />
                ))}
                {activePolls.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">
                    {language === 'fr' ? 'Aucun sondage actif' : 'No active polls'}
                  </p>
                )}
              </TabsContent>

              {isGM && (
                <TabsContent value="draft" className="space-y-4">
                  {draftPolls.map((poll) => (
                    <PollCard
                      key={poll.id}
                      poll={poll}
                      isGM={isGM}
                      guildSlug={fullSlug}
                      onPublish={handlePublish}
                      onDelete={handleDelete}
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
                    isGM={isGM}
                    guildSlug={fullSlug}
                    onDelete={isGM ? handleDelete : undefined}
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

      <Footer />
    </div>
  );
};

export default GuildPolls;
