import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlowCard } from '@/components/GlowCard';
import { SortableQuestion } from './SortableQuestion';
import { PollPreviewDialog } from './PollPreviewDialog';
import { Plus, Save, Play, Loader2, Layers, GripVertical, Trash2, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PollFormData, QuestionFormData, SectionFormData } from '@/types/poll';
import { PollResultsAccessEditor, type ResultsAccessRule } from './PollResultsAccessEditor';

interface Roster {
  id: string;
  name: string;
}

interface GuildMember {
  user_id: string;
  username: string;
}

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

interface PollEditorProps {
  initialData?: PollFormData;
  rosters: Roster[];
  members?: GuildMember[];
  ranks?: GuildRank[];
  officerRankThreshold?: number;
  onSave: (data: PollFormData, accessRules?: ResultsAccessRule[]) => Promise<void>;
  onPublish?: (data: PollFormData, accessRules?: ResultsAccessRule[]) => Promise<void>;
  saving?: boolean;
  metadataOnly?: boolean;
  initialAccessRules?: ResultsAccessRule[];
}

const defaultQuestion: QuestionFormData = {
  question_text: '',
  question_type: 'single_choice',
  is_required: true,
  options: ['', ''],
};

const defaultSection: SectionFormData = {
  title: '',
  description: '',
  questions: [{ ...defaultQuestion }],
};

// Helper to parse question IDs
const parseQuestionId = (id: string): { type: 'general' | 'section'; sectionIndex?: number; questionIndex: number } | null => {
  if (id.startsWith('general-q-')) {
    return { type: 'general', questionIndex: parseInt(id.replace('general-q-', '')) };
  }
  const match = id.match(/^section-(\d+)-q-(\d+)$/);
  if (match) {
    return { type: 'section', sectionIndex: parseInt(match[1]), questionIndex: parseInt(match[2]) };
  }
  return null;
};

// Sortable Section Header
const SortableSectionHeader = ({ 
  section, 
  sectionIndex, 
  isOpen,
  onToggle,
  onRemove,
  onChange,
  canRemove,
}: { 
  section: SectionFormData; 
  sectionIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onChange: (section: SectionFormData) => void;
  canRemove: boolean;
}) => {
  const { language } = useLanguage();
  const id = `section-header-${sectionIndex}`;
  
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

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg border border-primary/30">
        <div 
          className="flex items-center gap-2 pt-2 text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
          <span className="text-sm font-medium text-primary">S{sectionIndex + 1}</span>
        </div>

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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
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
    </div>
  );
};

export const PollEditor = ({
  initialData,
  rosters,
  members = [],
  ranks = [],
  officerRankThreshold = 2,
  onSave,
  onPublish,
  saving = false,
  metadataOnly = false,
  initialAccessRules = [],
}: PollEditorProps) => {
  const { language, t } = useLanguage();
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Results access state
  const [restrictResultsAccess, setRestrictResultsAccess] = useState(initialAccessRules.length > 0);
  const [resultsAccessRules, setResultsAccessRules] = useState<ResultsAccessRule[]>(initialAccessRules);
  
  const [formData, setFormData] = useState<PollFormData>(initialData || {
    title: '',
    description: '',
    is_anonymous: false,
    allow_multiple_responses: false,
    roster_id: null,
    ends_at: null,
    sections: [],
    questions: [{ ...defaultQuestion }],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Avoid re-initializing the editor on every parent re-render (initialData can be a new object each time)
  const initialDataStrRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialData) return;

    const nextStr = JSON.stringify(initialData);
    if (initialDataStrRef.current === nextStr) return;
    initialDataStrRef.current = nextStr;

    setFormData({
      ...initialData,
      sections: initialData.sections || [],
      questions: initialData.questions || [{ ...defaultQuestion }],
    });

    // Open all sections by default
    const openState: Record<number, boolean> = {};
    (initialData.sections || []).forEach((_, i) => {
      openState[i] = true;
    });
    setOpenSections(openState);
  }, [initialData]);

  // Only initialize access rules once on mount or when they actually change
  const initialAccessRulesRef = useRef<ResultsAccessRule[] | null>(null);
  useEffect(() => {
    // Skip if we've already initialized and the arrays are equivalent
    if (initialAccessRulesRef.current !== null) {
      const currentRulesStr = JSON.stringify(initialAccessRulesRef.current);
      const newRulesStr = JSON.stringify(initialAccessRules);
      if (currentRulesStr === newRulesStr) return;
    }
    
    initialAccessRulesRef.current = initialAccessRules;
    setRestrictResultsAccess(initialAccessRules.length > 0);
    setResultsAccessRules(initialAccessRules);
  }, [initialAccessRules]);

  // Toggle section
  const toggleSection = (index: number) => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Questions without section
  const handleAddQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...defaultQuestion }],
    }));
  };

  const handleQuestionChange = (index: number, question: QuestionFormData) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? question : q)),
    }));
  };

  const handleRemoveQuestion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  // Sections
  const handleAddSection = () => {
    const newIndex = formData.sections.length;
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { ...defaultSection }],
    }));
    setOpenSections(prev => ({ ...prev, [newIndex]: true }));
  };

  const handleSectionChange = (index: number, section: SectionFormData) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? section : s)),
    }));
  };

  const handleRemoveSection = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const handleSectionQuestionChange = (sectionIndex: number, qIndex: number, question: QuestionFormData) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => 
        i === sectionIndex 
          ? { ...s, questions: s.questions.map((q, j) => j === qIndex ? question : q) }
          : s
      ),
    }));
  };

  const handleRemoveSectionQuestion = (sectionIndex: number, qIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => 
        i === sectionIndex 
          ? { ...s, questions: s.questions.filter((_, j) => j !== qIndex) }
          : s
      ),
    }));
  };

  const handleAddSectionQuestion = (sectionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => 
        i === sectionIndex 
          ? { ...s, questions: [...s.questions, { ...defaultQuestion }] }
          : s
      ),
    }));
  };

  // Unified drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setOverId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    
    if (!over || active.id === over.id) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    // Handle section reordering
    if (activeIdStr.startsWith('section-header-') && overIdStr.startsWith('section-header-')) {
      const oldIndex = parseInt(activeIdStr.replace('section-header-', ''));
      const newIndex = parseInt(overIdStr.replace('section-header-', ''));
      
      setFormData((prev) => ({
        ...prev,
        sections: arrayMove(prev.sections, oldIndex, newIndex),
      }));
      return;
    }

    // Handle question movement
    const activeInfo = parseQuestionId(activeIdStr);
    const overInfo = parseQuestionId(overIdStr);
    
    if (!activeInfo) return;

    // Get the active question
    let activeQuestion: QuestionFormData;
    if (activeInfo.type === 'general') {
      activeQuestion = formData.questions[activeInfo.questionIndex];
    } else {
      activeQuestion = formData.sections[activeInfo.sectionIndex!].questions[activeInfo.questionIndex];
    }

    // Determine target location
    let targetType: 'general' | 'section' = 'general';
    let targetSectionIndex: number | undefined;
    let targetQuestionIndex: number = 0;

    if (overInfo) {
      targetType = overInfo.type;
      targetSectionIndex = overInfo.sectionIndex;
      targetQuestionIndex = overInfo.questionIndex;
    } else if (overIdStr.startsWith('section-header-')) {
      // Dropping a question onto a section header => move to that section (end)
      targetType = 'section';
      targetSectionIndex = parseInt(overIdStr.replace('section-header-', ''));
      targetQuestionIndex = formData.sections[targetSectionIndex].questions.length;
    } else if (overIdStr.startsWith('section-drop-')) {
      // Dropping on a section drop zone
      targetType = 'section';
      targetSectionIndex = parseInt(overIdStr.replace('section-drop-', ''));
      targetQuestionIndex = formData.sections[targetSectionIndex].questions.length;
    } else if (overIdStr === 'general-drop') {
      targetType = 'general';
      targetQuestionIndex = formData.questions.length;
    }

    setFormData((prev) => {
      const newFormData = { ...prev };
      
      // Remove from source
      if (activeInfo.type === 'general') {
        newFormData.questions = prev.questions.filter((_, i) => i !== activeInfo.questionIndex);
      } else {
        newFormData.sections = prev.sections.map((s, i) => 
          i === activeInfo.sectionIndex 
            ? { ...s, questions: s.questions.filter((_, j) => j !== activeInfo.questionIndex) }
            : s
        );
      }

      // Add to target
      if (targetType === 'general') {
        // Adjust index if removing from same container above target
        let adjustedIndex = targetQuestionIndex;
        if (activeInfo.type === 'general' && activeInfo.questionIndex < targetQuestionIndex) {
          adjustedIndex--;
        }
        const newQuestions = [...newFormData.questions];
        newQuestions.splice(adjustedIndex, 0, activeQuestion);
        newFormData.questions = newQuestions;
      } else {
        // Adjust index if removing from same section above target
        let adjustedIndex = targetQuestionIndex;
        if (activeInfo.type === 'section' && activeInfo.sectionIndex === targetSectionIndex && activeInfo.questionIndex < targetQuestionIndex) {
          adjustedIndex--;
        }
        newFormData.sections = newFormData.sections.map((s, i) => {
          if (i === targetSectionIndex) {
            const newQuestions = [...s.questions];
            newQuestions.splice(adjustedIndex, 0, activeQuestion);
            return { ...s, questions: newQuestions };
          }
          return s;
        });
      }

      return newFormData;
    });
  };

  const handleSave = async () => {
    const rulesToSave = restrictResultsAccess ? resultsAccessRules : [];
    await onSave(formData, rulesToSave);
  };

  const handlePublish = async () => {
    if (onPublish) {
      const rulesToSave = restrictResultsAccess ? resultsAccessRules : [];
      await onPublish(formData, rulesToSave);
    }
  };

  const validateQuestion = (q: QuestionFormData) => {
    if (!q.question_text.trim()) return false;
    if (q.question_type === 'text' || q.question_type === 'rating' || 
        q.question_type === 'date' || q.question_type === 'time' || 
        q.question_type === 'datetime' || q.question_type === 'scale') {
      return true;
    }
    return q.options.every(o => o.trim());
  };

  const allQuestionsValid = [
    ...formData.questions,
    ...formData.sections.flatMap(s => s.questions),
  ].every(validateQuestion);

  const hasQuestions = formData.questions.length > 0 || 
    formData.sections.some(s => s.questions.length > 0);

  const isValid = formData.title.trim() && hasQuestions && allQuestionsValid;

  // Build all sortable IDs
  const sectionHeaderIds = formData.sections.map((_, i) => `section-header-${i}`);
  const allQuestionIds = [
    ...formData.questions.map((_, i) => `general-q-${i}`),
    ...formData.sections.flatMap((s, si) => s.questions.map((_, qi) => `section-${si}-q-${qi}`)),
  ];

  // Get active question for overlay
  const getActiveQuestion = (): QuestionFormData | null => {
    if (!activeId) return null;
    const info = parseQuestionId(activeId.toString());
    if (!info) return null;
    if (info.type === 'general') {
      return formData.questions[info.questionIndex];
    }
    return formData.sections[info.sectionIndex!]?.questions[info.questionIndex] || null;
  };

  return (
    <div className="space-y-6">
      <GlowCard className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          {language === 'fr' ? 'Informations générales' : 'General Information'}
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              {language === 'fr' ? 'Titre du sondage' : 'Poll Title'} *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={language === 'fr' ? 'Ex: Retour sur la saison 3' : 'Ex: Season 3 Feedback'}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {language === 'fr' ? 'Description (optionnelle)' : 'Description (optional)'}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={language === 'fr' 
                ? 'Expliquez le but du sondage...' 
                : 'Explain the purpose of this poll...'}
              className="bg-background resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {language === 'fr' ? 'Roster ciblé' : 'Target Roster'}
              </Label>
              <Select
                value={formData.roster_id || 'all'}
                onValueChange={(value) => setFormData((prev) => ({ 
                  ...prev, 
                  roster_id: value === 'all' ? null : value 
                }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === 'fr' ? 'Tous les membres' : 'All members'}
                  </SelectItem>
                  {rosters.map((roster) => (
                    <SelectItem key={roster.id} value={roster.id}>
                      {roster.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ends_at">
                {language === 'fr' ? 'Date de clôture (optionnelle)' : 'End Date (optional)'}
              </Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={formData.ends_at ? formData.ends_at.slice(0, 16) : ''}
                onChange={(e) => setFormData((prev) => ({ 
                  ...prev, 
                  ends_at: e.target.value ? new Date(e.target.value).toISOString() : null 
                }))}
                className="bg-background"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="anonymous"
                checked={formData.is_anonymous}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_anonymous: checked }))}
              />
              <Label htmlFor="anonymous" className="cursor-pointer">
                {language === 'fr' ? 'Réponses anonymes' : 'Anonymous responses'}
              </Label>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Results Access Control */}
      <GlowCard className="p-6">
        <PollResultsAccessEditor
          accessRules={resultsAccessRules}
          members={members}
          ranks={ranks}
          officerRankThreshold={officerRankThreshold}
          onChange={setResultsAccessRules}
          restrictAccess={restrictResultsAccess}
          onRestrictAccessChange={setRestrictResultsAccess}
        />
      </GlowCard>

      {/* Unified Questions & Sections Editor */}
      <GlowCard className={`p-6 ${metadataOnly ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {language === 'fr' ? 'Questions' : 'Questions'}
          </h2>
          {!metadataOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddSection}>
                <Layers className="h-4 w-4 mr-1" />
                {language === 'fr' ? 'Section' : 'Section'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'fr' ? 'Question' : 'Question'}
              </Button>
            </div>
          )}
        </div>

        {metadataOnly && (
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'fr' 
              ? 'Les questions ne peuvent pas être modifiées en mode paramètres.'
              : 'Questions cannot be modified in settings mode.'}
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            {formData.questions.length === 0 && formData.sections.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                {language === 'fr' 
                  ? 'Ajoutez des questions ou des sections pour commencer' 
                  : 'Add questions or sections to get started'}
              </p>
            )}

            {/* General Questions */}
            {formData.questions.length > 0 && (
              <div 
                className={`space-y-3 p-3 rounded-lg border-2 border-dashed transition-colors duration-200 ${
                  activeId && overId?.toString().startsWith('general-q-')
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent'
                }`}
              >
                <h3 className="text-sm font-medium text-muted-foreground">
                  {language === 'fr' ? 'Questions générales' : 'General Questions'}
                </h3>
                <SortableContext items={formData.questions.map((_, i) => `general-q-${i}`)} strategy={verticalListSortingStrategy}>
                  {formData.questions.map((question, index) => (
                    <SortableQuestion
                      key={`general-q-${index}`}
                      id={`general-q-${index}`}
                      question={question}
                      index={index}
                      onChange={(q) => handleQuestionChange(index, q)}
                      onRemove={() => handleRemoveQuestion(index)}
                      canRemove={formData.questions.length > 1 || formData.sections.some(s => s.questions.length > 0)}
                    />
                  ))}
                </SortableContext>
              </div>
            )}

            {/* Sections with their questions */}
            {formData.sections.length > 0 && (
              <SortableContext items={sectionHeaderIds} strategy={verticalListSortingStrategy}>
                {formData.sections.map((section, sectionIndex) => {
                  // Determine if this section is a drop target
                  const overIdStr = overId?.toString() || '';
                  const isSectionDropTarget = activeId && (
                    overIdStr === `section-header-${sectionIndex}` ||
                    overIdStr.startsWith(`section-${sectionIndex}-q-`)
                  );
                  
                  return (
                    <div 
                      key={`section-${sectionIndex}`} 
                      className={`space-y-2 p-3 rounded-lg border-2 border-dashed transition-colors duration-200 ${
                        isSectionDropTarget
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent'
                      }`}
                    >
                      <SortableSectionHeader
                        section={section}
                        sectionIndex={sectionIndex}
                        isOpen={openSections[sectionIndex] !== false}
                        onToggle={() => toggleSection(sectionIndex)}
                        onRemove={() => handleRemoveSection(sectionIndex)}
                        onChange={(s) => handleSectionChange(sectionIndex, s)}
                        canRemove={true}
                      />

                      <Collapsible open={openSections[sectionIndex] !== false}>
                        <CollapsibleContent>
                          <div className="ml-8 space-y-3">
                            <SortableContext 
                              items={section.questions.map((_, qi) => `section-${sectionIndex}-q-${qi}`)} 
                              strategy={verticalListSortingStrategy}
                            >
                              {section.questions.map((question, qIndex) => (
                                <SortableQuestion
                                  key={`section-${sectionIndex}-q-${qIndex}`}
                                  id={`section-${sectionIndex}-q-${qIndex}`}
                                  question={question}
                                  index={qIndex}
                                  onChange={(q) => handleSectionQuestionChange(sectionIndex, qIndex, q)}
                                  onRemove={() => handleRemoveSectionQuestion(sectionIndex, qIndex)}
                                  canRemove={true}
                                  compact
                                />
                              ))}
                            </SortableContext>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddSectionQuestion(sectionIndex)}
                              className="text-primary w-full border border-dashed border-primary/30 hover:border-primary/50"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {language === 'fr' ? 'Ajouter une question' : 'Add question'}
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </SortableContext>
            )}
          </div>

          {typeof document !== 'undefined' &&
            createPortal(
              <DragOverlay dropAnimation={null} adjustScale={false}>
                {activeId && getActiveQuestion() && (
                  <div className="border border-primary rounded-lg p-3 bg-card shadow-xl max-w-md pointer-events-none">
                    <div className="flex items-center gap-2 text-sm">
                      <GripVertical className="h-4 w-4 text-primary" />
                      <span className="truncate">{getActiveQuestion()?.question_text || (language === 'fr' ? 'Question...' : 'Question...')}</span>
                    </div>
                  </div>
                )}
              </DragOverlay>,
              document.body
            )}

        </DndContext>
      </GlowCard>

      {/* Sticky actions */}
      <div className="sticky bottom-0 z-20 -mx-4 sm:mx-0 sm:rounded-lg px-4 py-3 bg-background/80 backdrop-blur border border-border/50">
        {/* Validation feedback */}
        {!isValid && formData.title.trim() && (
          <div className="mb-2 text-sm text-muted-foreground">
            {language === 'fr'
              ? 'Remplis toutes les options de réponse (A, B, …) pour pouvoir publier.'
              : 'Fill in all answer options (A, B, …) to publish.'}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {/* Preview button */}
          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={!hasQuestions}
          >
            <Eye className="h-4 w-4 mr-2" />
            {t.polls?.preview || 'Preview'}
          </Button>

          <Button
            variant={onPublish ? "outline" : "default"}
            onClick={handleSave}
            disabled={!formData.title.trim() || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {onPublish 
              ? (language === 'fr' ? 'Enregistrer brouillon' : 'Save Draft')
              : (language === 'fr' ? 'Enregistrer' : 'Save')
            }
          </Button>

          {onPublish && (
            <Button
              onClick={handlePublish}
              disabled={!isValid || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {language === 'fr' ? 'Publier le sondage' : 'Publish Poll'}
            </Button>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <PollPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        formData={formData}
      />
    </div>
  );
};
