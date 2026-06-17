import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Crown } from 'lucide-react';
import { RosterAccessEditor } from './RosterAccessEditor';

interface AccessRule {
  id: string;
  access_type: 'user' | 'rank';
  user_id?: string;
  min_rank_index?: number;
  max_rank_index?: number;
}

interface Roster {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  access_rules: AccessRule[];
}

interface GuildMember {
  user_id: string;
  username: string;
}

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

interface RosterManagerProps {
  guildId: string;
  rosters: Roster[];
  members: GuildMember[];
  ranks: GuildRank[];
  onRosterChange: () => void;
  initialRosterId?: string | null;
}

export const RosterManager = ({ guildId, rosters, members, ranks, onRosterChange, initialRosterId }: RosterManagerProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRoster, setEditingRoster] = useState<Roster | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAccessRules, setFormAccessRules] = useState<Omit<AccessRule, 'id'>[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [hasOpenedInitial, setHasOpenedInitial] = useState(false);

  const maxRankIndex = ranks.length > 0 ? Math.max(...ranks.map(r => r.rank_index)) : 9;
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.errors.generic;
  const getRankName = (index: number) => {
    const rank = ranks.find((entry) => entry.rank_index === index);
    if (rank?.rank_name) return rank.rank_name;
    return index === 0 ? t.guild.rank0 : `${index}`;
  };

  // Auto-open roster dialog if initialRosterId is provided
  useEffect(() => {
    if (initialRosterId && rosters.length > 0 && !hasOpenedInitial) {
      const roster = rosters.find(r => r.id === initialRosterId);
      if (roster) {
        openEditDialog(roster);
        setHasOpenedInitial(true);
      }
    }
  }, [initialRosterId, rosters, hasOpenedInitial]);

  const openCreateDialog = () => {
    setFormName('');
    setFormDescription('');
    setFormAccessRules([{ access_type: 'rank', min_rank_index: 0, max_rank_index: maxRankIndex }]);
    setIsCreating(true);
  };

  const openEditDialog = (roster: Roster) => {
    setFormName(roster.name);
    setFormDescription(roster.description || '');
    setFormAccessRules(roster.access_rules.map(r => ({
      access_type: r.access_type,
      user_id: r.user_id,
      min_rank_index: r.min_rank_index,
      max_rank_index: r.max_rank_index,
    })));
    setEditingRoster(roster);
  };

  const closeDialog = () => {
    setIsCreating(false);
    setEditingRoster(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    try {
      if (editingRoster) {
        // Update roster
        const { error: updateError } = await supabase
          .from('rosters')
          .update({ name: formName.trim(), description: formDescription.trim() || null })
          .eq('id', editingRoster.id);

        if (updateError) throw updateError;

        // Delete old access rules
        await supabase
          .from('roster_access_rules')
          .delete()
          .eq('roster_id', editingRoster.id);

        // Insert new access rules
        if (formAccessRules.length > 0) {
          const { error: rulesError } = await supabase
            .from('roster_access_rules')
            .insert(formAccessRules.map(r => ({
              roster_id: editingRoster.id,
              access_type: r.access_type,
              user_id: r.access_type === 'user' ? r.user_id : null,
              min_rank_index: r.access_type === 'rank' ? r.min_rank_index : null,
              max_rank_index: r.access_type === 'rank' ? r.max_rank_index : null,
            })));

          if (rulesError) throw rulesError;
        }

        toast({ title: t.rosters.rosterUpdated });
      } else {
        // Create roster
        const { data: newRoster, error: createError } = await supabase
          .from('rosters')
          .insert({
            guild_id: guildId,
            name: formName.trim(),
            description: formDescription.trim() || null,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Insert access rules
        if (formAccessRules.length > 0) {
          const { error: rulesError } = await supabase
            .from('roster_access_rules')
            .insert(formAccessRules.map(r => ({
              roster_id: newRoster.id,
              access_type: r.access_type,
              user_id: r.access_type === 'user' ? r.user_id : null,
              min_rank_index: r.access_type === 'rank' ? r.min_rank_index : null,
              max_rank_index: r.access_type === 'rank' ? r.max_rank_index : null,
            })));

          if (rulesError) throw rulesError;
        }

        toast({ title: t.rosters.rosterCreated });
      }

      closeDialog();
      onRosterChange();
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rosterId: string) => {
    setDeleting(rosterId);

    try {
      const { error } = await supabase
        .from('rosters')
        .delete()
        .eq('id', rosterId);

      if (error) throw error;

      toast({ title: t.rosters.rosterDeleted });
      onRosterChange();
    } catch (error: unknown) {
      toast({ title: t.errors.generic, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const getAccessRuleSummary = (rule: AccessRule) => {
    if (rule.access_type !== 'rank') {
      return members.find((member) => member.user_id === rule.user_id)?.username || 'User';
    }

    if (rule.max_rank_index !== undefined && rule.max_rank_index >= maxRankIndex) {
      return t.rosters.everyone;
    }

    const maxIndex = rule.max_rank_index ?? 0;
    return `${getRankName(0)} → ${getRankName(maxIndex)}`;
  };

  return (
    <>
      <GlowCard surface="section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans text-base font-medium">{t.rosters.title}</h2>
          <CosmicButton
            size="sm"
            variant="outline"
            onClick={openCreateDialog}
            icon={<Plus className="h-4 w-4" />}
          >
            {t.rosters.createRoster}
          </CosmicButton>
        </div>

        <div className="space-y-3">
          {rosters.map((roster) => (
            <div
              key={roster.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
            >
              <div className="flex items-center gap-3">
                {roster.is_default && <Crown className="h-4 w-4 text-primary" />}
                <div>
                  <div className="font-medium">{roster.name}</div>
                  {roster.description && (
                    <div className="text-xs text-muted-foreground">{roster.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {roster.access_rules.length > 0 ? (
                      roster.access_rules.map((rule, i) => (
                        <span key={i}>
                          {getAccessRuleSummary(rule)}
                          {i < roster.access_rules.length - 1 && ', '}
                        </span>
                      ))
                    ) : (
                      <span>{t.rosters.noAccess}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditDialog(roster)}
                  className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                {!roster.is_default && (
                  <button
                    onClick={() => handleDelete(roster.id)}
                    disabled={deleting === roster.id}
                    className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || !!editingRoster} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRoster 
                ? t.rosters.editRoster
                : t.rosters.createRoster}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="roster-create-name" className="text-sm text-muted-foreground">{t.rosters.rosterName}</label>
              <Input
                id="roster-create-name"
                name="roster-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t.rosters.rosterNamePlaceholder}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="roster-create-description" className="text-sm text-muted-foreground">{t.rosters.rosterDescription}</label>
              <Textarea
                id="roster-create-description"
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
              <CosmicButton variant="outline" onClick={closeDialog}>
                {t.common.cancel}
              </CosmicButton>
              <CosmicButton onClick={handleSave} loading={saving} disabled={!formName.trim()}>
                {t.common.save}
              </CosmicButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
