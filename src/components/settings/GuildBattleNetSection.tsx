import { useState } from 'react';
import log from '@/lib/logger';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { BattleNetIcon } from '@/components/BattleNetIcon';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, PenLine, RefreshCw } from 'lucide-react';

interface GuildBattleNetSectionProps {
  guildId: string;
  isOwnerOrGM: boolean;
  onResyncComplete?: () => void;
}

type EdgeFunctionError = Error & {
  context?: {
    json?: () => Promise<{ error?: string }>;
  };
};

export const GuildBattleNetSection = ({
  guildId,
  isOwnerOrGM,
  onResyncComplete,
}: GuildBattleNetSectionProps) => {
  const { t } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [renamingOpen, setRenamingOpen] = useState(false);
  const [renameNewName, setRenameNewName] = useState('');
  const [renaming, setRenaming] = useState(false);

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
          const context = await (error as EdgeFunctionError).context?.json?.();
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
      const jobId = typeof data?.jobId === 'string' ? data.jobId : '';
      toast({
        title: jobId
          ? s('settings.guild_battlenet.resync_started', 'Synchronization started')
          : s('settings.guild_battlenet.resync_success', 'Synchronization complete'),
        description: jobId
          ? resolveSemanticMessage({
              key: 'settings.guild_battlenet.resync_started_desc',
              language: t.lang,
              translations: t,
              fallback: `Job: ${jobId}. Refresh in 1-2 min.`,
            })
              .replace('{{jobId}}', jobId)
          : s('settings.guild_battlenet.resync_success_desc', 'Member cache refreshed.'),
      });
    } catch (error: unknown) {
      log.error('Resync error:', error);
      toast({
        title: t.guildSettings.resyncError,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleRenameGuild = async () => {
    const newName = renameNewName.trim();
    if (!newName) {
      toast({
        title: s('settings.guild_battlenet.rename_missing_name', 'Enter a new guild name.'),
        variant: 'destructive',
      });
      return;
    }

    setRenaming(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('battlenet-auth/guild-rename', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: {
          guildId,
          newName,
        },
      });

      let errorMessage = '';
      if (error) {
        try {
          const context = await (error as EdgeFunctionError).context?.json?.();
          errorMessage = context?.error || error.message || '';
        } catch {
          errorMessage = error.message || '';
        }
      } else if (data?.error) {
        errorMessage = data.error;
      }

      if (error || data?.error) {
        toast({
          title: s('settings.guild_battlenet.rename_error', 'Rename failed'),
          description: errorMessage || undefined,
          variant: 'destructive',
        });
        return;
      }

      const cachedMembers = typeof data?.cachedMembers === 'number' ? data.cachedMembers : 0;
      const cachedGuildforceUsers = typeof data?.cachedGuildforceUsers === 'number' ? data.cachedGuildforceUsers : 0;

      toast({
        title: s('settings.guild_battlenet.rename_success', 'Guild renamed'),
        description: resolveSemanticMessage({
          key: 'settings.guild_battlenet.rename_success_desc',
          language: t.lang,
          translations: t,
          fallback: `Members cached: ${cachedMembers} (GF: ${cachedGuildforceUsers}).`,
        })
          .replace('{{members}}', String(cachedMembers))
          .replace('{{guildforce}}', String(cachedGuildforceUsers)),
      });

      onResyncComplete?.();
      setRenamingOpen(false);
      setRenameNewName('');
    } catch (err) {
      log.error('Rename error:', err);
      toast({
        title: s('settings.guild_battlenet.rename_error', 'Rename failed'),
        variant: 'destructive',
      });
    } finally {
      setRenaming(false);
    }
  };

  return (
    <GlowCard surface="section">
      <h2 className="mb-4 font-sans text-base font-medium">{s('settings.guild_battlenet.title')}</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border/50 bg-background/30 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-muted-foreground">
              {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BattleNetIcon className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-sans text-sm font-medium">
                {s('settings.guild_battlenet.resync_title', 'Sync member cache')}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {s(
                  'settings.guild_battlenet.resync_desc',
                  'Refresh this guild member cache from Blizzard. It can take a few minutes.'
                )}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <CosmicButton
              variant="outline"
              onClick={handleResyncBattlenet}
              disabled={syncing}
              loading={syncing}
              icon={<RefreshCw className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              {syncing ? t.guildSettings.syncing : t.guildSettings.resyncBattlenet}
            </CosmicButton>
          </div>
        </section>

        <section className="rounded-xl border border-border/50 bg-background/30 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-muted-foreground">
              <PenLine className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-sans text-sm font-medium">
                {s('settings.guild_battlenet.rename_action', 'Guild renamed')}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {s(
                  'settings.guild_battlenet.rename_help',
                  'Use this only if the guild was renamed in WoW. We will validate the new name with Blizzard and keep the same Guildforce guild.'
                )}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <CosmicButton
              variant="outline"
              onClick={() => setRenamingOpen(true)}
              disabled={renaming || !isOwnerOrGM}
              icon={<PenLine className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              {s('settings.guild_battlenet.rename_cta', 'Rename in Guildforce')}
            </CosmicButton>

            {!isOwnerOrGM && (
              <p className="mt-2 text-xs text-muted-foreground">
                {s('settings.guild_battlenet.rename_requires_gm', 'Only the Guild Master can confirm a rename.')}
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 flex gap-2 rounded-lg border border-border/50 bg-muted/10 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          {s(
            'settings.guild_battlenet.note',
            'If Blizzard returns “Not Found”, the guild may have been renamed or disbanded. Use “Guild renamed” to reconcile without losing data.'
          )}
        </p>
      </div>

      <Dialog open={renamingOpen} onOpenChange={(open) => !renaming && setRenamingOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{s('settings.guild_battlenet.rename_title', 'Guild renamed')}</DialogTitle>
            <DialogDescription>
              {s(
                'settings.guild_battlenet.rename_desc',
                'Enter the new name as it appears in WoW. We will validate it with Blizzard and keep the same Guildforce guild.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename_new_name">{s('settings.guild_battlenet.rename_new_name_label', 'New name')}</Label>
              <Input
                id="rename_new_name"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder={s('settings.guild_battlenet.rename_new_name_placeholder', 'New guild name')}
                disabled={renaming}
              />
            </div>
          </div>
          <DialogFooter>
            <CosmicButton variant="outline" onClick={() => setRenamingOpen(false)} disabled={renaming}>
              {t.common.cancel}
            </CosmicButton>
            <CosmicButton onClick={handleRenameGuild} disabled={renaming} loading={renaming}>
              {s('settings.guild_battlenet.rename_submit', 'Rename')}
            </CosmicButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlowCard>
  );
};
