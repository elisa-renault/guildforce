import { useState } from 'react';
import log from '@/lib/logger';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { BattleNetIcon } from '@/components/BattleNetIcon';
import { Info, RefreshCw } from 'lucide-react';

interface GuildBattleNetSectionProps {
  guildId: string;
  onResyncComplete?: () => void;
}

export const GuildBattleNetSection = ({
  guildId,
  onResyncComplete,
}: GuildBattleNetSectionProps) => {
  const { t } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleResyncBattlenet = async () => {
    setSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('battlenet-auth/guild-resync', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: {
          guildId,
        },
      });

      // Extract error message from various possible locations
      // FunctionsHttpError stores context, or error could be in data
      let errorMessage = '';
      if (error) {
        // Try to get message from error context (FunctionsHttpError)
        try {
          const context = await (error as any).context?.json?.();
          errorMessage = context?.error || error.message || '';
        } catch {
          errorMessage = error.message || '';
        }
      } else if (data?.error) {
        errorMessage = data.error;
      }

      const isTokenExpired = errorMessage.includes('expired') || errorMessage.includes('reconnect');

      if (error || data?.error) {
        toast({
          title: isTokenExpired ? t.guildSettings.resyncTokenExpired : t.guildSettings.resyncError,
          description: isTokenExpired ? undefined : (errorMessage || undefined),
          variant: 'destructive',
        });
        return;
      }

      onResyncComplete?.();
      toast({ title: t.guildSettings.resyncSuccess });
    } catch (error: any) {
      log.error('Resync error:', error);
      toast({
        title: t.guildSettings.resyncError,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <GlowCard className="p-6">
      <h2 className="font-display text-lg mb-4">{s('settings.guild_battlenet.title')}</h2>
      
      <div className="space-y-4">
        <CosmicButton
          variant="outline"
          onClick={handleResyncBattlenet}
          disabled={syncing}
          loading={syncing}
          icon={syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BattleNetIcon className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          {syncing ? t.guildSettings.syncing : t.guildSettings.resyncBattlenet}
        </CosmicButton>
        
        <p className="text-xs text-muted-foreground">
          {t.guildSettings.resyncDescription}
        </p>
      </div>
    </GlowCard>
  );
};
