import type { Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'moderator' | 'user';
type TransitionKind = 'start' | 'restore';

export interface ImpersonationTargetSummary {
  id: string;
  username: string | null;
}

export interface StoredAdminImpersonationState {
  adminSession: Session;
  impersonationId: string;
  returnPath: string;
  target: ImpersonationTargetSummary;
}

const IMPERSONATION_STORAGE_KEY = 'guildforce.admin_impersonation';
const IMPERSONATION_TRANSITION_KEY = 'guildforce.admin_impersonation_transition';

const isBrowser = () => typeof window !== 'undefined';

const isSessionLike = (value: unknown): value is Session => {
  if (!value || typeof value !== 'object') return false;

  const maybeSession = value as Partial<Session>;
  return typeof maybeSession.access_token === 'string'
    && typeof maybeSession.refresh_token === 'string'
    && !!maybeSession.user
    && typeof maybeSession.user === 'object'
    && typeof maybeSession.user.id === 'string';
};

export const readStoredAdminImpersonationState = (): StoredAdminImpersonationState | null => {
  if (!isBrowser()) return null;

  try {
    const raw = window.sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredAdminImpersonationState>;
    if (
      !parsed
      || typeof parsed !== 'object'
      || !isSessionLike(parsed.adminSession)
      || typeof parsed.impersonationId !== 'string'
      || typeof parsed.returnPath !== 'string'
      || !parsed.target
      || typeof parsed.target !== 'object'
      || typeof parsed.target.id !== 'string'
    ) {
      clearStoredAdminImpersonationState();
      return null;
    }

    return {
      adminSession: parsed.adminSession,
      impersonationId: parsed.impersonationId,
      returnPath: parsed.returnPath,
      target: {
        id: parsed.target.id,
        username: typeof parsed.target.username === 'string' ? parsed.target.username : null,
      },
    };
  } catch {
    clearStoredAdminImpersonationState();
    return null;
  }
};

export const writeStoredAdminImpersonationState = (state: StoredAdminImpersonationState) => {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(state));
};

export const clearStoredAdminImpersonationState = () => {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
};

export const setAdminImpersonationTransition = (transition: TransitionKind) => {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(IMPERSONATION_TRANSITION_KEY, transition);
};

export const clearAdminImpersonationTransition = () => {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(IMPERSONATION_TRANSITION_KEY);
};

export const consumeAdminImpersonationTransition = (): TransitionKind | null => {
  if (!isBrowser()) return null;
  const value = window.sessionStorage.getItem(IMPERSONATION_TRANSITION_KEY);
  window.sessionStorage.removeItem(IMPERSONATION_TRANSITION_KEY);
  return value === 'start' || value === 'restore' ? value : null;
};

export const isAdminImpersonationTransitionPending = (): boolean => {
  if (!isBrowser()) return false;
  const value = window.sessionStorage.getItem(IMPERSONATION_TRANSITION_KEY);
  return value === 'start' || value === 'restore';
};

interface CanImpersonateUserArgs {
  currentUserId?: string | null;
  targetUserId: string;
  targetRoles: AppRole[];
  isImpersonating: boolean;
}

export const canImpersonateUser = ({
  currentUserId,
  targetUserId,
  targetRoles,
  isImpersonating,
}: CanImpersonateUserArgs): boolean => {
  if (isImpersonating) return false;
  if (!currentUserId || currentUserId === targetUserId) return false;
  if (targetRoles.includes('admin') || targetRoles.includes('moderator')) return false;
  return true;
};
