import type { SupabaseClient } from '@supabase/supabase-js';

import log from '@/lib/logger';
import type { Database, Json } from '@/integrations/supabase/types';

type ProductEventName =
  | 'first_login'
  | 'wish_created'
  | 'poll_voted'
  | 'forum_post_created'
  | 'guild_member_invited'
  | 'activated_first_action';

interface TrackProductEventOptions {
  guildId?: string | null;
  source?: string | null;
  context?: Json;
  occurredAt?: string | null;
}

export const trackProductEvent = async (
  supabase: SupabaseClient<Database>,
  eventName: ProductEventName,
  options: TrackProductEventOptions = {},
) => {
  const { error } = await supabase.rpc('track_product_event', {
    p_event_name: eventName,
    p_guild_id: options.guildId ?? null,
    p_event_source: options.source ?? null,
    p_event_context: options.context ?? {},
    p_occurred_at: options.occurredAt ?? null,
  });

  if (error) {
    log.debug('trackProductEvent skipped:', error.message);
  }
};

