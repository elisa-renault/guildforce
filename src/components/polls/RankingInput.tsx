
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import React, { forwardRef } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

interface RankingInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  readOnly?: boolean;
}

interface SortableItemProps {
  id: string;
  index: number;
  item: string;
  readOnly?: boolean;
}

const SortableItem = forwardRef<HTMLDivElement, SortableItemProps>(({ id, index, item, readOnly = false }, _outerRef) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg bg-background border border-border transition-colors ${
        isDragging ? 'shadow-lg border-primary/50 bg-card z-10' : 'hover:border-primary/30'
      }`}
    >
      <button
        type="button"
        className={`p-1 rounded touch-none ${readOnly ? 'cursor-default opacity-60' : 'cursor-grab active:cursor-grabbing hover:bg-primary/10'}`}
        disabled={readOnly}
        {...(!readOnly ? attributes : {})}
        {...(!readOnly ? listeners : {})}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-bold shrink-0">
        {index + 1}
      </span>
      <span className="text-foreground flex-1">{item}</span>
    </div>
  );
});

SortableItem.displayName = 'SortableItem';

export const RankingInput = forwardRef<HTMLDivElement, RankingInputProps>(({ items, onChange, readOnly = false }, ref) => {
  const { t } = useLanguage();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) {
      return;
    }

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onChange(newItems);
    }
  };

  return (
    <div ref={ref} className="space-y-2">
      {!readOnly && (
        <p className="text-xs text-muted-foreground mb-3">
          {t.polls.dragToRank}
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableItem key={item} id={item} index={index} item={item} readOnly={readOnly} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
});

RankingInput.displayName = 'RankingInput';
