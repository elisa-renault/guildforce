import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, GitBranch } from 'lucide-react';
import type { QuestionCondition, ConditionOperator } from '@/types/poll';

interface QuestionConditionEditorProps {
  condition: QuestionCondition | null | undefined;
  onChange: (condition: QuestionCondition | null) => void;
  previousQuestions: { id: string; text: string; options: string[]; type: string; scaleConfig?: { min: number; max: number } | null }[];
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

  // Filter questions that can be used as condition source (choice-based or numeric)
  const eligibleQuestions = previousQuestions.filter(q => 
    isChoiceType(q.type) || isNumericType(q.type)
  );

  if (eligibleQuestions.length === 0) {
    return null;
  }

  const selectedQuestion = eligibleQuestions.find(q => q.id === condition?.question_id);
  const isSelectedNumeric = selectedQuestion && isNumericType(selectedQuestion.type);

  // Operators for choice questions
  const choiceOperators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: t.auto.components_polls_QuestionConditionEditor_41 },
    { value: 'not_equals', label: t.auto.components_polls_QuestionConditionEditor_42 },
    { value: 'contains', label: t.auto.components_polls_QuestionConditionEditor_43 },
    { value: 'not_contains', label: t.auto.components_polls_QuestionConditionEditor_44 },
  ];

  // Operators for numeric questions (scale/rating)
  const numericOperators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: t.auto.components_polls_QuestionConditionEditor_49 },
    { value: 'not_equals', label: t.auto.components_polls_QuestionConditionEditor_50 },
    { value: 'greater_than', label: t.auto.components_polls_QuestionConditionEditor_51 },
    { value: 'less_than', label: t.auto.components_polls_QuestionConditionEditor_52 },
    { value: 'greater_equals', label: t.auto.components_polls_QuestionConditionEditor_53 },
    { value: 'less_equals', label: t.auto.components_polls_QuestionConditionEditor_54 },
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
    const newQuestion = eligibleQuestions.find(q => q.id === questionId);
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
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
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
        {t.polls?.addCondition || (t.auto.components_polls_QuestionConditionEditor_126)}
      </Button>
    );
  }

  // Get scale/rating range for numeric input hint
  const getNumericRange = () => {
    if (!selectedQuestion) return { min: 1, max: 10 };
    if (selectedQuestion.type === 'rating') return { min: 1, max: 5 };
    if (selectedQuestion.scaleConfig) {
      return { min: selectedQuestion.scaleConfig.min, max: selectedQuestion.scaleConfig.max };
    }
    return { min: 1, max: 10 };
  };

  const numericRange = getNumericRange();

  return (
    <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <GitBranch className="h-4 w-4" />
          {t.polls?.conditionalQuestion || (t.auto.components_polls_QuestionConditionEditor_148)}
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
        <Label className="text-xs text-muted-foreground">
          {t.polls?.showIf || (t.auto.components_polls_QuestionConditionEditor_163)}
        </Label>
        <Select value={condition.question_id} onValueChange={handleQuestionChange}>
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eligibleQuestions.map((q, idx) => (
              <SelectItem key={q.id} value={q.id}>
                {idx + 1}. {q.text.length > 40 ? q.text.slice(0, 40) + '...' : q.text}
                {isNumericType(q.type) && (
                  <span className="text-muted-foreground ml-1">
                    ({q.type === 'rating' ? '★' : '⚖️'})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t.polls?.conditionOperator || (t.auto.components_polls_QuestionConditionEditor_186)}
        </Label>
        <Select value={condition.operator} onValueChange={(v) => handleOperatorChange(v as ConditionOperator)}>
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
          <Label className="text-xs text-muted-foreground">
            {t.polls?.conditionValues || (t.auto.components_polls_QuestionConditionEditor_206)}
          </Label>
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
              {t.polls?.selectAtLeastOneValue || (t.auto.components_polls_QuestionConditionEditor_224)}
            </p>
          )}
        </div>
      )}

      {/* Numeric value input for scale/rating */}
      {selectedQuestion && isNumericType(selectedQuestion.type) && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t.auto.components_polls_QuestionConditionEditor_234}
            <span className="ml-1 text-muted-foreground/70">
              ({numericRange.min} - {numericRange.max})
            </span>
          </Label>
          <Input
            type="number"
            min={numericRange.min}
            max={numericRange.max}
            value={condition.values[0] || ''}
            onChange={(e) => handleNumericValueChange(e.target.value)}
            placeholder={`${numericRange.min} - ${numericRange.max}`}
            className="bg-background w-32"
          />
          {(!condition.values[0] || condition.values[0] === '') && (
            <p className="text-xs text-destructive">
              {t.auto.components_polls_QuestionConditionEditor_250}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
