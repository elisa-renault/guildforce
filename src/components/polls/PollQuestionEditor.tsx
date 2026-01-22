import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import { QuestionConditionEditor } from './QuestionConditionEditor';
import type { QuestionFormData, PollQuestionType, ScaleConfig, QuestionCondition } from '@/types/poll';

interface PollQuestionEditorProps {
  question: QuestionFormData;
  index: number;
  onChange: (question: QuestionFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  compact?: boolean;
  previousQuestions?: { id: string; text: string; options: string[]; type: string }[];
}

export const PollQuestionEditor = ({
  question,
  index,
  onChange,
  onRemove,
  canRemove,
  compact = false,
  previousQuestions = [],
}: PollQuestionEditorProps) => {
  const { language, t } = useLanguage();

  const questionTypes: { value: PollQuestionType; label: string }[] = [
    { value: 'single_choice', label: t.auto.components_polls_PollQuestionEditor_33 },
    { value: 'multiple_choice', label: t.auto.components_polls_PollQuestionEditor_34 },
    { value: 'text', label: t.auto.components_polls_PollQuestionEditor_35 },
    { value: 'rating', label: t.auto.components_polls_PollQuestionEditor_36 },
    { value: 'date', label: t.auto.components_polls_PollQuestionEditor_37 },
    { value: 'time', label: t.auto.components_polls_PollQuestionEditor_38 },
    { value: 'datetime', label: t.auto.components_polls_PollQuestionEditor_39 },
    { value: 'ranking', label: t.auto.components_polls_PollQuestionEditor_40 },
    { value: 'scale', label: t.auto.components_polls_PollQuestionEditor_41 },
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
        ? (question.scale_config || { min: 1, max: 10, step: 1, min_label: '', max_label: '' })
        : null,
      // Reset allow_other if type doesn't support it
      allow_other: canOther ? question.allow_other : false,
    });
  };

  const handleScaleConfigChange = (field: keyof ScaleConfig, value: string | number) => {
    const currentConfig = question.scale_config || { min: 1, max: 10, step: 1 };
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
    <div className={`border border-border rounded-lg p-4 ${compact ? 'bg-background/50' : 'bg-card/50'}`}>
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 pt-2 text-muted-foreground">
          <GripVertical className="h-5 w-5 cursor-grab" />
          <span className="text-sm font-medium">{index + 1}.</span>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <Input
                value={question.question_text}
                onChange={(e) => onChange({ ...question, question_text: e.target.value })}
                placeholder={t.auto.components_polls_PollQuestionEditor_125}
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
                  ? (t.auto.components_polls_PollQuestionEditor_162)
                  : (t.auto.components_polls_PollQuestionEditor_163)}
              </Label>
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center text-xs text-muted-foreground">
                    {String.fromCharCode(65 + optionIndex)}
                  </div>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                    placeholder={`${t.auto.components_polls_PollQuestionEditor_173} ${optionIndex + 1} *`}
                    className={`flex-1 bg-background ${!option.trim() ? 'border-destructive/50' : ''}`}
                  />
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
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddOption}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t.auto.components_polls_PollQuestionEditor_195}
              </Button>

              {/* Allow Other option toggle */}
              {canHaveOther && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
                  <Switch
                    id={`allow-other-${index}`}
                    checked={question.allow_other ?? false}
                    onCheckedChange={(checked) => onChange({ ...question, allow_other: checked })}
                  />
                  <Label htmlFor={`allow-other-${index}`} className="text-sm text-muted-foreground cursor-pointer">
                    {t.polls?.allowOther}
                  </Label>
                </div>
              )}
            </div>
          )}

          {needsScaleConfig && (
            <div className="space-y-3 pl-4">
              <Label className="text-xs text-muted-foreground">
                {t.auto.components_polls_PollQuestionEditor_217}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_PollQuestionEditor_min_label}</Label>
                  <Input
                    type="number"
                    value={question.scale_config?.min || 1}
                    onChange={(e) => handleScaleConfigChange('min', parseInt(e.target.value) || 1)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_PollQuestionEditor_max_label}</Label>
                  <Input
                    type="number"
                    value={question.scale_config?.max || 10}
                    onChange={(e) => handleScaleConfigChange('max', parseInt(e.target.value) || 10)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_PollQuestionEditor_239}</Label>
                  <Input
                    type="number"
                    value={question.scale_config?.step || 1}
                    onChange={(e) => handleScaleConfigChange('step', parseInt(e.target.value) || 1)}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_PollQuestionEditor_250}</Label>
                  <Input
                    value={question.scale_config?.min_label || ''}
                    onChange={(e) => handleScaleConfigChange('min_label', e.target.value)}
                    placeholder={t.auto.components_polls_PollQuestionEditor_254}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.auto.components_polls_PollQuestionEditor_259}</Label>
                  <Input
                    value={question.scale_config?.max_label || ''}
                    onChange={(e) => handleScaleConfigChange('max_label', e.target.value)}
                    placeholder={t.auto.components_polls_PollQuestionEditor_263}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id={`required-${index}`}
              checked={question.is_required}
              onCheckedChange={(checked) => onChange({ ...question, is_required: checked })}
            />
            <Label htmlFor={`required-${index}`} className="text-sm text-muted-foreground cursor-pointer">
              {t.auto.components_polls_PollQuestionEditor_278}
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
};
