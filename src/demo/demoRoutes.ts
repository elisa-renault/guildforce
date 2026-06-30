export type DemoView =
  | 'overview'
  | 'roster'
  | 'analytics'
  | 'polls'
  | 'poll-detail'
  | 'poll-results'
  | 'poll-new'
  | 'poll-edit'
  | 'members'
  | 'settings'
  | 'member'
  | 'atlas'
  | 'atlas-new'
  | 'atlas-edit'
  | 'vault';

export type DemoLayoutProfile =
  | 'workspace'
  | 'overview'
  | 'poll-list'
  | 'poll-view'
  | 'poll-editor'
  | 'poll-results'
  | 'atlas'
  | 'atlas-editor'
  | 'vault'
  | 'settings';

export const getDemoLayoutProfile = (view: DemoView): DemoLayoutProfile => {
  if (view === 'overview') return 'overview';
  if (view === 'polls') return 'poll-list';
  if (view === 'poll-detail') return 'poll-view';
  if (view === 'poll-results') return 'poll-results';
  if (view === 'poll-new' || view === 'poll-edit') return 'poll-editor';
  if (view === 'atlas') return 'atlas';
  if (view === 'atlas-new' || view === 'atlas-edit') return 'atlas-editor';
  if (view === 'vault') return 'vault';
  if (view === 'settings') return 'settings';
  return 'workspace';
};

export const demoViewUsesOwnPageContainer = (view: DemoView) => getDemoLayoutProfile(view) !== 'workspace';

export const resolveDemoView = (pathname: string): DemoView => {
  if (/\/demo\/member\/[^/]+$/.test(pathname)) return 'member';
  if (/\/demo\/polls\/new$/.test(pathname)) return 'poll-new';
  if (/\/demo\/polls\/[^/]+\/edit$/.test(pathname)) return 'poll-edit';
  if (/\/demo\/poll\/[^/]+\/results$/.test(pathname)) return 'poll-results';
  if (/\/demo\/poll\/[^/]+$/.test(pathname)) return 'poll-detail';
  if (/\/demo\/atlas\/new$/.test(pathname)) return 'atlas-new';
  if (/\/demo\/atlas\/[^/]+\/edit$/.test(pathname)) return 'atlas-edit';
  if (pathname.endsWith('/atlas')) return 'atlas';
  if (pathname.endsWith('/vault')) return 'vault';
  if (pathname.endsWith('/roster')) return 'roster';
  if (pathname.endsWith('/polls')) return 'polls';
  if (pathname.endsWith('/members')) return 'members';
  if (pathname.endsWith('/settings')) return 'settings';
  if (pathname.endsWith('/analytics')) return 'analytics';
  return 'overview';
};

export const resolveDemoMemberId = (pathname: string) => {
  const match = pathname.match(/\/demo\/member\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const resolveDemoPollId = (pathname: string) => {
  const match = pathname.match(/\/demo\/poll\/([^/]+)(?:\/results)?$/);
  if (match) return decodeURIComponent(match[1]);
  const editMatch = pathname.match(/\/demo\/polls\/([^/]+)\/edit$/);
  return editMatch ? decodeURIComponent(editMatch[1]) : null;
};

export const resolveDemoPollEditId = (pathname: string) => {
  const match = pathname.match(/\/demo\/polls\/([^/]+)\/edit$/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const resolveDemoAtlasDocumentId = (pathname: string) => {
  const match = pathname.match(/\/demo\/atlas\/([^/]+)\/edit$/);
  return match ? decodeURIComponent(match[1]) : null;
};
