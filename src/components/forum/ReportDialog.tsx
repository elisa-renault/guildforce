import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Flag } from 'lucide-react';
import { toast } from 'sonner';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'post' | 'topic';
  targetId: string;
}

const REPORT_REASONS = {
  spam: { fr: 'Spam', en: 'Spam' },
  harassment: { fr: 'Harcèlement', en: 'Harassment' },
  inappropriate: { fr: 'Contenu inapproprié', en: 'Inappropriate content' },
  misinformation: { fr: 'Désinformation', en: 'Misinformation' },
  other: { fr: 'Autre', en: 'Other' },
} as const;

type ReportReason = keyof typeof REPORT_REASONS;

export const ReportDialog = ({
  open,
  onOpenChange,
  targetType,
  targetId,
}: ReportDialogProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('forum_reports').insert({
        reporter_id: user.id,
        [targetType === 'post' ? 'post_id' : 'topic_id']: targetId,
        reason,
        details: details.trim() || null,
      });

      if (error) throw error;

      toast.success(
        language === 'fr'
          ? 'Signalement envoyé, merci !'
          : 'Report submitted, thank you!'
      );
      onOpenChange(false);
      setReason('spam');
      setDetails('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(language === 'fr' ? 'Erreur lors du signalement' : 'Error submitting report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Flag className="h-5 w-5 text-destructive" />
            {language === 'fr' ? 'Signaler ce contenu' : 'Report this content'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{language === 'fr' ? 'Raison du signalement' : 'Reason for report'}</Label>
            <RadioGroup value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              {(Object.entries(REPORT_REASONS) as [ReportReason, { fr: string; en: string }][]).map(
                ([key, labels]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <RadioGroupItem value={key} id={key} />
                    <Label htmlFor={key} className="cursor-pointer font-normal">
                      {labels[language]}
                    </Label>
                  </div>
                )
              )}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">
              {language === 'fr' ? 'Détails (optionnel)' : 'Details (optional)'}
            </Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                language === 'fr'
                  ? 'Décrivez le problème...'
                  : 'Describe the issue...'
              }
              className="min-h-[80px] bg-background/50"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'fr' ? 'Envoi...' : 'Sending...'}
              </>
            ) : (
              <>
                <Flag className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Signaler' : 'Report'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
