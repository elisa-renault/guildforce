import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { forwardRef } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Save, Trash2 } from 'lucide-react';

import { CommitmentToggle } from '@/components/CommitmentToggle';
import type { CommitmentStatus } from '@/components/CommitmentToggle';
import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { WishCardEditor } from '@/components/WishCardEditor';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveSemanticMessage } from '@/i18n/semantic';
import type { SemanticKey } from '@/i18n/semantic';
import { cn } from '@/lib/utils';

export interface WishFormWish {
  id?: string;
  classId: string;
  specIds: string[];
  comment: string;
}
type WishFormField = keyof Omit<WishFormWish, 'id'>;

interface SortableWishCardProps {
  wish: WishFormWish;
  itemId: string;
  index: number;
  totalWishes: number;
  onChange: <K extends WishFormField>(field: K, value: WishFormWish[K]) => void;
  onRemove: () => void;
  onClear: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canRemove: boolean;
  usedClassIds: string[];
  disabled?: boolean;
}

const SortableWishCard = forwardRef<HTMLDivElement, SortableWishCardProps>(
  ({ wish, itemId, index, totalWishes, onChange, onRemove, onClear, onMoveUp, onMoveDown, canRemove, usedClassIds, disabled = false }, _outerRef) => {
    const { t } = useLanguage();
    const s = (key: SemanticKey, fallback?: string) =>
      resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: itemId, disabled });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    const canMoveUp = index > 0;
    const canMoveDown = index < totalWishes - 1;

    return (
      <div ref={setNodeRef} style={style}>
        <GlowCard surface="section" className={cn('p-3', disabled && 'opacity-60')} hoverable={false}>
          <div className="flex items-center gap-2">
            <div className="hidden flex-col gap-0.5 lg:flex">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp || disabled}
                className="flex h-5 w-5 items-center justify-center rounded bg-muted/50 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                title={s('wishes.move_up')}
              >
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown || disabled}
                className="flex h-5 w-5 items-center justify-center rounded bg-muted/50 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                title={s('wishes.move_down')}
              >
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            <button
              type="button"
              {...attributes}
              {...listeners}
              disabled={disabled}
              className={cn(
                'hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/50 lg:flex',
                disabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab transition-colors hover:bg-muted active:cursor-grabbing',
              )}
              title={s('wishes.drag_reorder')}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/20 to-secondary/20">
              <span className="text-sm font-bold text-primary">{index + 1}</span>
            </div>

            <WishCardEditor
              wish={wish}
              onChange={onChange}
              usedClassIds={usedClassIds}
              disabled={disabled}
            />

            {canRemove ? (
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 transition-colors',
                  disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-destructive/20',
                )}
                title={t.common.delete}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            ) : wish.classId ? (
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/50 transition-colors',
                  disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-muted',
                )}
                title={t.common.delete}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : (
              <div className="h-7 w-7 shrink-0" />
            )}
          </div>
        </GlowCard>
      </div>
    );
  },
);

SortableWishCard.displayName = 'SortableWishCard';

interface WishFormEditorProps {
  wishes: WishFormWish[];
  status: CommitmentStatus;
  saving: boolean;
  disabled?: boolean;
  maxWishes: number;
  onWishChange: <K extends WishFormField>(index: number, field: K, value: WishFormWish[K]) => void;
  onStatusChange: (status: CommitmentStatus) => void;
  onAddWish: () => void;
  onRemoveWish: (index: number) => void;
  onClearWish: (index: number) => void;
  onMoveWish: (index: number, direction: 'up' | 'down') => void;
  onReorderWishes: (oldIndex: number, newIndex: number) => void;
  onSave: () => void;
  onCancel?: () => void;
}

export const WishFormEditor = ({
  wishes,
  status,
  saving,
  disabled = false,
  maxWishes,
  onWishChange,
  onStatusChange,
  onAddWish,
  onRemoveWish,
  onClearWish,
  onMoveWish,
  onReorderWishes,
  onSave,
  onCancel,
}: WishFormEditorProps) => {
  const { t } = useLanguage();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const itemIds = wishes.map((wish, index) => wish.id || `wish-${index}`);

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = itemIds.findIndex((id) => id === active.id);
    const newIndex = itemIds.findIndex((id) => id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderWishes(oldIndex, newIndex);
  };

  return (
    <div className="space-y-4">
      <GlowCard surface="section" className="p-3">
        <CommitmentToggle status={status} onChange={onStatusChange} disabled={disabled} />
      </GlowCard>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {wishes.map((wish, index) => {
              const usedClassIds = wishes
                .filter((_, i) => i !== index)
                .map((item) => item.classId)
                .filter(Boolean);

              return (
                <SortableWishCard
                  key={itemIds[index]}
                  itemId={itemIds[index]}
                  wish={wish}
                  index={index}
                  totalWishes={wishes.length}
                  onChange={(field, value) => onWishChange(index, field, value)}
                  onRemove={() => onRemoveWish(index)}
                  onClear={() => onClearWish(index)}
                  onMoveUp={() => onMoveWish(index, 'up')}
                  onMoveDown={() => onMoveWish(index, 'down')}
                  canRemove={wishes.length > 1}
                  usedClassIds={usedClassIds}
                  disabled={disabled}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {wishes.length < maxWishes && (
        <div className="text-center">
          <button
            type="button"
            onClick={onAddWish}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-dashed border-primary/50 px-3 py-1.5 text-sm text-primary transition-colors',
              disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-primary/10',
            )}
          >
            <Plus className="h-4 w-4" />
            {t.wishes.addWish}
          </button>
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
        {onCancel && (
          <CosmicButton size="md" variant="outline" onClick={onCancel} disabled={saving}>
            {t.common.cancel}
          </CosmicButton>
        )}
        <CosmicButton
          size="md"
          onClick={onSave}
          loading={saving}
          disabled={disabled}
          icon={<Save className="h-4 w-4" strokeWidth={1.5} />}
        >
          {t.wishes.saveWishes}
        </CosmicButton>
      </div>
    </div>
  );
};
