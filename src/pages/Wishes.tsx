import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClassSelector } from '@/components/ClassSelector';
import { SpecSelector } from '@/components/SpecSelector';
import { Loader2, ArrowLeft, Save } from 'lucide-react';

interface WishData {
  classId: string;
  specIds: string[];
  comment: string;
}

const Wishes = () => {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guild, setGuild] = useState<{ name: string; faction: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [wishes, setWishes] = useState<WishData[]>([
    { classId: '', specIds: [], comment: '' },
    { classId: '', specIds: [], comment: '' },
    { classId: '', specIds: [], comment: '' },
  ]);

  useEffect(() => {
    if (!user || !guildId) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      // Fetch guild info
      const { data: guildData } = await supabase
        .from('guilds')
        .select('name, faction')
        .eq('id', guildId)
        .single();
      
      if (guildData) setGuild(guildData);

      // Fetch existing wishes
      const { data: wishesData } = await supabase
        .from('class_wishes')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', user.id)
        .order('choice_index');

      if (wishesData && wishesData.length > 0) {
        const loadedWishes = [...wishes];
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

      // Fetch member status
      const { data: memberData } = await supabase
        .from('guild_members')
        .select('status')
        .eq('guild_id', guildId)
        .eq('user_id', user.id)
        .single();

      if (memberData) setConfirmed(memberData.status === 'confirmed');

      setLoading(false);
    };

    fetchData();
  }, [user, guildId, navigate]);

  const updateWish = (index: number, field: keyof WishData, value: any) => {
    const updated = [...wishes];
    updated[index] = { ...updated[index], [field]: value };
    // Reset specs when class changes
    if (field === 'classId') {
      updated[index].specIds = [];
    }
    setWishes(updated);
  };

  const saveWishes = async () => {
    if (!user || !guildId) return;
    setSaving(true);

    try {
      // Update member status
      await supabase
        .from('guild_members')
        .update({ status: confirmed ? 'confirmed' : 'potential' })
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Delete existing wishes
      await supabase
        .from('class_wishes')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Insert new wishes (only non-empty ones)
      const wishesToInsert = wishes
        .map((w, i) => ({
          guild_id: guildId,
          user_id: user.id,
          choice_index: i + 1,
          class_id: w.classId,
          spec_ids: w.specIds,
          comment: w.comment,
        }))
        .filter(w => w.class_id);

      if (wishesToInsert.length > 0) {
        const { error } = await supabase.from('class_wishes').insert(wishesToInsert);
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/guilds')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
          </Button>
          <h1 className="text-xl font-bold">{guild?.name}</h1>
          <Button onClick={saveWishes} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {t.wishes.saveWishes}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">{t.wishes.title}</h2>
          <p className="text-muted-foreground">{t.wishes.subtitle}</p>
        </div>

        {/* Status toggle */}
        <Card className="glass mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">{t.wishes.status}</Label>
                <p className="text-sm text-muted-foreground">
                  {confirmed ? t.wishes.confirmed : t.wishes.potential}
                </p>
              </div>
              <Switch checked={confirmed} onCheckedChange={setConfirmed} />
            </div>
          </CardContent>
        </Card>

        {/* Wish cards */}
        <div className="space-y-6">
          {wishes.map((wish, index) => (
            <Card key={index} className="glass animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t.wishes.choice} #{index + 1}
                </CardTitle>
                <CardDescription>
                  {index === 0 ? 'Your preferred class' : index === 1 ? 'Second choice' : 'Third choice'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t.wishes.selectClass}</Label>
                  <ClassSelector
                    value={wish.classId}
                    onChange={(classId) => updateWish(index, 'classId', classId)}
                  />
                </div>

                {wish.classId && (
                  <div>
                    <Label className="mb-2 block">{t.wishes.selectSpecs}</Label>
                    <SpecSelector
                      classId={wish.classId}
                      selectedSpecs={wish.specIds}
                      onChange={(specIds) => updateWish(index, 'specIds', specIds)}
                    />
                  </div>
                )}

                <div>
                  <Label>{t.wishes.comment}</Label>
                  <Textarea
                    placeholder={t.wishes.commentPlaceholder}
                    value={wish.comment}
                    onChange={(e) => updateWish(index, 'comment', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button size="lg" onClick={saveWishes} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {t.wishes.saveWishes}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Wishes;
