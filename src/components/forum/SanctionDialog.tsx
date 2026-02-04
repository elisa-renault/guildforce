import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useForumSanctionActions, SanctionType } from '@/hooks/useForumSanctions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Ban, Clock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';

interface SanctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
  onSuccess?: () => void;
}

const DURATION_OPTIONS: ReadonlyArray<{ value: string; key: SemanticKey }> = [
  { value: '1', key: 'forum.sanctions.duration.1h' },
  { value: '6', key: 'forum.sanctions.duration.6h' },
  { value: '24', key: 'forum.sanctions.duration.1d' },
  { value: '72', key: 'forum.sanctions.duration.3d' },
  { value: '168', key: 'forum.sanctions.duration.1w' },
  { value: '720', key: 'forum.sanctions.duration.1m' },
  { value: 'permanent', key: 'forum.sanctions.duration.permanent' },
];

export const SanctionDialog = ({
  open,
  onOpenChange,
  targetUser,
  onSuccess,
}: SanctionDialogProps) => {
  const { language, t } = useLanguage();
  const { applySanction } = useForumSanctionActions();

  const [sanctionType, setSanctionType] = useState<SanctionType>('timeout');
  const [duration, setDuration] = useState('24');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const s = (key: SemanticKey) => resolveSemanticMessage({ key, language, translations: t });

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error(s('forum.sanctions.toast.reason_required'));
      return;
    }

    setLoading(true);
    try {
      const durationHours = duration === 'permanent' ? undefined : parseInt(duration);
      await applySanction(targetUser.id, sanctionType, reason, durationHours);

      toast.success(interpolateMessage(s('forum.sanctions.toast.applied'), { username: targetUser.username }), {
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' },
      });

      onOpenChange(false);
      setSanctionType('timeout');
      setDuration('24');
      setReason('');
      onSuccess?.();
    } catch (error) {
      toast.error(s('forum.sanctions.toast.apply_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            {s('forum.sanctions.dialog.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Target user */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Avatar className="h-10 w-10">
              {targetUser.avatar_url ? (
                <AvatarImage src={targetUser.avatar_url} alt={targetUser.username} />
              ) : (
                <AvatarFallback className="bg-primary/20 text-primary">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{targetUser.username}</p>
              <p className="text-xs text-muted-foreground">{s('forum.sanctions.dialog.target_user')}</p>
            </div>
          </div>

          {/* Sanction type */}
          <div className="space-y-2">
            <Label>{s('forum.sanctions.dialog.type_label')}</Label>
            <Select value={sanctionType} onValueChange={(v) => setSanctionType(v as SanctionType)}>
              <SelectTrigger className="bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="timeout">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {s('forum.sanctions.type.timeout')}
                  </div>
                </SelectItem>
                <SelectItem value="ban">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    {s('forum.sanctions.type.ban')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>{s('forum.sanctions.dialog.duration_label')}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {s(opt.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="sanction-reason">{s('forum.sanctions.dialog.reason_label')}</Label>
            <Textarea
              id="sanction-reason"
              name="sanction-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={s('forum.sanctions.dialog.reason_placeholder')}
              className="bg-muted/50 border-border min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {s('forum.sanctions.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Ban className="h-4 w-4 mr-2" />
            )}
            {s('forum.sanctions.dialog.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
