import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, GitBranch } from 'lucide-react';
import type { QuestionCondition, ConditionOperator } from '@/types/poll';
import { resolveSemanticMessage } from '@/i18n/semantic';

interface QuestionConditionEditorProps {
  condition: QuestionCondition | null | undefined;
  onChange: (condition: QuestionCondition | null) => void;
  previousQuestions: {
    id: string;
    text: string;
    options: string[];
    type: string;
    scaleConfig?: { min: number; max: number; step?: number } | null;
  }[];
}

// Helper to determine if a question type supports conditions
const isChoiceType = (type: string) => type === 'single_choice' || type === 'multiple_choice';
const isNumericType = (type: string) => type === 'scale' || type === 'rating';

export const QuestionConditionEditor = ({
  condition,
  onChange,
  previousQuestions,
}: QuestionConditionEditorProps) => {
  const { t, language } = useLanguage();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

  // Filter questions that can be used as condition source (choice-based or numeric)
  const eligibleQuestions = previousQuestions.filter((q) => isChoiceType(q.type) || isNumericType(q.type));

  if (eligibleQuestions.length === 0) {
    return null;
  }

  const selectedQuestion = eligibleQuestions.find((q) => q.id === condition?.question_id);
  const isSelectedNumeric = selectedQuestion && isNumericType(selectedQuestion.type);

  // Operators for choice questions
  const choiceOperators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: sm('polls.condition.operator.equals') },
    { value: 'not_equals', label: sm('polls.condition.operator.not_equals') },
    { value: 'contains', label: sm('polls.condition.operator.contains') },
    { value: 'not_contains', label: sm('polls.condition.operator.not_contains') },
  ];

  // Operators for numeric questions (scale/rating)
  const numericOperators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: sm('polls.condition.operator.equals') },
    { value: 'not_equals', label: sm('polls.condition.operator.not_equals') },
    { value: 'greater_than', label: sm('polls.condition.operator.greater_than') },
    { value: 'less_than', label: sm('polls.condition.operator.less_than') },
    { value: 'greater_equals', label: sm('polls.condition.operator.greater_equals') },
    { value: 'less_equals', label: sm('polls.condition.operator.less_equals') },
  ];

  const operators = isSelectedNumeric ? numericOperators : choiceOperators;

  const handleAddCondition = () => {
    if (eligibleQuestions.length > 0) {
      const firstQ = eligibleQuestions[0];
      const isNumeric = isNumericType(firstQ.type);
      onChange({
        question_id: firstQ.id,
        operator: 'equals',
        values: isNumeric ? [''] : [],
      });
    }
  };

  const handleRemoveCondition = () => {
    onChange(null);
  };

  const handleQuestionChange = (questionId: string) => {
    const newQuestion = eligibleQuestions.find((q) => q.id === questionId);
    const isNumeric = newQuestion && isNumericType(newQuestion.type);

    // Reset operator if switching between numeric and choice
    const currentIsNumeric = selectedQuestion && isNumericType(selectedQuestion.type);
    const needsOperatorReset = isNumeric !== currentIsNumeric;

    onChange({
      ...condition!,
      question_id: questionId,
      operator: needsOperatorReset ? 'equals' : condition!.operator,
      values: isNumeric ? [''] : [], // Reset values when question changes
    });
  };

  const handleOperatorChange = (operator: ConditionOperator) => {
    onChange({
      ...condition!,
      operator,
    });
  };

  const handleValueToggle = (value: string, checked: boolean) => {
    const currentValues = condition?.values || [];
    const newValues = checked ? [...currentValues, value] : currentValues.filter((v) => v !== value);
    onChange({
      ...condition!,
      values: newValues,
    });
  };

  const handleNumericValueChange = (value: string) => {
    onChange({
      ...condition!,
      values: [value],
    });
  };

  if (!condition) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleAddCondition}
        className="text-muted-foreground hover:text-primary"
      >
        <GitBranch className="h-4 w-4 mr-1" />
        {t.polls.addCondition}
      </Button>
    );
  }

  // Get scale/rating range for numeric input hint
  const getNumericRange = () => {
    if (!selectedQuestion) return { min: 0, max: 10, step: 1 };
    if (selectedQuestion.type === 'rating') return { min: 0, max: 5, step: 0.5 };
    if (selectedQuestion.scaleConfig) {
      return {
        min: selectedQuestion.scaleConfig.min,
        max: selectedQuestion.scaleConfig.max,
        step: selectedQuestion.scaleConfig.step ?? 1,
      };
    }
    return { min: 0, max: 10, step: 1 };
  };

  const numericRange = getNumericRange();

  return (
    <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <GitBranch className="h-4 w-4" />
          {t.polls.conditionalQuestion}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemoveCondition}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t.polls.showIf}</Label>
        <Select value={condition.question_id} onValueChange={handleQuestionChange}>
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eligibleQuestions.map((q, idx) => (
              <SelectItem key={q.id} value={q.id}>
                {idx + 1}. {q.text.length > 40 ? `${q.text.slice(0, 40)}...` : q.text}
                {isNumericType(q.type) && (
                  <span className="text-muted-foreground ml-1">
                    ({q.type === 'rating' ? 'stars' : 'scale'})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">{t.polls.conditionOperator}</Label>
        <Select value={condition.operator} onValueChange={(value) => handleOperatorChange(value as ConditionOperator)}>
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Choice-based value selection */}
      {selectedQuestion && isChoiceType(selectedQuestion.type) && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t.polls.conditionValues}</Label>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedQuestion.options.map((option, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Checkbox
                  id={`condition-${option}`}
                  checked={condition.values.includes(option)}
                  onCheckedChange={(checked) => handleValueToggle(option, !!checked)}
                />
                <Label htmlFor={`condition-${option}`} className="text-sm cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
          {condition.values.length === 0 && (
            <p className="text-xs text-destructive">
              {t.polls.selectAtLeastOneValue}
            </p>
          )}
        </div>
      )}

      {/* Numeric value input for scale/rating */}
      {selectedQuestion && isNumericType(selectedQuestion.type) && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {sm('polls.condition.numeric_value_label')}
            <span className="ml-1 text-muted-foreground/70">
              ({numericRange.min} - {numericRange.max})
            </span>
          </Label>
          <Input
            type="number"
            min={numericRange.min}
            max={numericRange.max}
            step={numericRange.step}
            value={condition.values[0] || ''}
            onChange={(event) => handleNumericValueChange(event.target.value)}
            placeholder={`${numericRange.min} - ${numericRange.max}`}
            className="bg-background w-32"
          />
          {(!condition.values[0] || condition.values[0] === '') && (
            <p className="text-xs text-destructive">{sm('polls.condition.numeric_value_required')}</p>
          )}
        </div>
      )}
    </div>
  );
};
