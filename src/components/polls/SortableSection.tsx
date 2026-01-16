import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GlowCard } from '@/components/GlowCard';
import { SortableQuestion } from './SortableQuestion';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { SectionFormData, QuestionFormData } from '@/types/poll';

interface SortableSectionProps {
  section: SectionFormData;
  sectionIndex: number;
  onChange: (section: SectionFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  id: string;
}

const defaultQuestion: QuestionFormData = {
  question_text: '',
  question_type: 'single_choice',
  is_required: true,
  options: ['', ''],
};

export const SortableSection = ({
  section,
  sectionIndex,
  onChange,
  onRemove,
  canRemove,
  id,
}: SortableSectionProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(true);

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
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleAddQuestion = () => {
    onChange({
      ...section,
      questions: [...section.questions, { ...defaultQuestion }],
    });
  };

  const handleQuestionChange = (qIndex: number, question: QuestionFormData) => {
    onChange({
      ...section,
      questions: section.questions.map((q, i) => (i === qIndex ? question : q)),
    });
  };

  const handleRemoveQuestion = (qIndex: number) => {
    onChange({
      ...section,
      questions: section.questions.filter((_, i) => i !== qIndex),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = section.questions.findIndex((_, i) => `section-${sectionIndex}-q-${i}` === active.id);
      const newIndex = section.questions.findIndex((_, i) => `section-${sectionIndex}-q-${i}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange({
          ...section,
          questions: arrayMove(section.questions, oldIndex, newIndex),
        });
      }
    }
  };

  const questionIds = section.questions.map((_, i) => `section-${sectionIndex}-q-${i}`);

  return (
    <div ref={setNodeRef} style={style}>
      <GlowCard className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-start gap-3">
            <div 
              className="flex items-center gap-2 pt-2 text-muted-foreground cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
              <span className="text-sm font-medium text-primary">S{sectionIndex + 1}</span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <Input
                    value={section.title}
                    onChange={(e) => onChange({ ...section, title: e.target.value })}
                    placeholder={language === 'fr' ? 'Titre de la section...' : 'Section title...'}
                    className="bg-background font-medium"
                  />
                  <Textarea
                    value={section.description}
                    onChange={(e) => onChange({ ...section, description: e.target.value })}
                    placeholder={language === 'fr' ? 'Description (optionnelle)...' : 'Description (optional)...'}
                    className="bg-background resize-none text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onRemove}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <CollapsibleContent className="space-y-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
                    {section.questions.map((question, qIndex) => (
                      <SortableQuestion
                        key={`section-${sectionIndex}-q-${qIndex}`}
                        id={`section-${sectionIndex}-q-${qIndex}`}
                        question={question}
                        index={qIndex}
                        onChange={(q) => handleQuestionChange(qIndex, q)}
                        onRemove={() => handleRemoveQuestion(qIndex)}
                        canRemove={section.questions.length > 0}
                        compact
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddQuestion}
                  className="text-primary w-full border border-dashed border-primary/30 hover:border-primary/50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {language === 'fr' ? 'Ajouter une question à cette section' : 'Add question to this section'}
                </Button>
              </CollapsibleContent>
            </div>
          </div>
        </Collapsible>
      </GlowCard>
    </div>
  );
};
