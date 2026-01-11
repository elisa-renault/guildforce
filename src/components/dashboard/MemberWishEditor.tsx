import { useLanguage } from '@/contexts/LanguageContext';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { CosmicButton } from '@/components/CosmicButton';
import { InlineWishEditor } from './InlineWishEditor';
import { X, Save } from 'lucide-react';
import { WishData } from '@/types/guild';

interface MemberWishEditorProps {
  wishes: WishData[];
  status: CommitmentStatus;
  saving: boolean;
  onWishChange: (index: number, field: keyof WishData, value: any) => void;
  onStatusChange: (status: CommitmentStatus) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const MemberWishEditor = ({
  wishes,
  status,
  saving,
  onWishChange,
  onStatusChange,
  onSave,
  onCancel,
}: MemberWishEditorProps) => {
  const { t } = useLanguage();

  return (
    <div className="p-4 bg-background/50 border-t border-border/20">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between lg:hidden">
          <h4 className="text-sm font-semibold text-foreground">{t.wishes.editMyWishes}</h4>
          <div className="flex gap-2">
            <CosmicButton 
              size="sm" 
              variant="outline" 
              onClick={onCancel}
              icon={<X className="h-4 w-4" strokeWidth={1.5} />}
            >
              {t.common.cancel}
            </CosmicButton>
            <CosmicButton 
              size="sm" 
              onClick={onSave}
              loading={saving}
              icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
            >
              {t.wishes.saveWishes}
            </CosmicButton>
          </div>
        </div>

        {/* Commitment toggle - compact */}
        <div className="flex-shrink-0">
          <CommitmentToggle status={status} onChange={onStatusChange} compact />
        </div>

        {/* Inline wish editors */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          {wishes.map((wish, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20 flex-shrink-0 mt-1.5">
                <span className="text-[10px] font-bold text-primary">{index + 1}</span>
              </div>
              <InlineWishEditor
                wish={wish}
                choiceIndex={index}
                onChange={(field, value) => onWishChange(index, field, value)}
              />
            </div>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden lg:flex gap-2 flex-shrink-0">
          <CosmicButton 
            size="sm" 
            variant="outline" 
            onClick={onCancel}
            icon={<X className="h-4 w-4" strokeWidth={1.5} />}
          >
            {t.common.cancel}
          </CosmicButton>
          <CosmicButton 
            size="sm" 
            onClick={onSave}
            loading={saving}
            icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
          >
            {t.wishes.saveWishes}
          </CosmicButton>
        </div>
      </div>
    </div>
  );
};