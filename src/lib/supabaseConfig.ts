const readRuntimeEnv = (key: string): string | undefined => {
  const fromImportMeta = import.meta.env?.[key as keyof ImportMetaEnv];
  if (typeof fromImportMeta === 'string' && fromImportMeta.trim().length > 0) {
    return fromImportMeta;
  }

  const fromWindow =
    typeof window !== 'undefined'
      ? (window as Window & { __ENV?: Record<string, string | undefined> }).__ENV?.[key]
      : undefined;

  if (typeof fromWindow === 'string' && fromWindow.trim().length > 0) {
    return fromWindow;
  }

  return undefined;
};

const firstDefined = (keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = readRuntimeEnv(key);
    if (value) return value;
  }

  return undefined;
};

export const getSupabaseUrl = (): string | undefined =>
  firstDefined(['VITE_SUPABASE_URL', 'SUPABASE_URL']);

export const getSupabasePublishableKey = (): string | undefined =>
  firstDefined(['VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY']);

export const assertSupabaseConfig = (): { supabaseUrl: string; supabasePublishableKey: string } => {
  const supabaseUrl = getSupabaseUrl();
  const supabasePublishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    const missing = [
      !supabaseUrl ? 'SUPABASE_URL (VITE_SUPABASE_URL or SUPABASE_URL)' : null,
      !supabasePublishableKey
        ? 'SUPABASE_PUBLISHABLE_KEY (VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY / SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY)'
        : null,
    ]
      .filter(Boolean)
      .join(', ');

    throw new Error(`Missing Supabase configuration: ${missing}.`);
  }

  return { supabaseUrl, supabasePublishableKey };
};
