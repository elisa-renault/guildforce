import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toSlug } from '@/lib/guildSlug';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildSubNav } from '@/components/guild';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PollEditor } from '@/components/polls';
import { usePollMutations } from '@/hooks/useGuildPolls';
import { PollFormData } from '@/types/poll';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GuildPollNew = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, pollId } = useParams();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; avatar_url: string | null } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [rosters, setRosters] = useState<{ id: string; name: string }[]>([]);
  const [existingPoll, setExistingPoll] = useState<any>(null);

  const { createPoll, updatePoll, publishPoll, saving } = usePollMutations();

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !regionSlug || !serverSlug || !guildSlug) return;

      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region');

      const matchedGuild = allGuilds?.find(g =>
        toSlug(g.region || 'eu') === regionSlug &&
        toSlug(g.server) === serverSlug &&
        toSlug(g.name) === guildSlug
      );

      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }

      setGuildId(matchedGuild.id);
      setGuild({
        name: matchedGuild.name,
        server: matchedGuild.server,
        region: matchedGuild.region || 'eu',
        avatar_url: null,
      });

      // Check GM status
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: matchedGuild.id,
        p_user_id: user.id,
      });

      if (!gmCheck) {
        navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}`);
        return;
      }

      setIsGM(true);

      // Fetch rosters
      const { data: rostersData } = await supabase
        .from('rosters')
        .select('id, name')
        .eq('guild_id', matchedGuild.id)
        .order('name');

      setRosters(rostersData || []);

      // If editing, fetch existing poll
      if (pollId) {
        const { data: pollData } = await supabase
          .from('guild_polls')
          .select(`
            *,
            questions:guild_poll_questions(*)
          `)
          .eq('id', pollId)
          .single();

        if (pollData) {
          setExistingPoll(pollData);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, pollId, navigate]);

  const handleSave = async (data: PollFormData) => {
    if (!guildId) return;

    try {
      if (existingPoll) {
        await updatePoll(existingPoll.id, data);
        toast({ title: language === 'fr' ? 'Sondage enregistré' : 'Poll saved' });
      } else {
        await createPoll(guildId, data);
        toast({ title: language === 'fr' ? 'Brouillon enregistré' : 'Draft saved' });
      }
      navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`);
    } catch (error: any) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handlePublish = async (data: PollFormData) => {
    if (!guildId) return;

    try {
      let pollIdToPublish = existingPoll?.id;
      
      if (!pollIdToPublish) {
        // Create first, then publish
        pollIdToPublish = await createPoll(guildId, data);
      } else {
        await updatePoll(existingPoll.id, data);
      }
      
      if (pollIdToPublish) {
        await publishPoll(pollIdToPublish);
        toast({ title: language === 'fr' ? 'Sondage publié !' : 'Poll published!' });
        navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`);
      }
    } catch (error: any) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isGM) {
    return null;
  }

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;
  const breadcrumbs = [
    { label: t.guildNav?.polls || 'Polls', href: `${basePath}/polls` },
    { label: existingPoll ? (language === 'fr' ? 'Modifier' : 'Edit') : (language === 'fr' ? 'Nouveau' : 'New') },
  ];

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      {guild && (
        <GuildSubNav
          guild={guild}
          basePath={basePath}
          isGM={isGM}
          activeTab="polls"
        />
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumbs items={breadcrumbs} className="mb-4" />
        <h1 className="text-2xl font-bold mb-6">
          {existingPoll 
            ? (language === 'fr' ? 'Modifier le sondage' : 'Edit Poll') 
            : (language === 'fr' ? 'Nouveau sondage' : 'New Poll')
          }
        </h1>

        <PollEditor
          rosters={rosters}
          initialData={existingPoll ? {
            title: existingPoll.title,
            description: existingPoll.description || '',
            is_anonymous: existingPoll.is_anonymous,
            allow_multiple_responses: existingPoll.allow_multiple_responses,
            roster_id: existingPoll.roster_id,
            ends_at: existingPoll.ends_at,
            questions: existingPoll.questions?.map((q: any) => ({
              id: q.id,
              question_text: q.question_text,
              question_type: q.question_type,
              is_required: q.is_required,
              options: q.options || [],
            })) || [],
          } : undefined}
          onSave={handleSave}
          onPublish={handlePublish}
          saving={saving}
        />
      </div>
    </div>
  );
};

export default GuildPollNew;