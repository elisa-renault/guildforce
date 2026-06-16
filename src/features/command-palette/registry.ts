import type { CommandPaletteGuildContext, CommandPaletteItem } from './types';
import type { Translations } from '@/i18n/translations';

interface BuildRegistryOptions {
  t: Translations;
  activeGuild: CommandPaletteGuildContext | null;
  isAdmin: boolean;
}

export const buildCommandPaletteRegistry = ({
  t,
  activeGuild,
  isAdmin,
}: BuildRegistryOptions): CommandPaletteItem[] => {
  const items: CommandPaletteItem[] = [
    {
      id: 'page:guilds',
      type: 'page',
      group: 'pages',
      title: t.common.myGuilds,
      subtitle: t.commandPalette.pageSubtitles.guilds,
      href: '/guilds',
      keywords: ['guilds', 'guildes', 'workspaces', 'my guilds'],
    },
    {
      id: 'page:profile',
      type: 'page',
      group: 'pages',
      title: t.profile.title,
      subtitle: t.commandPalette.pageSubtitles.profile,
      href: '/profile',
      keywords: ['profile', 'profil', 'account', 'compte'],
    },
    {
      id: 'action:open-profile',
      type: 'action',
      group: 'actions',
      title: t.commandPalette.actions.openProfile,
      subtitle: t.commandPalette.actionSubtitles.openProfile,
      href: '/profile',
      keywords: ['profile', 'profil', 'account', 'open profile'],
      score: 18,
    },
  ];

  if (isAdmin) {
    items.push(
      {
        id: 'page:admin',
        type: 'page',
        group: 'pages',
        title: t.common.admin,
        subtitle: t.commandPalette.pageSubtitles.admin,
        href: '/admin',
        keywords: ['admin', 'administration', 'moderation', 'users'],
      },
      {
        id: 'action:open-admin',
        type: 'action',
        group: 'actions',
        title: t.commandPalette.actions.openAdmin,
        subtitle: t.commandPalette.actionSubtitles.openAdmin,
        href: '/admin',
        keywords: ['admin', 'open admin', 'moderation'],
        score: 12,
      },
    );
  }

  if (activeGuild) {
    const basePath = activeGuild.basePath;
    const guildSubtitle = `${activeGuild.name} - ${activeGuild.server}`;

    items.push(
      {
        id: `page:guild:${activeGuild.id}:overview`,
        type: 'page',
        group: 'pages',
        title: t.dashboard.overview,
        subtitle: guildSubtitle,
        href: basePath,
        guildId: activeGuild.id,
        keywords: ['overview', 'dashboard', 'home', 'guilde', activeGuild.name],
        score: 10,
      },
      {
        id: `page:guild:${activeGuild.id}:roster`,
        type: 'page',
        group: 'pages',
        title: t.guildNav.wishesTable,
        subtitle: guildSubtitle,
        href: `${basePath}/roster`,
        guildId: activeGuild.id,
        keywords: ['roster', 'wishes', 'voeux', 'composition', activeGuild.name],
        score: 16,
      },
      {
        id: `page:guild:${activeGuild.id}:polls`,
        type: 'page',
        group: 'pages',
        title: t.guildNav.polls,
        subtitle: guildSubtitle,
        href: `${basePath}/polls`,
        guildId: activeGuild.id,
        keywords: ['polls', 'sondages', 'surveys', activeGuild.name],
        score: 14,
      },
      {
        id: `page:guild:${activeGuild.id}:members`,
        type: 'page',
        group: 'pages',
        title: t.guild.members,
        subtitle: guildSubtitle,
        href: `${basePath}/members`,
        guildId: activeGuild.id,
        keywords: ['members', 'membres', 'players', 'roster cache', activeGuild.name],
        score: 14,
      },
      {
        id: `page:guild:${activeGuild.id}:atlas`,
        type: 'page',
        group: 'pages',
        title: t.guildNav.atlas,
        subtitle: guildSubtitle,
        href: `${basePath}/atlas`,
        guildId: activeGuild.id,
        keywords: ['atlas', 'knowledge', 'docs', 'guides', 'wiki', 'handbook', activeGuild.name],
        score: 15,
      },
      {
        id: `page:guild:${activeGuild.id}:vault`,
        type: 'page',
        group: 'pages',
        title: t.guildNav.vault,
        subtitle: guildSubtitle,
        href: `${basePath}/vault`,
        guildId: activeGuild.id,
        keywords: ['vault', 'coffre', 'secrets', activeGuild.name],
        score: 8,
      },
      {
        id: `page:guild:${activeGuild.id}:settings`,
        type: 'page',
        group: 'pages',
        title: t.guildNav.settings,
        subtitle: guildSubtitle,
        href: `${basePath}/settings`,
        guildId: activeGuild.id,
        keywords: ['settings', 'parametres', 'permissions', activeGuild.name],
        score: 12,
      },
      {
        id: `action:guild:${activeGuild.id}:create-poll`,
        type: 'action',
        group: 'actions',
        title: t.commandPalette.actions.createPoll,
        subtitle: guildSubtitle,
        href: `${basePath}/polls/new`,
        guildId: activeGuild.id,
        keywords: ['create poll', 'new poll', 'sondage', 'survey', activeGuild.name],
        score: 28,
      },
      ...(activeGuild.canManageAtlas ? [{
        id: `action:guild:${activeGuild.id}:create-atlas-doc`,
        type: 'action' as const,
        group: 'actions' as const,
        title: t.commandPalette.actions.createAtlasDoc,
        subtitle: t.commandPalette.actionSubtitles.createAtlasDoc,
        href: `${basePath}/atlas/new`,
        guildId: activeGuild.id,
        keywords: ['create doc', 'new doc', 'atlas', 'knowledge', 'guide', 'wiki', activeGuild.name],
        score: 18,
      }] : []),
      {
        id: `action:guild:${activeGuild.id}:open-roster`,
        type: 'action',
        group: 'actions',
        title: t.commandPalette.actions.openRoster,
        subtitle: guildSubtitle,
        href: `${basePath}/roster`,
        guildId: activeGuild.id,
        keywords: ['roster', 'composition', 'wishes table', activeGuild.name],
        score: 24,
      },
      {
        id: `action:guild:${activeGuild.id}:edit-wishes`,
        type: 'action',
        group: 'actions',
        title: t.commandPalette.actions.editWishes,
        subtitle: guildSubtitle,
        href: `${basePath}/wishes`,
        guildId: activeGuild.id,
        keywords: ['edit wishes', 'modifier voeux', 'classes', activeGuild.name],
        score: 22,
      },
      {
        id: `action:guild:${activeGuild.id}:open-settings`,
        type: 'action',
        group: 'actions',
        title: t.commandPalette.actions.openSettings,
        subtitle: guildSubtitle,
        href: `${basePath}/settings`,
        guildId: activeGuild.id,
        keywords: ['settings', 'parametres', 'permissions', activeGuild.name],
        score: 20,
      },
      {
        id: `action:guild:${activeGuild.id}:sync-members`,
        type: 'action',
        group: 'actions',
        title: t.commandPalette.actions.syncMembers,
        subtitle: t.commandPalette.actionSubtitles.syncMembers,
        href: `${basePath}/settings?section=battlenet`,
        guildId: activeGuild.id,
        keywords: ['sync', 'resync', 'members', 'battlenet', 'blizzard', activeGuild.name],
        score: 16,
      },
    );
  }

  return items;
};
