export const BATTLE_NET_RESYNC_THROTTLE_MS = 60_000;

export type FunctionInvokeError = {
  context?: Response;
  message?: string;
  status?: number;
};

type FunctionErrorPayload = {
  error?: string;
  errorCode?: string;
};

const getMessage = (value: unknown) =>
  value instanceof Error ? value.message : typeof value === 'string' ? value : '';

export const getFunctionErrorStatus = (error: unknown) => {
  const invokeError = error as FunctionInvokeError | null;
  return invokeError?.context?.status ?? invokeError?.status ?? null;
};

export const isBattleNetResyncAlreadyRunning = (error: unknown, payload?: FunctionErrorPayload | null) => {
  const message = `${getMessage(error)} ${payload?.error ?? ''}`.toLowerCase();
  return getFunctionErrorStatus(error) === 409 || message.includes('resync already in progress');
};

export const readFunctionErrorPayload = async (error: unknown): Promise<FunctionErrorPayload> => {
  const invokeError = error as FunctionInvokeError | null;
  if (!invokeError?.context) return {};

  try {
    return (await invokeError.context.clone().json()) as FunctionErrorPayload;
  } catch {
    return {};
  }
};
