export const loadOverviewPage = () => import('@/pages/Overview');
export const loadRosterWishesPage = () => import('@/pages/RosterWishes');
export const loadMemberWishesPage = () => import('@/pages/MemberWishes');
export const loadGuildMembersPage = () => import('@/pages/GuildMembers');
export const loadGuildPollsPage = () => import('@/pages/GuildPolls');
export const loadGuildAtlasPage = () => import('@/pages/GuildAtlas');
export const loadGuildVaultPage = () => import('@/pages/GuildVault');
export const loadGuildSettingsPage = () => import('@/pages/GuildSettings');

let guildWorkspacePreloadStarted = false;

export const preloadGuildWorkspaceRoutes = () => {
  if (guildWorkspacePreloadStarted) return;
  guildWorkspacePreloadStarted = true;

  void Promise.allSettled([
    loadOverviewPage(),
    loadRosterWishesPage(),
    loadMemberWishesPage(),
    loadGuildMembersPage(),
    loadGuildPollsPage(),
    loadGuildAtlasPage(),
    loadGuildVaultPage(),
    loadGuildSettingsPage(),
  ]);
};
