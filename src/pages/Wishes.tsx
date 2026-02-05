import React, { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName } from '@/data/wowClasses';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WishCardEditor } from '@/components/WishCardEditor';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { GuildSubNav } from '@/components/guild';
import { RosterSelector } from '@/components/roster';
import { Loader2, Save, GripVertical, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { toSlug } from '@/lib/guildSlug';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
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

interface RosterData {
  id: string;
  name: string;
  is_default: boolean;
  hasAccess: boolean;
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

const SortableWishCard = forwardRef<HTMLDivElement, SortableWishCardProps>(({ wish, index, totalWishes, onChange, onRemove, onClear, onMoveUp, onMoveDown, canRemove, choiceLabels, usedClassIds }, outerRef) => {
  const { t } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
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
        className="p-3"
        hoverable={false}
      >
        <div className="flex items-center gap-2">
          {/* Reorder controls */}
          <div className="hidden lg:flex flex-col gap-0.5">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={s('wishes.move_up')}
            >
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={s('wishes.move_down')}
            >
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <button
            {...attributes}
            {...listeners}
            className="hidden lg:flex w-7 h-7 rounded-lg bg-muted/50 items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted transition-colors flex-shrink-0"
            title={s('wishes.drag_reorder')}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20 flex-shrink-0">
            <span className="text-sm font-bold text-primary">{index + 1}</span>
          </div>

          {/* Wish editor inline */}
          <WishCardEditor
            wish={wish}
            onChange={onChange}
            usedClassIds={usedClassIds}
          />

          {/* Delete button */}
          {canRemove ? (
            <button
              onClick={onRemove}
              className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors flex-shrink-0"
              title={t.common.delete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          ) : wish.classId ? (
            <button
              onClick={onClear}
              className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
              title={t.common.delete}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </button>
          ) : (
            <div className="w-7 h-7 flex-shrink-0" />
          )}
        </div>
      </GlowCard>
    </div>
  );
});

SortableWishCard.displayName = 'SortableWishCard';

const Wishes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const requestedRosterId = new URLSearchParams(location.search).get('rosterId');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; faction: string; avatar_url?: string | null } | null>(null);
  const [confirmed, setConfirmed] = useState<CommitmentStatus>('undecided');
  const [wishes, setWishes] = useState<WishData[]>([
    { id: 'wish-1', classId: '', specIds: [], comment: '' },
    { id: 'wish-2', classId: '', specIds: [], comment: '' },
    { id: 'wish-3', classId: '', specIds: [], comment: '' },
  ]);
  
  // Roster state
  const [rosters, setRosters] = useState<RosterData[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  
  // GM and permissions state
  const [isGM, setIsGM] = useState(false);
  const [hasActivityPermission, setHasActivityPermission] = useState(false);

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
    if (authLoading) return;
    if (!user || !regionSlug || !serverSlug || !guildSlug) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      // Find guild by slugified region, server and name
const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, faction, avatar_url');
      
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
      setGuild({ 
        name: matchedGuild.name, 
        server: matchedGuild.server, 
        region: matchedGuild.region || 'eu', 
        faction: matchedGuild.faction,
        avatar_url: matchedGuild.avatar_url 
      });

      // Check if user is GM
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: foundGuildId,
        p_user_id: user.id,
      });
      setIsGM(!!gmCheck);

      // Check activity permission
      const { data: activityPerm } = await supabase.rpc('has_guild_permission', {
        p_guild_id: foundGuildId,
        p_permission: 'view_activity_log',
        p_user_id: user.id,
      });
      setHasActivityPermission(!!activityPerm);

      // Fetch rosters and check access
      const { data: rostersData } = await supabase
        .from('rosters')
        .select('*')
        .eq('guild_id', foundGuildId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (rostersData) {
        // Check access for each roster - only show accessible ones on Wishes page
        const rostersWithAccess: RosterData[] = [];
        for (const roster of rostersData) {
          const { data: hasAccess } = await supabase.rpc('has_roster_access', {
            p_roster_id: roster.id,
            p_user_id: user.id,
          });
          if (hasAccess) {
            rostersWithAccess.push({
              id: roster.id,
              name: roster.name,
              is_default: roster.is_default,
              hasAccess: true,
            });
          }
        }
        setRosters(rostersWithAccess);
        
        // Select roster from querystring (when coming from roster table) or default roster
        const requested = requestedRosterId
          ? rostersWithAccess.find(r => r.id === requestedRosterId)
          : undefined;
        const defaultRoster = rostersWithAccess.find(r => r.is_default) || rostersWithAccess[0];
        const initialRoster = requested || defaultRoster;
        if (initialRoster) {
          setSelectedRosterId(initialRoster.id);
        }
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
  }, [user, authLoading, regionSlug, serverSlug, guildSlug, navigate, requestedRosterId]);

  // Fetch wishes when roster changes
  useEffect(() => {
    if (!guildId || !selectedRosterId || !user) return;

    const fetchWishes = async () => {
      const { data: wishesData } = await supabase
        .from('class_wishes')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', user.id)
        .eq('roster_id', selectedRosterId)
        .order('choice_index');

      if (wishesData && wishesData.length > 0) {
        const loadedWishes: WishData[] = wishesData.map((w, index) => ({
          id: `wish-${index + 1}`,
          classId: w.class_id,
          specIds: w.spec_ids || [],
          comment: w.comment || '',
        }));
        setWishes(loadedWishes);
      } else {
        // Reset to empty wishes if no data for this roster
        setWishes([
          { id: 'wish-1', classId: '', specIds: [], comment: '' },
          { id: 'wish-2', classId: '', specIds: [], comment: '' },
          { id: 'wish-3', classId: '', specIds: [], comment: '' },
        ]);
      }
    };

    fetchWishes();
  }, [guildId, selectedRosterId, user]);

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
    if (!user || !guildId) {
      toast({ title: t.errors.generic, description: s('wishes.session_expired'), variant: 'destructive' });
      return;
    }
    if (!selectedRosterId) {
      toast({ title: t.errors.generic, description: t.wishes.noRosterSelected, variant: 'destructive' });
      return;
    }
    
    // Validate: each wish with a class must have at least one spec
    const invalidWish = wishes.find(w => w.classId && w.specIds.length === 0);
    if (invalidWish) {
      const cls = getClassById(invalidWish.classId);
      toast({
        title: t.wishes.specRequired,
        description: interpolateMessage(t.wishes.specRequiredDesc, {
          class: cls ? getLocalizedClassName(cls.id, language) : '',
        }),
        variant: 'destructive'
      });
      return;
    }
    setSaving(true);

    try {
      // Map CommitmentStatus to DB status
      const dbStatus = confirmed === 'withdrawn' ? 'withdrawn' : (confirmed === 'confirmed' ? 'confirmed' : 'potential');
      await supabase
        .from('guild_members')
        .update({ status: dbStatus })
        .eq('guild_id', guildId)
        .eq('user_id', user.id);

      // Delete all existing wishes for this roster first
      await supabase
        .from('class_wishes')
        .delete()
        .eq('guild_id', guildId)
        .eq('user_id', user.id)
        .eq('roster_id', selectedRosterId);

      // Insert wishes with new order and roster_id
      const wishesToInsert = wishes
        .map((w, i) => ({
          guild_id: guildId,
          user_id: user.id,
          roster_id: selectedRosterId,
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
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only show accessible rosters
  const accessibleRosters = rosters.filter(r => r.hasAccess);

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      {/* Guild Sub-Navigation */}
      {guild && (
        <GuildSubNav
          guild={guild}
          basePath={basePath}
          isGM={isGM}
          hasSettingsPermission={isGM || hasActivityPermission}
          activeTab="wishes"
        />
      )}

      {/* Roster + Save controls */}
      <div className="sticky top-[104px] z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-3 md:px-4 py-3 flex items-center justify-between">
          <RosterSelector
            rosters={accessibleRosters}
            selectedRosterId={selectedRosterId}
            onSelect={setSelectedRosterId}
          />
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
