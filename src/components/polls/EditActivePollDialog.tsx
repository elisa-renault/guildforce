import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, FileEdit, Settings } from 'lucide-react';

interface EditActivePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responseCount: number;
  onEditMetadata: () => void;
  onEditFull: () => void;
}

export const EditActivePollDialog = ({
  open,
  onOpenChange,
  responseCount,
  onEditMetadata,
  onEditFull,
}: EditActivePollDialogProps) => {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {language === 'fr' ? 'Modifier un sondage actif' : 'Edit Active Poll'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? `Ce sondage a déjà reçu ${responseCount} réponse${responseCount > 1 ? 's' : ''}. Choisissez le type de modification.`
              : `This poll already has ${responseCount} response${responseCount > 1 ? 's' : ''}. Choose the type of edit.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <button
            type="button"
            className="h-auto py-4 px-4 flex flex-col items-start gap-2 text-left rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            onClick={onEditMetadata}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">
                {language === 'fr' ? 'Modifier les paramètres' : 'Edit Settings'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-normal pl-7">
              {language === 'fr'
                ? 'Titre, description, date de fin, roster cible. Les réponses sont conservées.'
                : 'Title, description, end date, target roster. Responses are preserved.'}
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
                {language === 'fr' ? 'Modifier la structure' : 'Edit Structure'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-normal pl-7">
              {language === 'fr'
                ? 'Questions et options. ⚠️ Cela réinitialisera toutes les réponses existantes.'
                : 'Questions and options. ⚠️ This will reset all existing responses.'}
            </p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
