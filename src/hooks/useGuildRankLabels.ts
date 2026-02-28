import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import type { GuildRankLabelMap } from '@/lib/rankLabel';

interface UseGuildRankLabelsOptions {
  guildId?: string | null;
}

export const useGuildRankLabels = ({ guildId }: UseGuildRankLabelsOptions) => {
  const [rankLabels, setRankLabels] = useState<GuildRankLabelMap>({});
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!guildId) {
      setRankLabels({});
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('guild_rank_labels')
        .select('rank_index, label')
        .eq('guild_id', guildId);

      if (error) {
        throw error;
      }

      const nextLabels = (data ?? []).reduce<GuildRankLabelMap>((acc, row) => {
        const normalized = row.label.trim();
        if (normalized) {
          acc[row.rank_index] = normalized;
        }
        return acc;
      }, {});

      setRankLabels(nextLabels);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    rankLabels,
    loading,
    reload,
  };
};
