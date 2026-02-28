import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useGuildRankLabels } from '@/hooks/useGuildRankLabels';
import { supabase } from '@/integrations/supabase/client';
import { CosmicButton } from '@/components/CosmicButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RosterAccessEditor } from './RosterAccessEditor';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { formatRankLabel } from '@/lib/rankLabel';

interface AccessRule {
  id?: string;
  access_type: 'user' | 'rank';
  user_id?: string;
  min_rank_index?: number;
  max_rank_index?: number;
}

interface GuildMember {
  user_id: string;
  username: string;
}

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

interface RosterEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rosterId: string;
  guildId: string;
  onSaved: () => void;
}

export const RosterEditDialog = ({ open, onOpenChange, rosterId, guildId, onSaved }: RosterEditDialogProps) => {
  const { t } = useLanguage();
  const rankLabel = resolveSemanticMessage({ key: 'guild.members.rank_label', language: t.lang, translations: t });
  const { toast } = useToast();
  const { rankLabels } = useGuildRankLabels({ guildId });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAccessRules, setFormAccessRules] = useState<Omit<AccessRule, 'id'>[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [ranks, setRanks] = useState<GuildRank[]>([]);

  useEffect(() => {
    if (open && rosterId) {
      loadRosterData();
    }
  }, [open, rosterId, rankLabels]);

  const loadRosterData = async () => {
    setLoading(true);
    try {
      // Load roster
      const { data: roster } = await supabase
        .from('rosters')
        .select('*')
        .eq('id', rosterId)
        .single();

      if (roster) {
        setFormName(roster.name);
        setFormDescription(roster.description || '');
      }

      // Load access rules
      const { data: rulesData } = await supabase
        .from('roster_access_rules')
        .select('*')
        .eq('roster_id', rosterId);

      if (rulesData) {
        setFormAccessRules(rulesData.map(r => ({
          access_type: r.access_type as 'user' | 'rank',
          user_id: r.user_id ?? undefined,
          min_rank_index: r.min_rank_index ?? undefined,
          max_rank_index: r.max_rank_index ?? undefined,
        })));
      }

      // Load guild members
      const { data: membersData } = await supabase
        .from('guild_members')
        .select('user_id')
        .eq('guild_id', guildId);

      if (membersData) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        setMembers(membersData.map(m => ({
          user_id: m.user_id,
          username: profilesData?.find(p => p.id === m.user_id)?.username || 'Unknown',
        })));
      }

      // Load ranks
      const { data: guildData } = await supabase
        .from('guilds')
        .select('name, server, region')
        .eq('id', guildId)
        .single();

      if (guildData) {
        const { data: ranksData } = await supabase
          .from('wow_guild_memberships')
          .select('rank_index, rank_name')
          .ilike('guild_name', guildData.name)
          .ilike('guild_realm_slug', guildData.server)
          .ilike('guild_region', guildData.region);

        if (ranksData) {
          const uniqueRanks = new Map<number, string>();
          ranksData.forEach(r => {
            if (!uniqueRanks.has(r.rank_index)) {
              const normalizedLabel = formatRankLabel({
                rankName: r.rank_name,
                rankIndex: r.rank_index,
                rankLabel,
                guildMasterLabel: t.guild.rank0,
                customLabel: rankLabels[r.rank_index],
              });
              uniqueRanks.set(r.rank_index, normalizedLabel);
            }
          });

          setRanks(Array.from(uniqueRanks.entries())
            .map(([rank_index, rank_name]) => ({ rank_index, rank_name }))
            .sort((a, b) => a.rank_index - b.rank_index));
        }
      }
    } catch {
      // Roster data loading error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    try {
      // Update roster
      const { error: updateError } = await supabase
        .from('rosters')
        .update({ name: formName.trim(), description: formDescription.trim() || null })
        .eq('id', rosterId);

      if (updateError) throw updateError;

      // Delete old access rules
      await supabase
        .from('roster_access_rules')
        .delete()
        .eq('roster_id', rosterId);

      // Insert new access rules
      if (formAccessRules.length > 0) {
        const { error: rulesError } = await supabase
          .from('roster_access_rules')
          .insert(formAccessRules.map(r => ({
            roster_id: rosterId,
            access_type: r.access_type,
            user_id: r.access_type === 'user' ? r.user_id : null,
            min_rank_index: r.access_type === 'rank' ? r.min_rank_index : null,
            max_rank_index: r.access_type === 'rank' ? r.max_rank_index : null,
          })));

        if (rulesError) throw rulesError;
      }

      toast({ title: t.rosters.rosterUpdated });
      onOpenChange(false);
      onSaved();
    } catch (error: unknown) {
      toast({
        title: t.errors.generic,
        description: error instanceof Error ? error.message : t.errors.generic,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t.rosters.editRoster}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="roster-edit-name" className="text-sm text-muted-foreground">{t.rosters.rosterName}</label>
              <Input
                id="roster-edit-name"
                name="roster-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t.rosters.rosterNamePlaceholder}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="roster-edit-description" className="text-sm text-muted-foreground">{t.rosters.rosterDescription}</label>
              <Textarea
                id="roster-edit-description"
                name="roster-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t.rosters.rosterDescriptionPlaceholder}
                className="mt-1 min-h-[60px]"
              />
            </div>

            <RosterAccessEditor
              accessRules={formAccessRules}
              members={members}
              ranks={ranks}
              onChange={setFormAccessRules}
            />

            <div className="flex justify-end gap-2 pt-4">
              <CosmicButton variant="outline" onClick={() => onOpenChange(false)}>
                {t.common.cancel}
              </CosmicButton>
              <CosmicButton onClick={handleSave} loading={saving} disabled={!formName.trim()}>
                {t.common.save}
              </CosmicButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
