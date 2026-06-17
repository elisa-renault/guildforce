import { getSupabaseUrl } from '@/lib/supabaseConfig';

export type AuthDiagnosticStatus = 'ok' | 'warning' | 'error';

export type AuthDiagnosticPayload = {
  flowId: string;
  step: string;
  status: AuthDiagnosticStatus;
  userId?: string | null;
  browser?: string | null;
  urlPath?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

const SENSITIVE_KEY_PATTERN = /authorization|password|secret|token|refresh|access|code|state/i;
const MAX_STRING_LENGTH = 500;

const truncate = (value: string) =>
  value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;

export const sanitizeAuthDiagnosticMetadata = (value: unknown): unknown => {
  if (value == null) return value;
  if (typeof value === 'string') return truncate(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeAuthDiagnosticMetadata);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, nestedValue]) => [key, sanitizeAuthDiagnosticMetadata(nestedValue)])
  );
};

export const getBrowserSummary = () => {
  if (typeof navigator === 'undefined') return 'unknown';

  const platform = navigator.platform ? `; ${navigator.platform}` : '';
  return truncate(`${navigator.userAgent}${platform}`);
};

export const getCurrentUrlPath = () => {
  if (typeof window === 'undefined') return null;
  return `${window.location.pathname}${window.location.search ? '?...' : ''}`;
};

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : null;

export const buildBattleNetDebugInfo = (payload: Pick<AuthDiagnosticPayload, 'flowId' | 'step' | 'status' | 'errorMessage'>) =>
  [
    'Guildforce Battle.net debug',
    `flow_id: ${payload.flowId}`,
    `step: ${payload.step}`,
    `status: ${payload.status}`,
    payload.errorMessage ? `error: ${payload.errorMessage}` : null,
    `browser: ${getBrowserSummary()}`,
    `path: ${getCurrentUrlPath() ?? 'unknown'}`,
  ].filter(Boolean).join('\n');

export const recordAuthDiagnostic = async (payload: AuthDiagnosticPayload) => {
  try {
    const baseUrl = getSupabaseUrl();
    if (!baseUrl || !payload.flowId) return;

    await fetch(`${baseUrl}/functions/v1/battlenet-auth/diagnostic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flowId: payload.flowId,
        step: payload.step,
        status: payload.status,
        userId: payload.userId ?? null,
        browser: payload.browser ?? getBrowserSummary(),
        urlPath: payload.urlPath ?? getCurrentUrlPath(),
        errorMessage: payload.errorMessage ? truncate(payload.errorMessage) : null,
        metadata: sanitizeAuthDiagnosticMetadata(payload.metadata ?? {}),
      }),
    });
  } catch {
    // Diagnostics must never block authentication.
  }
};
