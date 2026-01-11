import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClassGrid } from '@/components/ClassGrid';
import { SpecButtons } from '@/components/SpecButtons';
import { CommitmentToggle } from '@/components/CommitmentToggle';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { toSlug } from '@/lib/guildSlug';

interface WishData {
  classId: string;
  specIds: string[];
  comment: string;
}

const Wishes = () => {
  const navigate = useNavigate();
  const { serverSlug, guildSlug } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; faction: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [wishes, setWishes] = useState<WishData[]>([
    { classId: '', specIds: [], comment: '' },
    { classId: '', specIds: [], comment: '' },
    { classId: '', specIds: [], comment: '' },
  ]);

  useEffect(() => {
    if (!user || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      // Find guild by slugified server and name
      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, faction');
      
      const matchedGuild = allGuilds?.find(g => 
        toSlug(g.server) === serverSlug && toSlug(g.name) === guildSlug
      );
      
      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }
      
      const foundGuildId = matchedGuild.id;
      setGuildId(foundGuildId);
      setGuild({ name: matchedGuild.name, server: matchedGuild.server, faction: matchedGuild.faction });

      const { data: wishesData } = await supabase
        .from('class_wishes')
        .select('*')
        .eq('guild_id', foundGuildId)
        .eq('user_id', user.id)
        .order('choice_index');

      if (wishesData && wishesData.length > 0) {
        const loadedWishes: WishData[] = [
          { classId: '', specIds: [], comment: '' },
          { classId: '', specIds: [], comment: '' },
          { classId: '', specIds: [], comment: '' },
        ];
        wishesData.forEach(w => {
          const idx = w.choice_index - 1;
          if (idx >= 0 && idx < 3) {
            loadedWishes[idx] = {
              classId: w.class_id,
              specIds: w.spec_ids || [],
              comment: w.comment || '',
            };
          }
        });
        setWishes(loadedWishes);
      }

      const { data: memberData } = await supabase
        .from('guild_members')
        .select('status')
        .eq('guild_id', foundGuildId)
        .eq('user_id', user.id)
        .single();

      if (memberData) setConfirmed(memberData.status === 'confirmed');

      setLoading(false);
    };

    fetchData();
  }, [user, serverSlug, guildSlug, navigate]);

  const updateWish = (index: number, field: keyof WishData, value: any) => {
    const updated = [...wishes];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'classId') {
      updated[index].specIds = [];
    }
    setWishes(updated);
  };

  const saveWishes = async () => {
    if (!user || !guildId) return;
    setSaving(true);

    try {
      await supabase
        .from('guild_members')
        .update({ status: confirmed ? 'confirmed' : 'potential' })
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Use upsert to avoid duplicate key errors
      const wishesToUpsert = wishes
        .map((w, i) => ({
          guild_id: guildId,
          user_id: user.id,
          choice_index: i + 1,
          class_id: w.classId,
          spec_ids: w.specIds,
          comment: w.comment,
        }))
        .filter(w => w.class_id);

      // Delete wishes that are now empty
      const emptyChoiceIndexes = wishes
        .map((w, i) => (!w.classId ? i + 1 : null))
        .filter((idx): idx is number => idx !== null);

      if (emptyChoiceIndexes.length > 0) {
        await supabase
          .from('class_wishes')
          .delete()
          .eq('guild_id', guildId)
          .eq('user_id', user.id)
          .in('choice_index', emptyChoiceIndexes);
      }

      if (wishesToUpsert.length > 0) {
        const { error } = await supabase
          .from('class_wishes')
          .upsert(wishesToUpsert, { 
            onConflict: 'guild_id,user_id,choice_index',
            ignoreDuplicates: false 
          });
        if (error) throw error;
      }

      toast({ title: t.wishes.wishesSaved });
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
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


  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      {/* Sticky save bar for guild name + save button */}
      <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-3xl">
          <h1 className="text-lg font-semibold text-foreground">{guild?.name}</h1>
          <CosmicButton 
            size="sm" 
            onClick={saveWishes} 
            loading={saving}
            icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
          >
            {t.wishes.saveWishes}
          </CosmicButton>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="h-7 w-7 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold cosmic-text mb-2">{t.wishes.title}</h2>
          <p className="text-muted-foreground text-lg">{t.wishes.subtitle}</p>
        </div>

        {/* Commitment toggle */}
        <GlowCard className="p-6 mb-8">
          <CommitmentToggle confirmed={confirmed} onChange={setConfirmed} />
        </GlowCard>

        {/* Wish cards */}
        <div className="space-y-6">
          {wishes.map((wish, index) => (
            <GlowCard 
              key={index} 
              className="p-6"
              hoverable={false}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t.wishes.choice} #{index + 1}
                  </h3>
                <p className="text-sm text-muted-foreground">
                  {index === 0 ? t.wishes.preferredChoice : index === 1 ? t.wishes.secondChoice : t.wishes.thirdChoice}
                </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-foreground mb-3 block">{t.wishes.selectClass}</Label>
                  <ClassGrid
                    value={wish.classId}
                    onChange={(classId) => updateWish(index, 'classId', classId)}
                  />
                </div>

                {wish.classId && (
                  <div>
                    <Label className="text-foreground mb-3 block">{t.wishes.selectSpecs}</Label>
                    <SpecButtons
                      classId={wish.classId}
                      selectedSpecs={wish.specIds}
                      onChange={(specIds) => updateWish(index, 'specIds', specIds)}
                    />
                  </div>
                )}

                <div>
                  <Label className="text-foreground mb-2 block">{t.wishes.comment}</Label>
                  <Textarea
                    placeholder={t.wishes.commentPlaceholder}
                    value={wish.comment}
                    onChange={(e) => updateWish(index, 'comment', e.target.value)}
                    className="cosmic-input min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <div className="mt-10 text-center">
          <CosmicButton 
            size="lg" 
            onClick={saveWishes} 
            loading={saving}
            icon={<Save className="h-5 w-5" strokeWidth={1.5} />}
          >
            {t.wishes.saveWishes}
          </CosmicButton>
        </div>
      </main>
    </div>
  );
};

export default Wishes;