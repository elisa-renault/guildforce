import { AlertTriangle, ClipboardList } from 'lucide-react';

import { PollEditor } from './PollEditor';
import type { RespondentAccessRule } from './PollRespondentEditor';
import type { ResultsAccessConfig } from './PollResultsAccessEditor';
import type { PollFormData } from '@/types/poll';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';


interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface RosterOption {
  id: string;
  name: string;
}

interface MemberOption {
  user_id: string;
  username: string;
}

interface RankOption {
  rank_index: number;
  rank_name: string;
}

interface PollEditorSurfaceProps {
  breadcrumbs: BreadcrumbItem[];
  guildName: string;
  isEditing: boolean;
  isActivePoll: boolean;
  isMetadataOnly: boolean;
  rosters: RosterOption[];
  members: MemberOption[];
  ranks: RankOption[];
  initialData?: PollFormData;
  initialAccessConfig: ResultsAccessConfig;
  initialRespondentRules: RespondentAccessRule[];
  onSave: (data: PollFormData, accessConfig: ResultsAccessConfig, respondentRules?: RespondentAccessRule[]) => Promise<void>;
  onPublish?: (data: PollFormData, accessConfig: ResultsAccessConfig, respondentRules?: RespondentAccessRule[]) => Promise<void>;
  saving?: boolean;
  confirmResetDialog?: boolean;
  onConfirmResetDialogChange?: (open: boolean) => void;
  onConfirmFullEdit?: () => void;
}

export const PollEditorSurface = ({
  breadcrumbs,
  guildName,
  isEditing,
  isActivePoll,
  isMetadataOnly,
  rosters,
  members,
  ranks,
  initialData,
  initialAccessConfig,
  initialRespondentRules,
  onSave,
  onPublish,
  saving = false,
  confirmResetDialog,
  onConfirmResetDialogChange,
  onConfirmFullEdit,
}: PollEditorSurfaceProps) => {
  const { t } = useLanguage();
  const showConfirmResetDialog = typeof confirmResetDialog === 'boolean' && onConfirmResetDialogChange && onConfirmFullEdit;

  return (
    <PageContainer className="mx-auto max-w-4xl space-y-5 py-5 md:py-6" width="workspace">
      <Breadcrumbs items={breadcrumbs} />
      <PageHeader
        className="max-w-4xl"
        icon={ClipboardList}
        title={isEditing ? t.polls.edit : t.polls.new}
        description={guildName}
        bordered={false}
      />

      {isActivePoll && (
        <div
          className={cn(
            'mb-6 rounded-lg border p-4',
            isMetadataOnly ? 'border-info/30 bg-info/10' : 'border-warning/30 bg-warning/10',
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn('h-5 w-5', isMetadataOnly ? 'text-info' : 'text-warning')} />
            <span className={cn('font-medium', isMetadataOnly ? 'text-info' : 'text-warning')}>
              {isMetadataOnly ? t.polls.settingsOnlyMode : t.polls.fullEditMode}
            </span>
          </div>
          <p className="ml-7 mt-1 text-sm text-muted-foreground">
            {isMetadataOnly ? t.polls.settingsOnlyDesc : t.polls.fullEditDesc}
          </p>
        </div>
      )}

      <PollEditor
        rosters={rosters}
        members={members}
        ranks={ranks}
        initialData={initialData}
        initialAccessConfig={initialAccessConfig}
        initialRespondentRules={initialRespondentRules}
        onSave={onSave}
        onPublish={onPublish}
        saving={saving}
        metadataOnly={isMetadataOnly}
      />

      {showConfirmResetDialog && (
        <AlertDialog open={confirmResetDialog} onOpenChange={onConfirmResetDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t.polls.confirmReset}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t.polls.resetDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirmFullEdit}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t.polls.resetAndSave}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </PageContainer>
  );
};
