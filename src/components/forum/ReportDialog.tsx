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
import { resolveSemanticMessage } from '@/i18n/semantic';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'post' | 'topic';
  targetId: string;
}

const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'] as const;

type ReportReason = (typeof REPORT_REASONS)[number];
const REPORT_REASON_KEY_BY_REASON: Record<ReportReason, Parameters<typeof resolveSemanticMessage>[0]['key']> = {
  spam: 'forum.report.reason.spam',
  harassment: 'forum.report.reason.harassment',
  inappropriate: 'forum.report.reason.inappropriate',
  misinformation: 'forum.report.reason.misinformation',
  other: 'forum.report.reason.other',
};

export const ReportDialog = ({
  open,
  onOpenChange,
  targetType,
  targetId,
}: ReportDialogProps) => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
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

      toast.success(sm('forum.report.dialog.success'));
      onOpenChange(false);
      setReason('spam');
      setDetails('');
    } catch (error) {
      toast.error(sm('forum.report.dialog.error'));
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
            {sm('forum.report.dialog.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{sm('forum.report.dialog.reason_label')}</Label>
            <RadioGroup value={reason} onValueChange={(value) => setReason(value as ReportReason)}>
              {REPORT_REASONS.map((reasonKey) => (
                <div key={reasonKey} className="flex items-center space-x-2">
                  <RadioGroupItem value={reasonKey} id={reasonKey} />
                  <Label htmlFor={reasonKey} className="cursor-pointer font-normal">
                    {sm(REPORT_REASON_KEY_BY_REASON[reasonKey])}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">{sm('forum.report.dialog.details_label')}</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={sm('forum.report.dialog.details_placeholder')}
              className="min-h-[80px] bg-background/50"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {sm('forum.report.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {sm('forum.report.dialog.submitting')}
              </>
            ) : (
              <>
                <Flag className="h-4 w-4 mr-2" />
                {sm('forum.report.dialog.submit')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
