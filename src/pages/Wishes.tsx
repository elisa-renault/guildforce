import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WishCardEditor } from '@/components/WishCardEditor';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Loader2, Save, GripVertical, Plus, Trash2, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';
import { toSlug, getGuildPath } from '@/lib/guildSlug';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WishData {
  id: string;
  classId: string;
  specIds: string[];
  comment: string;
}

interface SortableWishCardProps {
  wish: WishData;
  index: number;
  totalWishes: number;
  onChange: (field: keyof Omit<WishData, 'id'>, value: any) => void;
  onRemove: () => void;
  onClear: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canRemove: boolean;
  choiceLabels: string[];
  usedClassIds: string[];
}

const SortableWishCard = ({ wish, index, totalWishes, onChange, onRemove, onClear, onMoveUp, onMoveDown, canRemove, choiceLabels, usedClassIds }: SortableWishCardProps) => {
  const { t } = useLanguage();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wish.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < totalWishes - 1;

  return (
    <div ref={setNodeRef} style={style}>
      <GlowCard 
        className="p-4"
        hoverable={false}
      >
        {/* Header with controls */}
        <div className="flex items-center gap-2 mb-4">
          {/* Reorder controls */}
          <div className="flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <button
            {...attributes}
            {...listeners}
            className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20">
            <span className="text-sm font-bold text-primary">{index + 1}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm text-foreground">
              {t.wishes.choice} #{index + 1}
            </h3>
          </div>
          {canRemove ? (
            <button
              onClick={onRemove}
              className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
              title={t.common.delete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          ) : wish.classId && (
            <button
              onClick={onClear}
              className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              title={t.common.delete}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Wish editor */}
        <WishCardEditor
          wish={wish}
          onChange={onChange}
          usedClassIds={usedClassIds}
        />
      </GlowCard>
    </div>
  );
};

const Wishes = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string } | null>(null);
  const [confirmed, setConfirmed] = useState<CommitmentStatus>('undecided');
  const [wishes, setWishes] = useState<WishData[]>([
    { id: 'wish-1', classId: '', specIds: [], comment: '' },
    { id: 'wish-2', classId: '', specIds: [], comment: '' },
    { id: 'wish-3', classId: '', specIds: [], comment: '' },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const choiceLabels = [
    t.wishes.preferredChoice,
    t.wishes.secondChoice,
    t.wishes.thirdChoice,
  ];

  useEffect(() => {
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      // Find guild by slugified region, server and name
      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, faction');
      
      const matchedGuild = allGuilds?.find(g => 
        toSlug(g.region || 'eu') === regionSlug &&
        toSlug(g.server) === serverSlug && 
        toSlug(g.name) === guildSlug
      );
      
      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }
      
      const foundGuildId = matchedGuild.id;
      setGuildId(foundGuildId);
      setGuild({ name: matchedGuild.name, server: matchedGuild.server, region: matchedGuild.region || 'eu', faction: matchedGuild.faction });

      const { data: wishesData } = await supabase
        .from('class_wishes')
        .select('*')
        .eq('guild_id', foundGuildId)
        .eq('user_id', user.id)
        .order('choice_index');

      if (wishesData && wishesData.length > 0) {
        const loadedWishes: WishData[] = wishesData.map((w, index) => ({
          id: `wish-${index + 1}`,
          classId: w.class_id,
          specIds: w.spec_ids || [],
          comment: w.comment || '',
        }));
        setWishes(loadedWishes);
      }

      const { data: memberData } = await supabase
        .from('guild_members')
        .select('status')
        .eq('guild_id', foundGuildId)
        .eq('user_id', user.id)
        .single();

      if (memberData) {
        // Map DB status to CommitmentStatus
        const statusMap: Record<string, CommitmentStatus> = {
          'confirmed': 'confirmed',
          'potential': 'undecided',
          'withdrawn': 'withdrawn',
        };
        setConfirmed(statusMap[memberData.status] || 'undecided');
      }

      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, navigate]);

  const updateWish = (index: number, field: keyof Omit<WishData, 'id'>, value: any) => {
    const updated = [...wishes];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'classId') {
      updated[index].specIds = [];
    }
    setWishes(updated);
  };

  const addWish = () => {
    if (wishes.length >= 13) return; // Max 13 wishes (one per class)
    const newId = `wish-${Date.now()}`;
    setWishes([...wishes, { id: newId, classId: '', specIds: [], comment: '' }]);
  };

  const removeWish = (index: number) => {
    if (wishes.length <= 1) return;
    setWishes(wishes.filter((_, i) => i !== index));
  };

  const clearWish = (index: number) => {
    const updated = [...wishes];
    updated[index] = { ...updated[index], classId: '', specIds: [], comment: '' };
    setWishes(updated);
  };

  const moveWish = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= wishes.length) return;
    setWishes(arrayMove(wishes, index, newIndex));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setWishes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveWishes = async () => {
    if (!user || !guildId) return;
    setSaving(true);

    try {
      // Map CommitmentStatus to DB status
      const dbStatus = confirmed === 'withdrawn' ? 'withdrawn' : (confirmed === 'confirmed' ? 'confirmed' : 'potential');
      await supabase
        .from('guild_members')
        .update({ status: dbStatus })
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Delete all existing wishes first
      await supabase
        .from('class_wishes')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Insert wishes with new order
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
        const { error } = await supabase
          .from('class_wishes')
          .insert(wishesToInsert);
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
        <div className="container mx-auto px-3 md:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => guild && navigate(getGuildPath(guild.region, guild.server, guild.name))}
              className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              title={t.common.back}
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">{guild?.name}</h1>
          </div>
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

      <main className="container mx-auto px-3 md:px-4 py-4 relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-display cosmic-text">{t.wishes.title}</h2>
        </div>

        {/* Commitment toggle */}
        <GlowCard className="p-4 mb-4">
          <CommitmentToggle status={confirmed} onChange={setConfirmed} />
        </GlowCard>

        {/* Wish cards with drag and drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={wishes.map(w => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {wishes.map((wish, index) => {
                // Get all used class IDs except the current wish's class
                const usedClassIds = wishes
                  .filter((_, i) => i !== index)
                  .map(w => w.classId)
                  .filter(Boolean);
                
                return (
                  <SortableWishCard
                    key={wish.id}
                    wish={wish}
                    index={index}
                    totalWishes={wishes.length}
                    onChange={(field, value) => updateWish(index, field, value)}
                    onRemove={() => removeWish(index)}
                    onClear={() => clearWish(index)}
                    onMoveUp={() => moveWish(index, 'up')}
                    onMoveDown={() => moveWish(index, 'down')}
                    canRemove={wishes.length > 1}
                    choiceLabels={choiceLabels}
                    usedClassIds={usedClassIds}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add wish button */}
        {wishes.length < 13 && (
          <div className="mt-4 text-center">
            <button
              onClick={addWish}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-primary/50 text-sm text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t.wishes.addWish}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <CosmicButton 
            size="md" 
            onClick={saveWishes} 
            loading={saving}
            icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
          >
            {t.wishes.saveWishes}
          </CosmicButton>
        </div>
      </main>
    </div>
  );
};

export default Wishes;
