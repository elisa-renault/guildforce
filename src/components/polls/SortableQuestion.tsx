import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlignLeft, Calendar, CalendarClock, CheckSquare, Clock, GripHorizontal, ListOrdered, SlidersHorizontal, Star, CircleDot, Plus, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import { QuestionConditionEditor } from './QuestionConditionEditor';
import type { QuestionFormData, PollQuestionType, ScaleConfig, QuestionCondition } from '@/types/poll';
import { resolveSemanticMessage } from '@/i18n/semantic';

interface SortableQuestionProps {
  question: QuestionFormData;
  index: number;
  onChange: (question: QuestionFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  compact?: boolean;
  id: string;
  previousQuestions?: { id: string; text: string; options: string[]; type: string; scaleConfig?: { min: number; max: number; step?: number } | null }[];
  isActive?: boolean;
  onActivate?: () => void;
}

export const SortableQuestion = forwardRef<HTMLDivElement, SortableQuestionProps>(({
  question,
  onChange,
  onRemove,
  canRemove,
  compact = false,
  id,
  previousQuestions = [],
  isActive = false,
  onActivate,
}, outerRef) => {
  const { language, t } = useLanguage();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

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

  const questionTypes: { value: PollQuestionType; label: string; Icon: typeof AlignLeft }[] = [
    { value: 'single_choice', label: sm('polls.sortable.type.single_choice'), Icon: CircleDot },
    { value: 'multiple_choice', label: sm('polls.sortable.type.multiple_choice'), Icon: CheckSquare },
    { value: 'text', label: sm('polls.sortable.type.text'), Icon: AlignLeft },
    { value: 'rating', label: sm('polls.sortable.type.rating'), Icon: Star },
    { value: 'scale', label: sm('polls.sortable.type.scale'), Icon: SlidersHorizontal },
    { value: 'ranking', label: sm('polls.sortable.type.ranking'), Icon: ListOrdered },
    { value: 'date', label: sm('polls.sortable.type.date'), Icon: Calendar },
    { value: 'time', label: sm('polls.sortable.type.time'), Icon: Clock },
    { value: 'datetime', label: sm('polls.sortable.type.datetime'), Icon: CalendarClock },
  ];

  const needsOptions = question.question_type === 'single_choice' || 
                       question.question_type === 'multiple_choice' || 
                       question.question_type === 'ranking';

  const needsScaleConfig = question.question_type === 'scale';

  // "Other" option is only for single/multiple choice (not ranking)
  const canHaveOther = question.question_type === 'single_choice' || 
                       question.question_type === 'multiple_choice';

  const typeLabel = questionTypes.find((type) => type.value === question.question_type)?.label ?? question.question_type;
  const optionPreview = question.options.filter((option) => option.trim()).slice(0, 3);
  const optionSummaryText = optionPreview.length > 0
    ? optionPreview.join(' / ')
    : sm('polls.sortable.answer_options_label');
  const scaleMin = question.scale_config?.min ?? 0;
  const scaleMax = question.scale_config?.max ?? 10;
  const previewText = needsOptions
    ? optionSummaryText
    : question.question_type === 'text'
      ? (t.polls?.textResponsePlaceholder ?? 'Your answer...')
      : question.question_type === 'scale'
        ? `${scaleMin} to ${scaleMax}`
        : question.question_type === 'rating'
          ? (t.polls?.scaleDisplayStars ?? 'Stars')
          : typeLabel;

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
      className={`border rounded-lg p-2 sm:p-4 transition-[transform,border-color,box-shadow] duration-150 ease-out ${
        compact ? 'bg-background/50' : 'bg-card/50'
      } ${isActive ? 'border-primary/40 shadow-sm' : 'border-border'} ${
        isDragging ? 'h-2 p-0 border-transparent bg-transparent overflow-hidden shadow-none' : ''
      }`}
      onClick={() => onActivate?.()}
      role={isActive ? undefined : 'button'}
      tabIndex={isActive ? -1 : 0}
      onKeyDown={(event) => {
        if (!isActive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onActivate?.();
        }
      }}
    >
      <div className="space-y-2 sm:space-y-3">
        <div 
          className="flex justify-center text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripHorizontal className="h-5 w-5" />
        </div>

        <div className="space-y-2 sm:space-y-3">
          <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              {isActive ? (
                <Textarea
                  value={question.question_text}
                  onChange={(e) => onChange({ ...question, question_text: e.target.value })}
                  placeholder={sm('polls.sortable.question_placeholder')}
                  autoResize
                  className="bg-background resize-y min-h-9 py-2"
                  rows={1}
                  onFocus={() => onActivate?.()}
                />
              ) : (
                <div className="min-h-[38px] rounded-md border border-transparent bg-background/50 px-3 py-2 text-sm text-foreground">
                  {question.question_text.trim() || sm('polls.sortable.question_placeholder')}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              {isActive ? (
                <Select
                  value={question.question_type}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="pl-3 [&>span:first-child]:hidden">
                    <span className="flex items-center gap-2">
                      <type.Icon className="h-4 w-4 text-muted-foreground" />
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              ) : (
                <Badge variant="secondary">{typeLabel}</Badge>
              )}

              {canRemove && isActive && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {!isActive && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span className="truncate">{previewText}</span>
              {question.is_required && (
                <Badge variant="outline">
                  {sm('polls.sortable.required_answer')}
                </Badge>
              )}
              {question.condition && (
                <Badge variant="outline">
                  {t.polls?.conditionalBadge ?? 'Conditional'}
                </Badge>
              )}
            </div>
          )}

          {isActive && needsOptions && (
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs text-muted-foreground">
                {question.question_type === 'ranking' 
                  ? (sm('polls.sortable.ranking_items_label'))
                  : (sm('polls.sortable.answer_options_label'))}
              </Label>
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 sm:flex-1">
                    <div className="w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center text-xs text-muted-foreground">
                      {String.fromCharCode(65 + optionIndex)}
                    </div>
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                      placeholder={`${sm('polls.sortable.option_prefix')} ${optionIndex + 1} *`}
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
                {sm('polls.sortable.add_option')}
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

          {isActive && needsScaleConfig && (
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs text-muted-foreground">
                {sm('polls.sortable.scale_settings')}
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
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{sm('polls.sortable.min_value_label')}</Label>
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
                  <Label className="text-xs">{sm('polls.sortable.max_value_label')}</Label>
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
                  <Label className="text-xs">{sm('polls.sortable.step_label')}</Label>
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
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{sm('polls.sortable.min_label_field')}</Label>
                  <Input
                    value={question.scale_config?.min_label || ''}
                    onChange={(e) => handleScaleConfigChange('min_label', e.target.value)}
                    placeholder={sm('polls.sortable.min_label_placeholder')}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{sm('polls.sortable.max_label_field')}</Label>
                  <Input
                    value={question.scale_config?.max_label || ''}
                    onChange={(e) => handleScaleConfigChange('max_label', e.target.value)}
                    placeholder={sm('polls.sortable.max_label_placeholder')}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          {isActive && (
            <div className="flex items-center gap-2">
              <Switch
                id={`required-${id}`}
                checked={question.is_required}
                onCheckedChange={(checked) => onChange({ ...question, is_required: checked })}
              />
              <Label htmlFor={`required-${id}`} className="text-sm text-muted-foreground cursor-pointer">
                {sm('polls.sortable.required_answer')}
              </Label>
            </div>
          )}

          {/* Conditional question editor */}
          {isActive && previousQuestions.length > 0 && (
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
