import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { CommandPalette } from './CommandPalette';
import { CommandPaletteContext } from './CommandPaletteContext';
import type { CommandPaletteGuildContext } from './types';
import type { ReactNode } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useUserGuilds } from '@/hooks/useUserGuilds';
import { getGuildPath } from '@/lib/guildSlug';

const isMacPlatform = () => {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
};

export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const { guilds } = useUserGuilds({ enabled: Boolean(user?.id) });
  const [isOpen, setIsOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl K');

  useEffect(() => {
    setShortcutLabel(isMacPlatform() ? 'Cmd K' : 'Ctrl K');
  }, []);

  const navigableGuilds = useMemo(
    () =>
      guilds
        .filter((guild) => guild.id && !guild.isDetectedOnly)
        .map((guild) => ({
          id: guild.id as string,
          name: guild.name,
          server: guild.server,
          region: guild.region,
          avatarUrl: guild.avatar_url,
          basePath: getGuildPath(guild.region, guild.server, guild.name),
        })),
    [guilds],
  );

  const activeGuild = useMemo<CommandPaletteGuildContext | null>(
    () => navigableGuilds.find((guild) => location.pathname.startsWith(guild.basePath)) || null,
    [location.pathname, navigableGuilds],
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      open,
      close,
      setOpen: setIsOpen,
      isOpen,
      shortcutLabel,
    }),
    [close, isOpen, open, shortcutLabel],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {user ? (
        <CommandPalette
          open={isOpen}
          onOpenChange={setIsOpen}
          activeGuild={activeGuild}
          userGuilds={navigableGuilds}
          shortcutLabel={shortcutLabel}
        />
      ) : null}
    </CommandPaletteContext.Provider>
  );
};
