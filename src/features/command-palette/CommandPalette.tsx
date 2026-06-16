import {
  AlertTriangle,
  BarChart3,
  Clock3,
  PanelTop,
  Search,
  Shield,
  Sparkles,
  Table,
  User,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { buildCommandPaletteRegistry } from './registry';
import { resolveCommandPaletteHref } from './resolve';
import type {
  CommandPaletteGroupId,
  CommandPaletteGuildContext,
  CommandPaletteItem,
  CommandPaletteResultType,
} from './types';
import { useCommandPaletteSearch } from './useCommandPaletteSearch';
import type { LucideIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { BATTLENET_CLASS_MAP } from '@/data/battlenetClasses';
import { getLocalizedClassName } from '@/data/wowClasses';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { wowClassColorValue } from '@/lib/design-tokens';
import log from '@/lib/logger';
import { cn } from '@/lib/utils';


interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeGuild: CommandPaletteGuildContext | null;
  userGuilds: CommandPaletteGuildContext[];
  shortcutLabel: string;
}

const iconByType: Record<CommandPaletteResultType, LucideIcon> = {
  action: Zap,
  page: PanelTop,
  guild: Shield,
  member: User,
  roster: Table,
  poll: BarChart3,
};

const getItemInitial = (item: CommandPaletteItem) => item.title.charAt(0).toUpperCase();

const getStringMetadata = (item: CommandPaletteItem, key: string) => {
  const value = item.metadata?.[key];
  return typeof value === 'string' ? value : null;
};

const getNumberMetadata = (item: CommandPaletteItem, key: string) => {
  const value = item.metadata?.[key];
  return typeof value === 'number' ? value : null;
};

const getBooleanMetadata = (item: CommandPaletteItem, key: string) => item.metadata?.[key] === true;

const getMemberClassLabel = (item: CommandPaletteItem, language: string) => {
  const battlenetClassId = getNumberMetadata(item, 'character_class_id');
  if (!battlenetClassId) return null;

  const classId = BATTLENET_CLASS_MAP[battlenetClassId];
  if (!classId) return null;

  return {
    label: getLocalizedClassName(classId, language),
    color: wowClassColorValue(classId),
  };
};

export const CommandPalette = ({
  open,
  onOpenChange,
  activeGuild,
  userGuilds,
  shortcutLabel,
}: CommandPaletteProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { isAdmin } = useIsAdmin();
  const [query, setQuery] = useState('');

  const localItems = useMemo(
    () => buildCommandPaletteRegistry({ t, activeGuild, isAdmin }),
    [activeGuild, isAdmin, t],
  );

  const { groups, loading, error } = useCommandPaletteSearch({
    open,
    query,
    contextGuildId: activeGuild?.id,
    localItems,
    userGuilds,
  });
  const hasSearchError = Boolean(error) && query.trim().length > 0;

  const resetAndClose = () => {
    setQuery('');
    onOpenChange(false);
  };

  const recordUse = async (item: CommandPaletteItem, href: string | null) => {
    if (!user) return;

    const { error } = await supabase.rpc('record_command_palette_use', {
      p_item_type: item.type,
      p_item_id: item.id,
      p_title: item.title,
      p_subtitle: item.subtitle || null,
      p_href: href,
      p_guild_id: item.guildId || null,
      p_metadata: item.metadata || {},
    });

    if (error) {
      log.debug('Command palette recent recording skipped:', error.message);
    }
  };

  const activateItem = async (item: CommandPaletteItem) => {
    const href = resolveCommandPaletteHref(item);
    await recordUse(item, href);
    resetAndClose();

    if (href) {
      navigate(href);
    }
  };

  const renderItemMedia = (item: CommandPaletteItem) => {
    const Icon = iconByType[item.type];
    const avatarUrl = getStringMetadata(item, 'avatar_url');
    const memberClass = item.type === 'member' ? getMemberClassLabel(item, language) : null;

    if ((item.type === 'guild' || item.type === 'member') && avatarUrl) {
      return (
        <Avatar className="h-9 w-9 shrink-0 border border-border/50 bg-muted/30">
          <AvatarImage src={avatarUrl} alt="" />
          <AvatarFallback className="text-xs">{getItemInitial(item)}</AvatarFallback>
        </Avatar>
      );
    }

    return (
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/45 bg-card/35 text-muted-foreground"
        style={memberClass ? { color: memberClass.color } : undefined}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" strokeWidth={1.7} />
      </span>
    );
  };

  const renderItemMeta = (item: CommandPaletteItem) => {
    const memberClass = item.type === 'member' ? getMemberClassLabel(item, language) : null;
    const rankName = getStringMetadata(item, 'rank_name');
    const isMain = getBooleanMetadata(item, 'is_main');
    const isLinked = getBooleanMetadata(item, 'is_linked');
    const pollStatus = getStringMetadata(item, 'status');

    if (item.type === 'member') {
      return (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {memberClass ? (
            <Badge variant="outline" className="h-5 border-border/45 bg-background/35 px-1.5 text-[10px]" style={{ color: memberClass.color }}>
              {memberClass.label}
            </Badge>
          ) : null}
          {rankName ? <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{rankName}</Badge> : null}
          {isMain ? <Badge variant="outline" className="h-5 border-status-warning/35 bg-status-warning/10 px-1.5 text-[10px] text-status-warning">{t.commandPalette.badges.main}</Badge> : null}
          <Badge variant="outline" className="h-5 border-border/45 bg-background/35 px-1.5 text-[10px]">
            {isLinked ? t.commandPalette.badges.linked : t.commandPalette.badges.notLinked}
          </Badge>
        </div>
      );
    }

    if (item.type === 'poll' && pollStatus) {
      return (
        <div className="mt-1">
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{pollStatus}</Badge>
        </div>
      );
    }

    if (item.group === 'recent' && item.recentCount && item.recentCount > 1) {
      return <p className="mt-1 text-[11px] text-muted-foreground">{t.commandPalette.usedCount.replace('{count}', String(item.recentCount))}</p>;
    }

    return null;
  };

  const renderGroup = (groupId: CommandPaletteGroupId, items: CommandPaletteItem[]) => (
    <CommandGroup
      key={groupId}
      heading={t.commandPalette.groups[groupId]}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em]"
    >
      {items.map((item) => (
        <CommandItem
          key={`${groupId}:${item.type}:${item.id}`}
          value={`${groupId}:${item.type}:${item.id}`}
          onSelect={() => {
            void activateItem(item);
          }}
          className={cn(
            'mx-1.5 min-h-14 cursor-pointer gap-3 rounded-lg px-2.5 py-2.5 data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground',
            isMobile && 'min-h-16 px-3 py-3',
          )}
        >
          {renderItemMedia(item)}
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
            {item.subtitle ? <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span> : null}
            {renderItemMeta(item)}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );

  const content = (
    <Command shouldFilter={false} loop className="rounded-none border-0 bg-transparent">
      <div className="border-b border-border/45 bg-background/70">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={activeGuild ? t.commandPalette.placeholderInGuild.replace('{guild}', activeGuild.name) : t.commandPalette.placeholder}
          className="h-12 text-base"
        />
      </div>

      <CommandList className={cn('max-h-[58vh] px-1.5 py-2', isMobile && 'max-h-[calc(92dvh-10rem)]')}>
        {hasSearchError ? (
          <div className="mx-1.5 mb-1 flex items-center gap-2 rounded-lg border border-status-warning/25 bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{t.commandPalette.searchUnavailable}</span>
          </div>
        ) : null}
        {groups.length > 0 ? (
          groups.map((group) => renderGroup(group.id, group.items))
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center px-8 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-border/45 bg-card/35 text-muted-foreground">
              {loading ? <Sparkles className="h-5 w-5 animate-pulse" /> : <Search className="h-5 w-5" />}
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              {loading ? t.commandPalette.loading : t.commandPalette.emptyTitle}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {loading ? t.commandPalette.loadingHint : t.commandPalette.emptyDescription}
            </p>
          </div>
        )}
      </CommandList>

      <div className="flex items-center justify-between border-t border-border/45 bg-background/70 px-4 py-2.5 text-[11px] text-muted-foreground">
        <div className="hidden items-center gap-2 sm:flex">
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5">Up/Down</kbd>
          <span>{t.commandPalette.keyboard.navigate}</span>
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5">Enter</kbd>
          <span>{t.commandPalette.keyboard.open}</span>
          <kbd className="rounded border border-border/60 bg-muted/40 px-1.5 py-0.5">Esc</kbd>
          <span>{t.commandPalette.keyboard.close}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{shortcutLabel}</span>
        </div>
      </div>
    </Command>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="h-[92dvh] border-border/60 bg-background/95 p-0 backdrop-blur-xl">
          <DrawerTitle className="sr-only">{t.commandPalette.title}</DrawerTitle>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] max-w-2xl translate-y-0 overflow-hidden border-border/60 bg-background/95 p-0 shadow-[0_24px_90px_hsl(var(--background)/0.65)] backdrop-blur-xl">
        <DialogTitle className="sr-only">{t.commandPalette.title}</DialogTitle>
        {content}
      </DialogContent>
    </Dialog>
  );
};
