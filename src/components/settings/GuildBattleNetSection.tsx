import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleResyncBattlenet = async () => {
    setSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('battlenet-auth/resync', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      // Check for error in the response body (edge function returns error in data when status is non-2xx)
      const responseError = error?.message || data?.error || '';
      const isTokenExpired = responseError.includes('expired') || responseError.includes('reconnect');

      if (error || data?.error) {
        toast({
          title: isTokenExpired ? t.guildSettings.resyncTokenExpired : t.guildSettings.resyncError,
          description: isTokenExpired ? undefined : responseError,
          variant: 'destructive',
        });
        return;
      }

      onResyncComplete?.();
      toast({ title: t.guildSettings.resyncSuccess });
    } catch (error: any) {
      console.error('Resync error:', error);
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
      <h2 className="font-display text-lg mb-4">Battle.net</h2>
      
      <div className="space-y-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{t.guildSettings.syncedFromBnet}</span>
        </div>
        
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
