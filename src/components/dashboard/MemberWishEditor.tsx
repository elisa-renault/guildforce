import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { ClassGrid } from '@/components/ClassGrid';
import { SpecButtons } from '@/components/SpecButtons';
import { CommitmentToggle } from '@/components/CommitmentToggle';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { X, Save } from 'lucide-react';
import { WishData } from '@/types/guild';

interface MemberWishEditorProps {
  wishes: WishData[];
  confirmed: boolean;
  saving: boolean;
  onWishChange: (index: number, field: keyof WishData, value: any) => void;
  onConfirmedChange: (confirmed: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const MemberWishEditor = ({
  wishes,
  confirmed,
  saving,
  onWishChange,
  onConfirmedChange,
  onSave,
  onCancel,
}: MemberWishEditorProps) => {
  const { t } = useLanguage();

  return (
    <div className="p-6 bg-background/50 border-t border-border/20">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-foreground">{t.wishes.editMyWishes}</h4>
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

      {/* Commitment toggle */}
      <div className="mb-6 p-4 rounded bg-muted/20 border border-border/20">
        <CommitmentToggle confirmed={confirmed} onChange={onConfirmedChange} />
      </div>

      {/* Wishes editing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {wishes.map((wish, index) => (
          <GlowCard key={index} className="p-4" hoverable={false}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20">
                <span className="text-xs font-bold text-primary">{index + 1}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{t.wishes.choice} #{index + 1}</span>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-foreground mb-2 block text-sm">{t.wishes.selectClass}</Label>
                <ClassGrid
                  value={wish.classId}
                  onChange={(classId) => onWishChange(index, 'classId', classId)}
                />
              </div>

              {wish.classId && (
                <div>
                  <Label className="text-foreground mb-2 block text-sm">{t.wishes.selectSpecs}</Label>
                  <SpecButtons
                    classId={wish.classId}
                    selectedSpecs={wish.specIds}
                    onChange={(specIds) => onWishChange(index, 'specIds', specIds)}
                  />
                </div>
              )}

              <div>
                <Label className="text-foreground mb-2 block text-sm">{t.wishes.comment}</Label>
                <Textarea
                  placeholder={t.wishes.commentPlaceholder}
                  value={wish.comment}
                  onChange={(e) => onWishChange(index, 'comment', e.target.value)}
                  className="cosmic-input min-h-[60px] resize-none text-sm"
                />
              </div>
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  );
};