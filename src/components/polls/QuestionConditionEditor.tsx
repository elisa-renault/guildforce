import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, GitBranch } from 'lucide-react';
import type { QuestionFormData, QuestionCondition, ConditionOperator } from '@/types/poll';

interface QuestionConditionEditorProps {
  condition: QuestionCondition | null | undefined;
  onChange: (condition: QuestionCondition | null) => void;
  previousQuestions: { id: string; text: string; options: string[]; type: string }[];
}

export const QuestionConditionEditor = ({
  condition,
  onChange,
  previousQuestions,
}: QuestionConditionEditorProps) => {
  const { t, language } = useLanguage();

  // Filter questions that can be used as condition source (choice-based)
  const eligibleQuestions = previousQuestions.filter(q => 
    q.type === 'single_choice' || q.type === 'multiple_choice'
  );

  if (eligibleQuestions.length === 0) {
    return null;
  }

  const operators: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: language === 'fr' ? 'est égal à' : 'equals' },
    { value: 'not_equals', label: language === 'fr' ? 'est différent de' : 'is not equal to' },
    { value: 'contains', label: language === 'fr' ? 'contient' : 'contains' },
    { value: 'not_contains', label: language === 'fr' ? 'ne contient pas' : 'does not contain' },
  ];

  const handleAddCondition = () => {
    if (eligibleQuestions.length > 0) {
      onChange({
        question_id: eligibleQuestions[0].id,
        operator: 'equals',
        values: [],
      });
    }
  };

  const handleRemoveCondition = () => {
    onChange(null);
  };

  const handleQuestionChange = (questionId: string) => {
    onChange({
      ...condition!,
      question_id: questionId,
      values: [], // Reset values when question changes
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

  const selectedQuestion = eligibleQuestions.find(q => q.id === condition?.question_id);

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
        {t.polls?.addCondition || (language === 'fr' ? 'Ajouter une condition' : 'Add condition')}
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <GitBranch className="h-4 w-4" />
          {t.polls?.conditionalQuestion || (language === 'fr' ? 'Question conditionnelle' : 'Conditional question')}
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
          {t.polls?.showIf || (language === 'fr' ? 'Afficher si la question' : 'Show if question')}
        </Label>
        <Select value={condition.question_id} onValueChange={handleQuestionChange}>
          <SelectTrigger className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eligibleQuestions.map((q, idx) => (
              <SelectItem key={q.id} value={q.id}>
                {idx + 1}. {q.text.length > 40 ? q.text.slice(0, 40) + '...' : q.text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t.polls?.conditionOperator || (language === 'fr' ? 'Opérateur' : 'Operator')}
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

      {selectedQuestion && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t.polls?.conditionValues || (language === 'fr' ? 'Valeurs' : 'Values')}
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
              {t.polls?.selectAtLeastOneValue || (language === 'fr' ? 'Sélectionnez au moins une valeur' : 'Select at least one value')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
