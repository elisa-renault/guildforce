import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildWorkspaceShell } from '@/components/guild';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { PollCard } from '@/components/polls';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ClipboardList, Plus, Loader2 } from 'lucide-react';
import { useGuildPolls, usePollMutations } from '@/hooks/useGuildPolls';
import { toast } from '@/components/ui/sonner';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';

const GuildPolls = () => {
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; avatar_url: string | null } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [loading, setLoading] = useState(true);

  const fullSlug = `${regionSlug}/${serverSlug}/${guildSlug}`;
  const basePath = `/guild/${fullSlug}`;
  const { polls, loading: pollsLoading, refetch } = useGuildPolls(guildId || undefined);
  const { publishPoll, closePoll, deletePoll, duplicatePoll } = usePollMutations();
  const { hasPermission: hasManagePolls, loading: permLoading } = useHasGuildPermission(guildId, 'manage_polls');
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

  // User can manage polls if they are GM OR have manage_polls permission
  const canManagePolls = isGM || hasManagePolls;

  useEffect(() => {
    const loadGuild = async () => {
      if (!regionSlug || !serverSlug || !guildSlug || !user) return;
      
      const matchedGuild = await findGuildByRouteSlugs({
        supabase,
        regionSlug,
        serverSlug,
        guildSlug,
      });

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
      toast.success(sm('guild.polls.toast.duplicated'));
      refetch();
    }
  };

  const draftPolls = polls.filter(p => p.status === 'draft');
  const activePolls = polls.filter(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status === 'closed');
  const defaultTab =
    activePolls.length > 0
      ? 'active'
      : closedPolls.length > 0
        ? 'closed'
        : canManagePolls && draftPolls.length > 0
          ? 'draft'
          : 'active';

  if (loading || permLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guild) return null;

  return (
    <GuildWorkspaceShell
      guild={guild}
      guildId={guildId}
      basePath={basePath}
      isGM={isGM}
      activeTab="polls"
      context={{
        status: `${activePolls.length} ${sm('guild.polls.tab.active').toLowerCase()}`,
      }}
    >
      <PageContainer as="main" className="relative z-10 py-4 md:py-5" width="workspace">
        <div className="space-y-4">
          <PageHeader
            className="flex-row items-center justify-between"
            bordered={false}
            icon={BarChart3}
            title={sm('guild.polls.title')}
            description={`${activePolls.length} ${sm('guild.polls.tab.active').toLowerCase()} • ${closedPolls.length} ${sm('guild.polls.tab.closed').toLowerCase()}`}
            actions={canManagePolls ? (
              <Button onClick={() => navigate(`${basePath}/polls/new`)} size="sm" className="h-9 w-9 p-0 sm:w-auto sm:px-3">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{sm('guild.polls.new')}</span>
              </Button>
            ) : null}
          />

          {pollsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : polls.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={sm('guild.polls.empty')}
              action={canManagePolls ? (
                <Button onClick={() => navigate(`${basePath}/polls/new`)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {sm('guild.polls.new')}
                </Button>
              ) : null}
            />
          ) : (
            <Tabs defaultValue={defaultTab}>
              <TabsList
                className={`mb-3 grid h-auto w-full max-w-full overflow-hidden p-1 sm:inline-flex sm:w-auto sm:justify-start ${
                  canManagePolls ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                <TabsTrigger value="active" className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
                  <span className="truncate">{sm('guild.polls.tab.active')} ({activePolls.length})</span>
                </TabsTrigger>
                {canManagePolls && (
                  <TabsTrigger value="draft" className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
                    <span className="truncate">{sm('guild.polls.tab.draft')} ({draftPolls.length})</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="closed" className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
                  <span className="truncate">{sm('guild.polls.tab.closed')} ({closedPolls.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-0 space-y-3 sm:space-y-4">
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
                  <EmptyState icon={ClipboardList} title={sm('guild.polls.empty.active')} className="min-h-[180px]" />
                )}
              </TabsContent>

              {canManagePolls && (
                <TabsContent value="draft" className="mt-0 space-y-3 sm:space-y-4">
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
                    <EmptyState icon={ClipboardList} title={sm('guild.polls.empty.draft')} className="min-h-[180px]" />
                  )}
                </TabsContent>
              )}

              <TabsContent value="closed" className="mt-0 space-y-3 sm:space-y-4">
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
                  <EmptyState icon={ClipboardList} title={sm('guild.polls.empty.closed')} className="min-h-[180px]" />
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </PageContainer>
    </GuildWorkspaceShell>
  );
};

export default GuildPolls;
