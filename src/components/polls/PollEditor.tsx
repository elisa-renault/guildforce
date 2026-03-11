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
import { Plus, Save, Play, Loader2, Layers, GripHorizontal, Trash2, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { PollPreviewDialog } from './PollPreviewDialog';
import { PollRespondentEditor, type RespondentAccessRule } from './PollRespondentEditor';
import { PollResultsAccessEditor, type ResultsAccessConfig } from './PollResultsAccessEditor';
import { SortableQuestion } from './SortableQuestion';
import type { PollFormData, QuestionFormData, SectionFormData } from '@/types/poll';

import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';


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
  onSave: (data: PollFormData, accessConfig: ResultsAccessConfig, respondentRules?: RespondentAccessRule[]) => Promise<void>;
  onPublish?: (data: PollFormData, accessConfig: ResultsAccessConfig, respondentRules?: RespondentAccessRule[]) => Promise<void>;
  saving?: boolean;
  metadataOnly?: boolean;
  initialAccessConfig?: ResultsAccessConfig;
  initialRespondentRules?: RespondentAccessRule[];
}

const defaultQuestion: QuestionFormData = {
  question_text: '',
  question_type: 'single_choice',
  analysis_intent: 'decision',
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
  const { language, t } = useLanguage();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
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
    <div ref={setNodeRef} style={style} className="mb-1 sm:mb-2 transition-transform duration-150 ease-out">
      <div className="p-2 sm:p-4 bg-primary/10 rounded-lg border border-primary/30">
        <div className="flex items-center justify-between gap-2">
          <div 
            className="flex items-center gap-2 text-muted-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripHorizontal className="h-5 w-5" />
            <span className="text-sm font-medium text-primary">
              {interpolateMessage(sm('polls.editor.section_label'), { index: sectionIndex + 1 })}
            </span>
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

        <div className="mt-2 space-y-2">
          <Textarea
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            placeholder={sm('polls.editor.section_title_placeholder')}
            autoResize
            className="bg-background font-medium resize-y min-h-9 py-2"
            rows={1}
          />
          <Textarea
            value={section.description}
            onChange={(e) => onChange({ ...section, description: e.target.value })}
            placeholder={sm('polls.editor.section_description_placeholder')}
            autoResize
            className="bg-background resize-y text-sm"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
};

// eslint-disable-next-line complexity
export const PollEditor = ({
  initialData,
  rosters,
  members = [],
  ranks = [],
  onSave,
  onPublish,
  saving = false,
  metadataOnly = false,
  initialAccessConfig = { base_audience: 'guild_members', base_visibility: 'full', rules: [] },
  initialRespondentRules = [],
}: PollEditorProps) => {
  const { language, t } = useLanguage();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Results access state
  const [resultsAccessConfig, setResultsAccessConfig] = useState<ResultsAccessConfig>(initialAccessConfig);
  
  // Respondent access state
  const [restrictRespondentAccess, setRestrictRespondentAccess] = useState(initialRespondentRules.length > 0);
  const [respondentAccessRules, setRespondentAccessRules] = useState<RespondentAccessRule[]>(initialRespondentRules);
  
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

  useEffect(() => {
    const ids = [
      ...formData.questions.map((_, i) => `general-q-${i}`),
      ...formData.sections.flatMap((s, si) => s.questions.map((_, qi) => `section-${si}-q-${qi}`)),
    ];

    if (ids.length === 0) {
      if (activeQuestionId !== null) {
        setActiveQuestionId(null);
      }
      return;
    }

    if (!activeQuestionId || !ids.includes(activeQuestionId)) {
      setActiveQuestionId(ids[0]);
    }
  }, [formData.questions, formData.sections, activeQuestionId]);

  // Only initialize access rules once on mount or when they actually change
  const initialAccessConfigRef = useRef<ResultsAccessConfig | null>(null);
  useEffect(() => {
    if (initialAccessConfigRef.current !== null) {
      const currentConfigStr = JSON.stringify(initialAccessConfigRef.current);
      const newConfigStr = JSON.stringify(initialAccessConfig);
      if (currentConfigStr === newConfigStr) return;
    }

    initialAccessConfigRef.current = initialAccessConfig;
    setResultsAccessConfig(initialAccessConfig);
  }, [initialAccessConfig]);

  // Initialize respondent rules
  const initialRespondentRulesRef = useRef<RespondentAccessRule[] | null>(null);
  useEffect(() => {
    if (initialRespondentRulesRef.current !== null) {
      const currentRulesStr = JSON.stringify(initialRespondentRulesRef.current);
      const newRulesStr = JSON.stringify(initialRespondentRules);
      if (currentRulesStr === newRulesStr) return;
    }
    
    initialRespondentRulesRef.current = initialRespondentRules;
    setRestrictRespondentAccess(initialRespondentRules.length > 0);
    setRespondentAccessRules(initialRespondentRules);
  }, [initialRespondentRules]);

  // Toggle section
  const toggleSection = (index: number) => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Questions without section
  const handleAddQuestion = () => {
    const newIndex = formData.questions.length;
    setFormData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...defaultQuestion }],
    }));
    setActiveQuestionId(`general-q-${newIndex}`);
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
    if (activeQuestionId === `general-q-${index}`) {
      setActiveQuestionId(null);
    }
  };

  // Sections
  const handleAddSection = () => {
    const newIndex = formData.sections.length;
    setFormData((prev) => ({
      ...prev,
      sections: [...prev.sections, { ...defaultSection }],
    }));
    setOpenSections(prev => ({ ...prev, [newIndex]: true }));
    setActiveQuestionId(`section-${newIndex}-q-0`);
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
    setActiveQuestionId(null);
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
    if (activeQuestionId === `section-${sectionIndex}-q-${qIndex}`) {
      setActiveQuestionId(null);
    }
  };

  const handleAddSectionQuestion = (sectionIndex: number) => {
    const newIndex = formData.sections[sectionIndex]?.questions.length ?? 0;
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => 
        i === sectionIndex 
          ? { ...s, questions: [...s.questions, { ...defaultQuestion }] }
          : s
      ),
    }));
    setActiveQuestionId(`section-${sectionIndex}-q-${newIndex}`);
  };

  // Unified drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    setOverId(null);
    const info = parseQuestionId(event.active.id.toString());
    if (info) {
      setActiveQuestionId(event.active.id.toString());
    }
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
      setActiveQuestionId(null);
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

    let nextActiveId: string | null = null;

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
        nextActiveId = `general-q-${adjustedIndex}`;
        const newQuestions = [...newFormData.questions];
        newQuestions.splice(adjustedIndex, 0, activeQuestion);
        newFormData.questions = newQuestions;
      } else {
        // Adjust index if removing from same section above target
        let adjustedIndex = targetQuestionIndex;
        if (activeInfo.type === 'section' && activeInfo.sectionIndex === targetSectionIndex && activeInfo.questionIndex < targetQuestionIndex) {
          adjustedIndex--;
        }
        nextActiveId = `section-${targetSectionIndex}-q-${adjustedIndex}`;
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

    if (nextActiveId) {
      setActiveQuestionId(nextActiveId);
    }
  };

  const handleSave = async () => {
    const sectionIdToEditorId: Record<string, string> = {};
    const questionIdToEditorId: Record<string, string> = {};

    formData.sections.forEach((section, sectionIndex) => {
      if (section.id) {
        sectionIdToEditorId[section.id] = `section-${sectionIndex}`;
      }
      section.questions.forEach((question, questionIndex) => {
        if (question.id) {
          questionIdToEditorId[question.id] = `section-${sectionIndex}-q-${questionIndex}`;
        }
      });
    });
    formData.questions.forEach((question, questionIndex) => {
      if (question.id) {
        questionIdToEditorId[question.id] = `general-q-${questionIndex}`;
      }
    });

    const accessConfigToSave: ResultsAccessConfig = {
      ...resultsAccessConfig,
      rules: resultsAccessConfig.rules.map((rule) => ({
        ...rule,
        section_id:
          rule.target_type === 'section' && rule.section_id
            ? sectionIdToEditorId[rule.section_id] || rule.section_id
            : rule.section_id,
        question_id:
          rule.target_type === 'question' && rule.question_id
            ? questionIdToEditorId[rule.question_id] || rule.question_id
            : rule.question_id,
      })),
    };

    const respondentRulesToSave = restrictRespondentAccess ? respondentAccessRules : [];
    await onSave(formData, accessConfigToSave, respondentRulesToSave);
  };

  const handlePublish = async () => {
    if (onPublish) {
      const sectionIdToEditorId: Record<string, string> = {};
      const questionIdToEditorId: Record<string, string> = {};

      formData.sections.forEach((section, sectionIndex) => {
        if (section.id) {
          sectionIdToEditorId[section.id] = `section-${sectionIndex}`;
        }
        section.questions.forEach((question, questionIndex) => {
          if (question.id) {
            questionIdToEditorId[question.id] = `section-${sectionIndex}-q-${questionIndex}`;
          }
        });
      });
      formData.questions.forEach((question, questionIndex) => {
        if (question.id) {
          questionIdToEditorId[question.id] = `general-q-${questionIndex}`;
        }
      });

      const accessConfigToSave: ResultsAccessConfig = {
        ...resultsAccessConfig,
        rules: resultsAccessConfig.rules.map((rule) => ({
          ...rule,
          section_id:
            rule.target_type === 'section' && rule.section_id
              ? sectionIdToEditorId[rule.section_id] || rule.section_id
              : rule.section_id,
          question_id:
            rule.target_type === 'question' && rule.question_id
              ? questionIdToEditorId[rule.question_id] || rule.question_id
              : rule.question_id,
        })),
      };

      const respondentRulesToSave = restrictRespondentAccess ? respondentAccessRules : [];
      await onPublish(formData, accessConfigToSave, respondentRulesToSave);
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

  const activeInfo = activeId ? parseQuestionId(activeId.toString()) : null;
  const overInfo = overId ? parseQuestionId(overId.toString()) : null;
  const activeContainer = activeInfo?.type === 'general'
    ? 'general'
    : activeInfo
      ? `section-${activeInfo.sectionIndex}`
      : null;
  const overContainer = overInfo?.type === 'general'
    ? 'general'
    : overInfo
      ? `section-${overInfo.sectionIndex}`
      : null;
  const isCrossContainer = !!(activeContainer && overContainer && activeContainer !== overContainer);

  const renderDropIndicator = (isTarget: boolean) => {
    if (!isCrossContainer || !isTarget) return null;
    return (
      <div className="flex items-center gap-2 py-0.5" aria-hidden="true">
        <div className="h-0.5 w-full rounded-full bg-primary/70 shadow-[0_0_6px_hsl(var(--primary)/0.3)]" />
      </div>
    );
  };

  const isDraggingQuestion = activeId ? !!parseQuestionId(activeId.toString()) : false;

  return (
    <div className="space-y-6 pb-0 sm:pb-0">
      <GlowCard className="p-3 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">
          {sm('polls.editor.settings_title')}
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              {sm('polls.editor.field_title')} *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={sm('polls.editor.title_placeholder')}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {sm('polls.editor.field_description')}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={sm('polls.editor.description_placeholder')}
              autoResize
              className="bg-background resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {sm('polls.editor.field_roster')}
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
                    {sm('polls.editor.roster_all')}
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
                {sm('polls.editor.field_end_at')}
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
                {sm('polls.editor.toggle_anonymous')}
              </Label>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Respondent Targeting */}
      <GlowCard className="p-3 sm:p-6">
        <PollRespondentEditor
          accessRules={respondentAccessRules}
          members={members}
          ranks={ranks}
          onChange={setRespondentAccessRules}
          restrictAccess={restrictRespondentAccess}
          onRestrictAccessChange={setRestrictRespondentAccess}
        />
      </GlowCard>

      {/* Results Access Control */}
      <GlowCard className="p-3 sm:p-6">
        <PollResultsAccessEditor
          config={resultsAccessConfig}
          members={members}
          ranks={ranks}
          sections={formData.sections.map((section, sectionIndex) => ({
            id: section.id || `section-${sectionIndex}`,
            title: section.title || `${sm('polls.editor.section_label').replace('{{index}}', String(sectionIndex + 1))}`,
          }))}
          questions={[
            ...formData.sections.flatMap((section, sectionIndex) =>
              section.questions.map((question, questionIndex) => ({
                id: question.id || `section-${sectionIndex}-q-${questionIndex}`,
                section_id: section.id || `section-${sectionIndex}`,
                question_text: question.question_text || `Q${questionIndex + 1}`,
                question_type: question.question_type,
              })),
            ),
            ...formData.questions.map((question, questionIndex) => ({
              id: question.id || `general-q-${questionIndex}`,
              section_id: null,
              question_text: question.question_text || `Q${questionIndex + 1}`,
              question_type: question.question_type,
            })),
          ]}
          onChange={setResultsAccessConfig}
        />
      </GlowCard>

      {/* Unified Questions & Sections Editor */}
      <GlowCard className={`p-3 sm:p-6 ${metadataOnly ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {sm('polls.editor.questions_title')}
          </h2>
          {!metadataOnly && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddSection}>
                <Layers className="h-4 w-4 mr-1" />
                {sm('polls.editor.add_section')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-1" />
                {sm('polls.editor.add_question')}
              </Button>
            </div>
          )}
        </div>

        {metadataOnly && (
          <p className="text-sm text-muted-foreground mb-4">
            {sm('polls.editor.metadata_only_hint')}
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
                {sm('polls.editor.empty_state')}
              </p>
            )}

            {/* General Questions */}
            {formData.questions.length > 0 && (
              <div 
                className={`space-y-0.5 p-0 sm:p-3 rounded-lg border-2 border-dashed transition-colors duration-200 ${
                  activeId && overId?.toString().startsWith('general-q-')
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent'
                }`}
              >
                <h3 className="text-sm font-medium text-muted-foreground">
                  {sm('polls.editor.general_questions')}
                </h3>
                <SortableContext items={formData.questions.map((_, i) => `general-q-${i}`)} strategy={verticalListSortingStrategy}>
                  {formData.questions.map((question, index) => {
                    // Calculate previous questions eligible for conditions (choice + numeric types)
                    const previousQuestions = formData.questions
                      .slice(0, index)
                      .map((q, i) => ({
                        id: `general-q-${i}`,
                        text: q.question_text,
                        options: q.options || [],
                        type: q.question_type,
                        scaleConfig: q.scale_config || null,
                      }))
                      .filter(q => 
                        q.type === 'single_choice' || 
                        q.type === 'multiple_choice' || 
                        q.type === 'scale' || 
                        q.type === 'rating'
                      );

                    const questionId = `general-q-${index}`;
                    return (
                      <div key={questionId} className="space-y-0.5">
                        {renderDropIndicator(isDraggingQuestion && overId?.toString() === questionId)}
                        <SortableQuestion
                          id={questionId}
                          question={question}
                          index={index}
                          onChange={(q) => handleQuestionChange(index, q)}
                          onRemove={() => handleRemoveQuestion(index)}
                          canRemove={formData.questions.length > 1 || formData.sections.some(s => s.questions.length > 0)}
                          previousQuestions={previousQuestions}
                          isActive={activeQuestionId === questionId}
                          onActivate={() => setActiveQuestionId(questionId)}
                        />
                      </div>
                    );
                  })}
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
                      className={`space-y-1.5 p-0 sm:p-3 rounded-lg border-2 border-dashed transition-colors duration-200 ${
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
                          <div className="space-y-0.5">
                            <SortableContext 
                              items={section.questions.map((_, qi) => `section-${sectionIndex}-q-${qi}`)} 
                              strategy={verticalListSortingStrategy}
                            >
                              {section.questions.map((question, qIndex) => {
                                // Calculate ALL previous questions for conditions:
                                // 1. All general questions
                                // 2. Questions from previous sections
                                // 3. Questions in this section before current index
                                const allPreviousQuestions = [
                                  ...formData.questions.map((q, i) => ({
                                    id: `general-q-${i}`,
                                    text: q.question_text,
                                    options: q.options || [],
                                    type: q.question_type,
                                    scaleConfig: q.scale_config || null,
                                  })),
                                  ...formData.sections
                                    .slice(0, sectionIndex)
                                    .flatMap((s, si) => s.questions.map((q, qi) => ({
                                      id: `section-${si}-q-${qi}`,
                                      text: q.question_text,
                                      options: q.options || [],
                                      type: q.question_type,
                                      scaleConfig: q.scale_config || null,
                                    }))),
                                  ...section.questions.slice(0, qIndex).map((q, qi) => ({
                                    id: `section-${sectionIndex}-q-${qi}`,
                                    text: q.question_text,
                                    options: q.options || [],
                                    type: q.question_type,
                                    scaleConfig: q.scale_config || null,
                                  })),
                                ].filter(q => 
                                  q.type === 'single_choice' || 
                                  q.type === 'multiple_choice' || 
                                  q.type === 'scale' || 
                                  q.type === 'rating'
                                );

                                const questionId = `section-${sectionIndex}-q-${qIndex}`;
                                return (
                                  <div key={questionId} className="space-y-0.5">
                                    {renderDropIndicator(isDraggingQuestion && overId?.toString() === questionId)}
                                    <SortableQuestion
                                      id={questionId}
                                      question={question}
                                      index={qIndex}
                                      onChange={(q) => handleSectionQuestionChange(sectionIndex, qIndex, q)}
                                      onRemove={() => handleRemoveSectionQuestion(sectionIndex, qIndex)}
                                      canRemove={true}
                                      compact
                                      previousQuestions={allPreviousQuestions}
                                      isActive={activeQuestionId === questionId}
                                      onActivate={() => setActiveQuestionId(questionId)}
                                    />
                                  </div>
                                );
                              })}
                            </SortableContext>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddSectionQuestion(sectionIndex)}
                              className="text-primary w-full border border-dashed border-primary/30 hover:border-primary/50"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {sm('polls.editor.add_section_question')}
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
              <DragOverlay
                dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}
                adjustScale={false}
              >
                {activeId && getActiveQuestion() && (
                  <div className="border border-primary rounded-lg p-3 bg-card shadow-xl max-w-md pointer-events-none">
                    <div className="flex items-center gap-2 text-sm">
                      <GripHorizontal className="h-4 w-4 text-primary" />
                    <span className="truncate">{getActiveQuestion()?.question_text || (sm('polls.editor.drag_overlay_placeholder'))}</span>
                    </div>
                  </div>
                )}
              </DragOverlay>,
              document.body
            )}

        </DndContext>
      </GlowCard>

      {/* Sticky actions */}
      <div className="sticky bottom-2 z-40 mx-2 rounded-lg sm:mx-0 px-3 pt-3 pr-16 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pr-4 sm:pb-3 sm:px-4 sm:py-3 bg-gradient-to-br from-background/95 via-background/85 to-primary/10 backdrop-blur border border-primary/20 shadow-[0_12px_30px_-20px_hsl(var(--background)/0.7),0_0_0_1px_hsl(var(--foreground)/0.04)]">
        {/* Validation feedback */}
        {!isValid && formData.title.trim() && (
          <div className="mb-2 text-sm text-muted-foreground">
            {sm('polls.editor.invalid_hint')}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end sm:gap-3">
          {/* Preview button */}
          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            disabled={!hasQuestions}
            className="w-full sm:w-auto"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            {t.polls.preview}
          </Button>

          <Button
            variant={onPublish ? "outline" : "default"}
            onClick={handleSave}
            disabled={!formData.title.trim() || saving}
            className="w-full sm:w-auto"
            size="sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {onPublish 
              ? (sm('polls.editor.save_changes'))
              : (sm('polls.editor.save_draft'))
            }
          </Button>

          {onPublish && (
            <Button
              onClick={handlePublish}
              disabled={!isValid || saving}
              className="col-span-2 w-full sm:col-span-1 sm:w-auto"
              size="sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {sm('polls.editor.publish')}
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
