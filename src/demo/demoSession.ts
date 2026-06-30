import { demoGuild } from '@/demo/demoRoster';

export const demoUser = {
  id: 'demo-viewer',
  username: 'Nyx',
  battletag: 'Nyx#0000',
  avatar_url: null,
};

export const demoGuildSession = {
  guild: demoGuild,
  user: demoUser,
  isGM: true,
  basePath: '/demo',
  permissions: {
    managePolls: true,
    manageWishes: true,
    manageRosters: true,
    manageAtlas: true,
    manageVault: true,
    viewVaultAudit: true,
    settings: true,
  },
};

export const isDemoPath = (pathname: string) => pathname === '/demo' || pathname.startsWith('/demo/');
