import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { GlowCard } from '@/components/GlowCard';
import { StarRating } from '@/components/ui/star-rating';
import { Send, Loader2, CheckCircle, Lock } from 'lucide-react';
import { RankingInput } from './RankingInput';
import type { GuildPollQuestion, ResponseValue } from '@/types/poll';

interface PollResponseProps {
  questions: GuildPollQuestion[];
  isAnonymous: boolean;
  onSubmit: (responses: { questionId: string; value: ResponseValue }[]) => Promise<void>;
  saving?: boolean;
  alreadyResponded?: boolean;
}

export const PollResponse = ({
  questions,
  isAnonymous,
  onSubmit,
  saving = false,
  alreadyResponded = false,
}: PollResponseProps) => {
  const { language, t } = useLanguage();
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(() => {
    const initial: Record<string, ResponseValue> = {};
    questions.forEach((q) => {
      if (q.my_response) {
        initial[q.id] = q.my_response.response_value;
      } else {
        switch (q.question_type) {
          case 'single_choice':
            initial[q.id] = { type: 'single_choice', value: '' };
            break;
          case 'multiple_choice':
            initial[q.id] = { type: 'multiple_choice', values: [] };
            break;
          case 'text':
            initial[q.id] = { type: 'text', value: '' };
            break;
          case 'rating':
            initial[q.id] = { type: 'rating', value: 0 };
            break;
          case 'date':
            initial[q.id] = { type: 'date', value: '' };
            break;
          case 'time':
            initial[q.id] = { type: 'time', value: '' };
            break;
          case 'datetime':
            initial[q.id] = { type: 'datetime', value: '' };
            break;
          case 'ranking':
            initial[q.id] = { type: 'ranking', values: [...q.options] };
            break;
          case 'scale':
            initial[q.id] = { type: 'scale', value: 0 };
            break;
        }
      }
    });
    return initial;
  });

  const handleSubmit = async () => {
    const responsesToSubmit = Object.entries(responses).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    await onSubmit(responsesToSubmit);
  };

  const updateResponse = (questionId: string, value: ResponseValue) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const isComplete = questions.every((q) => {
    if (!q.is_required) return true;
    const response = responses[q.id];
    if (!response) return false;
    
    switch (response.type) {
      case 'single_choice':
        return !!response.value;
      case 'multiple_choice':
        return response.values.length > 0;
      case 'text':
        return !!response.value.trim();
      case 'rating':
      case 'scale':
        return response.value >= 0;
      case 'date':
      case 'time':
      case 'datetime':
        return !!response.value;
      case 'ranking':
        return response.values.length > 0;
      default:
        return false;
    }
  });

  return (
    <div className="space-y-6">
      {isAnonymous && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm">
          <Lock className="h-4 w-4" />
          {t.polls?.anonymousDesc}
        </div>
      )}

      {questions.map((question, index) => (
        <GlowCard key={question.id} className="p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <span className="text-primary font-semibold">{index + 1}.</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {question.question_text}
                  {question.is_required && <span className="text-destructive ml-1">*</span>}
                </p>
              </div>
            </div>

            {question.question_type === 'single_choice' && (
              <RadioGroup
                value={(responses[question.id] as { type: 'single_choice'; value: string })?.value || ''}
                onValueChange={(value) => updateResponse(question.id, { type: 'single_choice', value })}
                className="space-y-2 pl-5"
              >
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-3">
                    <RadioGroupItem 
                      value={option} 
                      id={`${question.id}-${optionIndex}`}
                      className="border-primary/50"
                    />
                    <Label 
                      htmlFor={`${question.id}-${optionIndex}`} 
                      className="cursor-pointer text-foreground"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {question.question_type === 'multiple_choice' && (
              <div className="space-y-2 pl-5">
                {question.options.map((option, optionIndex) => {
                  const currentValues = (responses[question.id] as { type: 'multiple_choice'; values: string[] })?.values || [];
                  return (
                    <div key={optionIndex} className="flex items-center gap-3">
                      <Checkbox
                        id={`${question.id}-${optionIndex}`}
                        checked={currentValues.includes(option)}
                        onCheckedChange={(checked) => {
                          const newValues = checked 
                            ? [...currentValues, option]
                            : currentValues.filter((v) => v !== option);
                          updateResponse(question.id, { type: 'multiple_choice', values: newValues });
                        }}
                      />
                      <Label 
                        htmlFor={`${question.id}-${optionIndex}`} 
                        className="cursor-pointer text-foreground"
                      >
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            {question.question_type === 'text' && (
              <Textarea
                value={(responses[question.id] as { type: 'text'; value: string })?.value || ''}
                onChange={(e) => updateResponse(question.id, { type: 'text', value: e.target.value })}
                placeholder={t.polls?.sectionDescription}
                className="bg-background resize-none"
                rows={3}
              />
            )}

            {question.question_type === 'rating' && (
              <div className="pl-5 space-y-3">
                <div className="flex flex-col items-center gap-2">
                  <StarRating
                    value={(responses[question.id] as { type: 'rating'; value: number })?.value ?? 0}
                    onChange={(value) => updateResponse(question.id, { type: 'rating', value })}
                    max={5}
                    allowHalf={true}
                    size="lg"
                  />
                  <div className="text-center">
                    <span className="text-lg font-semibold text-primary">
                      {(responses[question.id] as { type: 'rating'; value: number })?.value ?? 0}
                    </span>
                    <span className="text-muted-foreground"> / 5</span>
                  </div>
                </div>
              </div>
            )}

            {question.question_type === 'date' && (
              <Input
                type="date"
                value={(responses[question.id] as { type: 'date'; value: string })?.value || ''}
                onChange={(e) => updateResponse(question.id, { type: 'date', value: e.target.value })}
                className="bg-background max-w-xs"
              />
            )}

            {question.question_type === 'time' && (
              <Input
                type="time"
                value={(responses[question.id] as { type: 'time'; value: string })?.value || ''}
                onChange={(e) => updateResponse(question.id, { type: 'time', value: e.target.value })}
                className="bg-background max-w-xs"
              />
            )}

            {question.question_type === 'datetime' && (
              <Input
                type="datetime-local"
                value={(responses[question.id] as { type: 'datetime'; value: string })?.value || ''}
                onChange={(e) => updateResponse(question.id, { type: 'datetime', value: e.target.value })}
                className="bg-background max-w-xs"
              />
            )}

            {question.question_type === 'scale' && (
              <div className="pl-5 space-y-3">
                {question.scale_config?.min_label || question.scale_config?.max_label ? (
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    {question.scale_config?.min_label && <span>{question.scale_config.min_label}</span>}
                    <span>—</span>
                    {question.scale_config?.max_label && <span>{question.scale_config.max_label}</span>}
                  </div>
                ) : null}
                <div className="flex flex-col items-center gap-2">
                  <StarRating
                    value={(responses[question.id] as { type: 'scale'; value: number })?.value ?? 0}
                    onChange={(value) => updateResponse(question.id, { type: 'scale', value })}
                    max={question.scale_config?.max || 5}
                    allowHalf={true}
                    size="lg"
                  />
                  <div className="text-center">
                    <span className="text-lg font-semibold text-primary">
                      {(responses[question.id] as { type: 'scale'; value: number })?.value ?? 0}
                    </span>
                    <span className="text-muted-foreground"> / {question.scale_config?.max || 5}</span>
                  </div>
                </div>
              </div>
            )}

            {question.question_type === 'ranking' && (
              <div className="pl-5">
                <RankingInput
                  items={(responses[question.id] as { type: 'ranking'; values: string[] })?.values || question.options}
                  onChange={(newItems) => updateResponse(question.id, { type: 'ranking', values: newItems })}
                />
              </div>
            )}
          </div>
        </GlowCard>
      ))}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {alreadyResponded && (
          <div className="flex items-center gap-2 text-green-400 text-sm sm:mr-auto">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{t.polls?.alreadyResponded}</span>
          </div>
        )}
        
        <Button 
          onClick={handleSubmit}
          disabled={!isComplete || saving}
          size="lg"
          className="w-full sm:w-auto"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {alreadyResponded ? t.polls?.updateResponses : t.polls?.submitResponses}
        </Button>
      </div>
    </div>
  );
};
