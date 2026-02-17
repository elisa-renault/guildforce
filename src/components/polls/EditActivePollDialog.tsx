import React, { forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, FileEdit, Settings } from 'lucide-react';
import { interpolateMessage } from '@/i18n/format';

interface EditActivePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responseCount: number;
  onEditMetadata: () => void;
  onEditFull: () => void;
}

export const EditActivePollDialog = forwardRef<HTMLDivElement, EditActivePollDialogProps>(({
  open,
  onOpenChange,
  responseCount,
  onEditMetadata,
  onEditFull,
}, ref) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t.polls.editActivePoll}
          </DialogTitle>
          <DialogDescription>
            {interpolateMessage(t.polls.editActivePollDesc, { count: responseCount })}
          </DialogDescription>
        </DialogHeader>

        <div ref={ref} className="grid gap-4 py-4">
          <button
            type="button"
            className="h-auto py-4 px-4 flex flex-col items-start gap-2 text-left rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            onClick={onEditMetadata}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">
                {t.polls.editSettings}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-normal pl-7">
              {t.polls.editSettingsDesc}
            </p>
          </button>

          <button
            type="button"
            className="h-auto py-4 px-4 flex flex-col items-start gap-2 text-left rounded-lg border border-destructive/50 bg-card hover:bg-destructive/10 transition-colors"
            onClick={onEditFull}
          >
            <div className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-destructive">
                {t.polls.editStructure}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-normal pl-7">
              {t.polls.editStructureDesc}
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

EditActivePollDialog.displayName = 'EditActivePollDialog';

