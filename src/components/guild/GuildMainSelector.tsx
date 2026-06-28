import { Check, Loader2, UserCog } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/ui/sonner';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';
import { BATTLENET_CLASS_MAP } from '@/data/battlenetClasses';
import { supabase } from '@/integrations/supabase/client';
import { wowClassColorValue } from '@/lib/design-tokens';
import { formatRealmDisplayName } from '@/lib/realms';
import { cn } from '@/lib/utils';

export interface GuildMainCandidate {
  character_id: string | null;
  roster_cache_id: string | null;
  character_name: string;
  character_realm: string | null;
  character_realm_slug: string;
  character_level: number | null;
  character_class_id: number | null;
  rank_index: number | null;
  is_effective_main: boolean;
}

interface GuildMainSelectorProps {
  guildId: string | null;
  memberId: string | null;
  canEdit: boolean;
  compact?: boolean;
  triggerMode?: 'pill' | 'menu-item';
  deferredSelectionKey?: string | null;
  onDeferredSelect?: (candidate: GuildMainCandidate) => void;
  onChanged?: () => void;
}

const getClassColor = (battlenetClassId: number | null): string => {
  if (!battlenetClassId) return 'hsl(var(--foreground))';
  const classKey = BATTLENET_CLASS_MAP[battlenetClassId];
  return classKey ? wowClassColorValue(classKey) : 'hsl(var(--foreground))';
};

export const GuildMainSelector = ({
  guildId,
  memberId,
  canEdit,
  compact = false,
  triggerMode = 'pill',
  deferredSelectionKey,
  onDeferredSelect,
  onChanged,
}: GuildMainSelectorProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<GuildMainCandidate[]>([]);

  const loadCandidates = async () => {
    if (!guildId || !memberId || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_guild_member_main_candidates', {
        p_guild_id: guildId,
        p_member_id: memberId,
      });
      if (error) throw error;
      setCandidates((data || []) as GuildMainCandidate[]);
    } catch {
      toast.error(t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void loadCandidates();
    }
  };

  const setGuildMain = async (candidate: GuildMainCandidate) => {
    if (!guildId || !memberId) return;
    const key = `${candidate.character_name}-${candidate.character_realm_slug}`;
    if (onDeferredSelect) {
      onDeferredSelect(candidate);
      setOpen(false);
      return;
    }

    setSavingKey(key);
    try {
      const { error } = await supabase.rpc('set_guild_member_main_character', {
        p_guild_id: guildId,
        p_member_id: memberId,
        p_character_name: candidate.character_name,
        p_realm_slug: candidate.character_realm_slug,
      });
      if (error) throw error;
      setCandidates((prev) => prev.map((item) => ({
        ...item,
        is_effective_main:
          item.character_name.toLowerCase() === candidate.character_name.toLowerCase()
          && item.character_realm_slug.toLowerCase() === candidate.character_realm_slug.toLowerCase(),
      })));
      setOpen(false);
      toast.success(t.battlenet.mainSet);
      onChanged?.();
    } catch {
      toast.error(t.errors.generic);
    } finally {
      setSavingKey(null);
    }
  };

  if (!canEdit || !guildId || !memberId) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={triggerMode === 'menu-item' ? 'ghost' : 'outline'}
          size="sm"
          className={cn(
            triggerMode === 'menu-item'
              ? 'h-8 w-full justify-start gap-2 rounded-sm px-2 text-sm font-normal text-foreground hover:bg-primary/10 hover:text-primary'
              : 'h-7 shrink-0 gap-1.5 rounded-full border-border/50 bg-background/60 px-2.5 text-xs text-muted-foreground hover:border-primary/35 hover:bg-primary/10 hover:text-primary',
            triggerMode === 'pill' && compact && 'h-6 px-2 text-[11px]',
          )}
          aria-label={t.battlenet.main}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <UserCog className="h-3.5 w-3.5" strokeWidth={1.6} />
          <span>{t.battlenet.main}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-1.5"
        onClick={(event) => event.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            {t.battlenet.noCharacters}
          </div>
        ) : (
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {candidates.map((candidate) => {
              const key = `${candidate.character_name}-${candidate.character_realm_slug}`;
              const saving = savingKey === key;
              const isSelected = deferredSelectionKey ? deferredSelectionKey === key : candidate.is_effective_main;
              return (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-primary/10',
                    isSelected && 'bg-primary/15',
                  )}
                  disabled={!!savingKey}
                  onClick={() => setGuildMain(candidate)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted/40 text-[11px] font-semibold">
                    {candidate.character_level || '-'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate font-medium"
                      style={{ color: getClassColor(candidate.character_class_id) }}
                    >
                      {candidate.character_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatRealmDisplayName(candidate.character_realm, candidate.character_realm_slug)}
                    </span>
                  </span>
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : isSelected ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
