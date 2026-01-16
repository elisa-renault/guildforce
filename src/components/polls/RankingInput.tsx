import React, { forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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

interface RankingInputProps {
  items: string[];
  onChange: (items: string[]) => void;
}

interface SortableItemProps {
  id: string;
  index: number;
  item: string;
}

const SortableItem = forwardRef<HTMLDivElement, SortableItemProps>(({ id, index, item }, outerRef) => {
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
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-primary/10 touch-none"
        {...attributes}
        {...listeners}
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

export const RankingInput = forwardRef<HTMLDivElement, RankingInputProps>(({ items, onChange }, ref) => {
  const { language } = useLanguage();
  
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
      <p className="text-xs text-muted-foreground mb-3">
        {language === 'fr' 
          ? 'Glissez-déposez pour classer les éléments (1 = meilleur)' 
          : 'Drag and drop to rank items (1 = best)'}
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableItem key={item} id={item} index={index} item={item} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
});

RankingInput.displayName = 'RankingInput';
