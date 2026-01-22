import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Plus, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { QuestionConditionEditor } from './QuestionConditionEditor';
import type { QuestionFormData, PollQuestionType, ScaleConfig, QuestionCondition } from '@/types/poll';

interface SortableQuestionProps {
  question: QuestionFormData;
  index: number;
  onChange: (question: QuestionFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  compact?: boolean;
  id: string;
  previousQuestions?: { id: string; text: string; options: string[]; type: string; scaleConfig?: { min: number; max: number; step?: number } | null }[];
}

export const SortableQuestion = forwardRef<HTMLDivElement, SortableQuestionProps>(({
  question,
  index,
  onChange,
  onRemove,
  canRemove,
  compact = false,
  id,
  previousQuestions = [],
}, outerRef) => {
  const { language, t } = useLanguage();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    // Hide the original element while dragging (we render a DragOverlay)
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const questionTypes: { value: PollQuestionType; label: string }[] = [
    { value: 'single_choice', label: t.auto.components_polls_SortableQuestion_55 },
    { value: 'multiple_choice', label: t.auto.components_polls_SortableQuestion_56 },
    { value: 'text', label: t.auto.components_polls_SortableQuestion_57 },
    { value: 'rating', label: t.auto.components_polls_SortableQuestion_58 },
    { value: 'date', label: t.auto.components_polls_SortableQuestion_59 },
    { value: 'time', label: t.auto.components_polls_SortableQuestion_60 },
    { value: 'datetime', label: t.auto.components_polls_SortableQuestion_61 },
    { value: 'ranking', label: t.auto.components_polls_SortableQuestion_62 },
    { value: 'scale', label: t.auto.components_polls_SortableQuestion_63 },
  ];

  const needsOptions = question.question_type === 'single_choice' || 
                       question.question_type === 'multiple_choice' || 
                       question.question_type === 'ranking';

  const needsScaleConfig = question.question_type === 'scale';

  // "Other" option is only for single/multiple choice (not ranking)
  const canHaveOther = question.question_type === 'single_choice' || 
                       question.question_type === 'multiple_choice';

  const handleAddOption = () => {
    onChange({
      ...question,
      options: [...question.options, ''],
    });
  };

  const handleRemoveOption = (optionIndex: number) => {
    onChange({
      ...question,
      options: question.options.filter((_, i) => i !== optionIndex),
    });
  };

  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    onChange({
      ...question,
      options: newOptions,
    });
  };

  const handleMoveOption = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= question.options.length) return;
    const newOptions = [...question.options];
    const [moved] = newOptions.splice(fromIndex, 1);
    newOptions.splice(toIndex, 0, moved);
    onChange({
      ...question,
      options: newOptions,
    });
  };

  const handleTypeChange = (value: PollQuestionType) => {
    const needsOpts = value === 'single_choice' || value === 'multiple_choice' || value === 'ranking';
    const needsScale = value === 'scale';
    const canOther = value === 'single_choice' || value === 'multiple_choice';
    
    onChange({ 
      ...question, 
      question_type: value,
      options: needsOpts 
        ? (question.options.length > 0 ? question.options : ['', ''])
        : [],
      scale_config: needsScale 
        ? (question.scale_config || { min: 0, max: 10, step: 1, display: 'stars', min_label: '', max_label: '' })
        : null,
      // Reset allow_other if type doesn't support it
      allow_other: canOther ? question.allow_other : false,
    });
  };

  const handleScaleConfigChange = (field: keyof ScaleConfig, value: string | number) => {
    const currentConfig = question.scale_config || { min: 0, max: 10, step: 1, display: 'stars' };
    onChange({
      ...question,
      scale_config: { ...currentConfig, [field]: value },
    });
  };

  const handleConditionChange = (condition: QuestionCondition | null) => {
    onChange({
      ...question,
      condition,
    });
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`border border-border rounded-lg p-4 ${compact ? 'bg-background/50' : 'bg-card/50'}`}
    >
      <div className="flex items-start gap-3">
        <div 
          className="flex items-center gap-2 pt-2 text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
          <span className="text-sm font-medium">{index + 1}.</span>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Input
                value={question.question_text}
                onChange={(e) => onChange({ ...question, question_text: e.target.value })}
                placeholder={t.auto.components_polls_SortableQuestion_155}
                className="bg-background"
              />
            </div>

            <Select
              value={question.question_type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {questionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {needsOptions && (
            <div className="space-y-2 pl-4">
              <Label className="text-xs text-muted-foreground">
                {question.question_type === 'ranking' 
                  ? (t.auto.components_polls_SortableQuestion_192)
                  : (t.auto.components_polls_SortableQuestion_193)}
              </Label>
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 sm:flex-1">
                    <div className="w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center text-xs text-muted-foreground">
                      {String.fromCharCode(65 + optionIndex)}
                    </div>
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                      placeholder={`${t.auto.components_polls_SortableQuestion_203} ${optionIndex + 1} *`}
                      className={`flex-1 min-w-0 bg-background ${!option.trim() ? 'border-destructive/50' : ''}`}
                    />
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveOption(optionIndex, optionIndex - 1)}
                      disabled={optionIndex === 0}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveOption(optionIndex, optionIndex + 1)}
                      disabled={optionIndex === question.options.length - 1}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    {question.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(optionIndex)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddOption}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t.auto.components_polls_SortableQuestion_225}
              </Button>

              {/* Allow Other option toggle */}
              {canHaveOther && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
                  <Switch
                    id={`allow-other-${id}`}
                    checked={question.allow_other ?? false}
                    onCheckedChange={(checked) => onChange({ ...question, allow_other: checked })}
                  />
                  <Label htmlFor={`allow-other-${id}`} className="text-sm text-muted-foreground cursor-pointer">
                    {t.polls?.allowOther}
                  </Label>
                </div>
              )}
            </div>
          )}

          {needsScaleConfig && (
            <div className="space-y-3 pl-4">
              <Label className="text-xs text-muted-foreground">
                {t.auto.components_polls_SortableQuestion_247}
              </Label>
              <div className="space-y-1">
                <Label className="text-xs">{t.polls?.scaleDisplay}</Label>
                <Select
                  value={question.scale_config?.display ?? 'stars'}
                  onValueChange={(value) => handleScaleConfigChange('display', value)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stars">{t.polls?.scaleDisplayStars}</SelectItem>
                    <SelectItem value="slider">{t.polls?.scaleDisplaySlider}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_SortableQuestion_min_label}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={question.scale_config?.min ?? 0}
                    onChange={(e) => {
                      const parsed = Number.parseFloat(e.target.value);
                      handleScaleConfigChange('min', Number.isFinite(parsed) ? parsed : 0);
                    }}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_SortableQuestion_max_label}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={question.scale_config?.max ?? 10}
                    onChange={(e) => {
                      const parsed = Number.parseFloat(e.target.value);
                      handleScaleConfigChange('max', Number.isFinite(parsed) ? parsed : 10);
                    }}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_SortableQuestion_269}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={question.scale_config?.step ?? 1}
                    onChange={(e) => {
                      const parsed = Number.parseFloat(e.target.value);
                      handleScaleConfigChange('step', Number.isFinite(parsed) ? parsed : 1);
                    }}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_SortableQuestion_280}</Label>
                  <Input
                    value={question.scale_config?.min_label || ''}
                    onChange={(e) => handleScaleConfigChange('min_label', e.target.value)}
                    placeholder={t.auto.components_polls_SortableQuestion_284}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_SortableQuestion_289}</Label>
                  <Input
                    value={question.scale_config?.max_label || ''}
                    onChange={(e) => handleScaleConfigChange('max_label', e.target.value)}
                    placeholder={t.auto.components_polls_SortableQuestion_293}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id={`required-${id}`}
              checked={question.is_required}
              onCheckedChange={(checked) => onChange({ ...question, is_required: checked })}
            />
            <Label htmlFor={`required-${id}`} className="text-sm text-muted-foreground cursor-pointer">
              {t.auto.components_polls_SortableQuestion_308}
            </Label>
          </div>

          {/* Conditional question editor */}
          {previousQuestions.length > 0 && (
            <QuestionConditionEditor
              condition={question.condition}
              onChange={handleConditionChange}
              previousQuestions={previousQuestions}
            />
          )}
        </div>
      </div>
    </div>
  );
});

SortableQuestion.displayName = 'SortableQuestion';
