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

const DURATION_OPTIONS = [
  { value: '1', label: { fr: '1 heure', en: '1 hour' } },
  { value: '6', label: { fr: '6 heures', en: '6 hours' } },
  { value: '24', label: { fr: '1 jour', en: '1 day' } },
  { value: '72', label: { fr: '3 jours', en: '3 days' } },
  { value: '168', label: { fr: '1 semaine', en: '1 week' } },
  { value: '720', label: { fr: '1 mois', en: '1 month' } },
  { value: 'permanent', label: { fr: 'Permanent', en: 'Permanent' } },
];

export const SanctionDialog = ({
  open,
  onOpenChange,
  targetUser,
  onSuccess,
}: SanctionDialogProps) => {
  const { language } = useLanguage();
  const { applySanction } = useForumSanctionActions();
  
  const [sanctionType, setSanctionType] = useState<SanctionType>('timeout');
  const [duration, setDuration] = useState('24');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error(language === 'fr' ? 'Une raison est requise' : 'A reason is required');
      return;
    }

    setLoading(true);
    try {
      const durationHours = duration === 'permanent' ? undefined : parseInt(duration);
      await applySanction(targetUser.id, sanctionType, reason, durationHours);
      
      toast.success(
        language === 'fr' 
          ? `Sanction appliquée à ${targetUser.username}` 
          : `Sanction applied to ${targetUser.username}`,
        {
          style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' },
        }
      );
      
      onOpenChange(false);
      setSanctionType('timeout');
      setDuration('24');
      setReason('');
      onSuccess?.();
    } catch (error) {
      console.error('Error applying sanction:', error);
      toast.error(language === 'fr' ? 'Erreur lors de l\'application de la sanction' : 'Error applying sanction');
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
            {language === 'fr' ? 'Appliquer une sanction' : 'Apply Sanction'}
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
              <p className="text-xs text-muted-foreground">
                {language === 'fr' ? 'Utilisateur ciblé' : 'Target user'}
              </p>
            </div>
          </div>

          {/* Sanction type */}
          <div className="space-y-2">
            <Label>{language === 'fr' ? 'Type de sanction' : 'Sanction type'}</Label>
            <Select value={sanctionType} onValueChange={(v) => setSanctionType(v as SanctionType)}>
              <SelectTrigger className="bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="timeout">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {language === 'fr' ? 'Timeout (suspension temporaire)' : 'Timeout (temporary suspension)'}
                  </div>
                </SelectItem>
                <SelectItem value="ban">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    {language === 'fr' ? 'Bannissement' : 'Ban'}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>{language === 'fr' ? 'Durée' : 'Duration'}</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label[language]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="sanction-reason">{language === 'fr' ? 'Raison' : 'Reason'}</Label>
            <Textarea
              id="sanction-reason"
              name="sanction-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={language === 'fr' ? 'Décrivez la raison de cette sanction...' : 'Describe the reason for this sanction...'}
              className="bg-muted/50 border-border min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
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
            {language === 'fr' ? 'Appliquer' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
