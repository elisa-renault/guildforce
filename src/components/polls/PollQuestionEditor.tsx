import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Plus, Trash2, X } from 'lucide-react';
import type { QuestionFormData, PollQuestionType, ScaleConfig } from '@/types/poll';

interface PollQuestionEditorProps {
  question: QuestionFormData;
  index: number;
  onChange: (question: QuestionFormData) => void;
  onRemove: () => void;
  canRemove: boolean;
  compact?: boolean;
}

export const PollQuestionEditor = ({
  question,
  index,
  onChange,
  onRemove,
  canRemove,
  compact = false,
}: PollQuestionEditorProps) => {
  const { language } = useLanguage();

  const questionTypes: { value: PollQuestionType; label: string }[] = [
    { value: 'single_choice', label: language === 'fr' ? 'Choix unique' : 'Single choice' },
    { value: 'multiple_choice', label: language === 'fr' ? 'Choix multiples' : 'Multiple choice' },
    { value: 'text', label: language === 'fr' ? 'Texte libre' : 'Free text' },
    { value: 'rating', label: language === 'fr' ? 'Échelle (1-5)' : 'Rating (1-5)' },
    { value: 'date', label: language === 'fr' ? 'Date' : 'Date' },
    { value: 'time', label: language === 'fr' ? 'Heure' : 'Time' },
    { value: 'datetime', label: language === 'fr' ? 'Date et heure' : 'Date & Time' },
    { value: 'ranking', label: language === 'fr' ? 'Classement' : 'Ranking' },
    { value: 'scale', label: language === 'fr' ? 'Échelle personnalisée' : 'Custom Scale' },
  ];

  const needsOptions = question.question_type === 'single_choice' || 
                       question.question_type === 'multiple_choice' || 
                       question.question_type === 'ranking';

  const needsScaleConfig = question.question_type === 'scale';

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
    
    onChange({ 
      ...question, 
      question_type: value,
      options: needsOpts 
        ? (question.options.length > 0 ? question.options : ['', ''])
        : [],
      scale_config: needsScale 
        ? (question.scale_config || { min: 1, max: 10, step: 1, min_label: '', max_label: '' })
        : null,
    });
  };

  const handleScaleConfigChange = (field: keyof ScaleConfig, value: string | number) => {
    const currentConfig = question.scale_config || { min: 1, max: 10, step: 1 };
    onChange({
      ...question,
      scale_config: { ...currentConfig, [field]: value },
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
                placeholder={language === 'fr' ? 'Votre question...' : 'Your question...'}
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
                  ? (language === 'fr' ? 'Éléments à classer' : 'Items to rank')
                  : (language === 'fr' ? 'Options de réponse' : 'Answer options')}
              </Label>
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center text-xs text-muted-foreground">
                    {String.fromCharCode(65 + optionIndex)}
                  </div>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                    placeholder={`${language === 'fr' ? 'Option' : 'Option'} ${optionIndex + 1} *`}
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
                {language === 'fr' ? 'Ajouter une option' : 'Add option'}
              </Button>
            </div>
          )}

          {needsScaleConfig && (
            <div className="space-y-3 pl-4">
              <Label className="text-xs text-muted-foreground">
                {language === 'fr' ? 'Configuration de l\'échelle' : 'Scale Configuration'}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Min</Label>
                  <Input
                    type="number"
                    value={question.scale_config?.min || 1}
                    onChange={(e) => handleScaleConfigChange('min', parseInt(e.target.value) || 1)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max</Label>
                  <Input
                    type="number"
                    value={question.scale_config?.max || 10}
                    onChange={(e) => handleScaleConfigChange('max', parseInt(e.target.value) || 10)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{language === 'fr' ? 'Pas' : 'Step'}</Label>
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
                  <Label className="text-xs">{language === 'fr' ? 'Label min' : 'Min label'}</Label>
                  <Input
                    value={question.scale_config?.min_label || ''}
                    onChange={(e) => handleScaleConfigChange('min_label', e.target.value)}
                    placeholder={language === 'fr' ? 'Ex: Pas du tout' : 'Ex: Not at all'}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{language === 'fr' ? 'Label max' : 'Max label'}</Label>
                  <Input
                    value={question.scale_config?.max_label || ''}
                    onChange={(e) => handleScaleConfigChange('max_label', e.target.value)}
                    placeholder={language === 'fr' ? 'Ex: Totalement' : 'Ex: Completely'}
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
              {language === 'fr' ? 'Réponse obligatoire' : 'Required'}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};
