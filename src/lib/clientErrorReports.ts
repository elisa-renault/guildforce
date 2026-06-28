import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import log from '@/lib/logger';

interface ClientToastErrorInput {
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

const RECENT_WINDOW_MS = 30_000;
const recentReports = new Map<string, number>();

const pruneRecentReports = (now: number) => {
  for (const [key, timestamp] of recentReports.entries()) {
    if (now - timestamp > RECENT_WINDOW_MS) {
      recentReports.delete(key);
    }
  }
};

const shouldSkipDuplicate = (key: string) => {
  const now = Date.now();
  pruneRecentReports(now);
  const previous = recentReports.get(key);
  if (previous && now - previous < RECENT_WINDOW_MS) return true;
  recentReports.set(key, now);
  return false;
};

export const reportClientToastError = async ({
  title,
  description,
  metadata = {},
}: ClientToastErrorInput) => {
  if (typeof window === 'undefined') return;

  const trimmedTitle = title.trim() || 'Client error';
  const trimmedDescription = description?.trim() || null;
  const routePath = window.location.pathname;
  const dedupeKey = `${routePath}|${trimmedTitle}|${trimmedDescription || ''}`;
  if (shouldSkipDuplicate(dedupeKey)) return;

  try {
    const routeUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { error } = await supabase.rpc('log_client_error_report', {
      p_toast_title: trimmedTitle,
      p_toast_description: trimmedDescription,
      p_route_path: routePath,
      p_route_url: routeUrl,
      p_user_agent: window.navigator.userAgent,
      p_locale: window.navigator.language,
      p_metadata: {
        ...metadata,
        search: window.location.search,
        hash: window.location.hash,
      } as Json,
    });

    if (error) throw error;
  } catch (error) {
    log.warn('Failed to report client toast error', error);
  }
};
