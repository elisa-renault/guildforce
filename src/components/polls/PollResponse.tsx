import { Send, Loader2, CheckCircle, Lock, GitBranch } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { RankingInput } from './RankingInput';
import type { GuildPollQuestion, QuestionCondition, ResponseValue } from '@/types/poll';

import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { StarRating } from '@/components/ui/star-rating';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { clampScaleValue, formatScaleValue, getScaleConfig, roundToStep } from '@/lib/pollScale';
import { OTHER_OPTION_VALUE } from '@/types/poll';


interface PollResponseProps {
  questions: GuildPollQuestion[];
  isAnonymous: boolean;
  onSubmit: (responses: { questionId: string; value: ResponseValue }[]) => Promise<void>;
  saving?: boolean;
  alreadyResponded?: boolean;
  readOnly?: boolean;
}

// Evaluate if a condition is met based on current responses
const evaluateCondition = (
  condition: QuestionCondition,
  responses: Record<string, ResponseValue>,
  touched: Record<string, boolean>
): boolean => {
  const sourceResponse = responses[condition.question_id];
  if (!sourceResponse) return false;

  // Handle numeric types (scale/rating)
  if (sourceResponse.type === 'scale' || sourceResponse.type === 'rating') {
    if (!touched[condition.question_id]) return false;
    const numericValue = sourceResponse.value;
    const threshold = parseFloat(condition.values[0]);
    
    if (isNaN(threshold)) return false;

    switch (condition.operator) {
      case 'equals':
        return numericValue === threshold;
      case 'not_equals':
        return numericValue !== threshold;
      case 'greater_than':
        return numericValue > threshold;
      case 'less_than':
        return numericValue < threshold;
      case 'greater_equals':
        return numericValue >= threshold;
      case 'less_equals':
        return numericValue <= threshold;
      default:
        return false;
    }
  }

  // Handle choice types
  let selectedValues: string[] = [];
  
  if (sourceResponse.type === 'single_choice') {
    // Handle "Other" option
    selectedValues = sourceResponse.value === OTHER_OPTION_VALUE 
      ? [OTHER_OPTION_VALUE] 
      : [sourceResponse.value];
  } else if (sourceResponse.type === 'multiple_choice') {
    selectedValues = [...sourceResponse.values];
  } else {
    // Non-supported types
    return false;
  }

  if (selectedValues.length === 0) return false;

  switch (condition.operator) {
    case 'equals':
      // At least one of the condition values matches a selected value
      return condition.values.some(v => selectedValues.includes(v));
    case 'not_equals':
      // None of the condition values match selected values
      return !condition.values.some(v => selectedValues.includes(v));
    case 'contains':
      // All condition values are in selected values
      return condition.values.every(v => selectedValues.includes(v));
    case 'not_contains':
      // None of the condition values are in selected values
      return !condition.values.some(v => selectedValues.includes(v));
    default:
      return false;
  }
};

export const PollResponse = ({
  questions,
  isAnonymous,
  onSubmit,
  saving = false,
  alreadyResponded = false,
  readOnly = false,
}: PollResponseProps) => {
  const { t } = useLanguage();
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(() => {
    const initial: Record<string, ResponseValue> = {};
    questions.forEach((q) => {
      if (q.my_response) {
        initial[q.id] = q.my_response.response_value;
      } else {
        switch (q.question_type) {
          case 'single_choice':
            initial[q.id] = { type: 'single_choice', value: '', other_text: '' };
            break;
          case 'multiple_choice':
            initial[q.id] = { type: 'multiple_choice', values: [], other_text: '' };
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
            initial[q.id] = { type: 'scale', value: q.scale_config?.min ?? 0 };
            break;
        }
      }
    });
    return initial;
  });
  const [touchedQuestions, setTouchedQuestions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    questions.forEach((q) => {
      if (q.my_response) {
        initial[q.id] = true;
      }
    });
    return initial;
  });

  // Track which questions have "Other" selected
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    questions.forEach((q) => {
      if (q.my_response) {
        const resp = q.my_response.response_value as ResponseValue & { other_text?: string };
        if (resp.other_text) {
          initial[q.id] = resp.other_text;
        }
      }
    });
    return initial;
  });

  // Compute visible questions based on conditions
  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.condition) return true; // No condition = always visible
      return evaluateCondition(q.condition, responses, touchedQuestions);
    });
  }, [questions, responses, touchedQuestions]);

  const updateResponse = useCallback((questionId: string, value: ResponseValue) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
    setTouchedQuestions((prev) => ({ ...prev, [questionId]: true }));
  }, []);

  const updateOtherText = useCallback((questionId: string, text: string) => {
    setOtherTexts((prev) => ({ ...prev, [questionId]: text }));
  }, []);

  const handleSubmit = async () => {
    // Only submit responses for visible questions
    const responsesToSubmit = visibleQuestions.map((q) => {
      const response = responses[q.id];
      // Attach other_text if applicable
      if (q.allow_other && otherTexts[q.id]) {
        if (response.type === 'single_choice' && response.value === OTHER_OPTION_VALUE) {
          return { questionId: q.id, value: { ...response, other_text: otherTexts[q.id] } };
        }
        if (response.type === 'multiple_choice' && response.values.includes(OTHER_OPTION_VALUE)) {
          return { questionId: q.id, value: { ...response, other_text: otherTexts[q.id] } };
        }
      }
      return { questionId: q.id, value: response };
    });
    await onSubmit(responsesToSubmit);
  };

  // Check if all visible required questions are answered
  const isComplete = visibleQuestions.every((q) => {
    if (!q.is_required) return true;
    const response = responses[q.id];
    if (!response) return false;
    
    switch (response.type) {
      case 'single_choice':
        // If "Other" is selected, check that other_text is filled
        if (response.value === OTHER_OPTION_VALUE) {
          return !!(otherTexts[q.id]?.trim());
        }
        return !!response.value;
      case 'multiple_choice':
        // If "Other" is in values, check that other_text is filled
        if (response.values.includes(OTHER_OPTION_VALUE)) {
          return response.values.length > 0 && !!(otherTexts[q.id]?.trim());
        }
        return response.values.length > 0;
      case 'text':
        return !!response.value.trim();
      case 'rating':
      case 'scale':
        return !!touchedQuestions[q.id];
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

  // Get index in full question list for display
  const getQuestionDisplayIndex = (questionId: string) => {
    return questions.findIndex(q => q.id === questionId) + 1;
  };

  return (
    <div className="space-y-4">
      {isAnonymous && (
        <div className="inline-flex max-w-full items-center gap-2 rounded border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <Lock className="h-4 w-4 shrink-0" />
          {t.polls?.anonymousDesc}
        </div>
      )}

      {visibleQuestions.map((question) => {
        const hasCondition = !!question.condition;
        
        return (
          <GlowCard key={question.id} surface="section" hoverable={false} className="p-3 md:p-3">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-primary font-medium">{getQuestionDisplayIndex(question.id)}.</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium leading-5 text-foreground">
                      {question.question_text}
                      {question.is_required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    {hasCondition && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {t.polls?.conditionalBadge}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {question.question_type === 'single_choice' && (
                <div className="space-y-2 pl-5">
                  <RadioGroup
                    value={(responses[question.id] as { type: 'single_choice'; value: string })?.value || ''}
                    onValueChange={(value) => updateResponse(question.id, { type: 'single_choice', value })}
                    disabled={readOnly}
                    className="space-y-2"
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
                          className="cursor-pointer text-sm text-foreground"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                    {/* "Other" option */}
                    {question.allow_other && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem 
                            value={OTHER_OPTION_VALUE} 
                            id={`${question.id}-other`}
                            className="border-primary/50"
                          />
                          <Label 
                            htmlFor={`${question.id}-other`} 
                            className="cursor-pointer text-sm text-foreground"
                          >
                            {t.polls?.otherSpecify}
                          </Label>
                        </div>
                        {(responses[question.id] as { type: 'single_choice'; value: string })?.value === OTHER_OPTION_VALUE && (
                          <Input
                            value={otherTexts[question.id] || ''}
                            onChange={(e) => updateOtherText(question.id, e.target.value)}
                            placeholder={t.polls?.otherPlaceholder}
                            className="ml-7 max-w-sm bg-background"
                            maxLength={100}
                            disabled={readOnly}
                          />
                        )}
                      </div>
                    )}
                  </RadioGroup>
                </div>
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
                          disabled={readOnly}
                          onCheckedChange={(checked) => {
                            const newValues = checked 
                              ? [...currentValues, option]
                              : currentValues.filter((v) => v !== option);
                            updateResponse(question.id, { type: 'multiple_choice', values: newValues });
                          }}
                        />
                        <Label 
                          htmlFor={`${question.id}-${optionIndex}`} 
                          className="cursor-pointer text-sm text-foreground"
                        >
                          {option}
                        </Label>
                      </div>
                    );
                  })}
                  {/* "Other" option */}
                  {question.allow_other && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`${question.id}-other`}
                          checked={((responses[question.id] as { type: 'multiple_choice'; values: string[] })?.values || []).includes(OTHER_OPTION_VALUE)}
                          disabled={readOnly}
                          onCheckedChange={(checked) => {
                            const currentValues = (responses[question.id] as { type: 'multiple_choice'; values: string[] })?.values || [];
                            const newValues = checked 
                              ? [...currentValues, OTHER_OPTION_VALUE]
                              : currentValues.filter((v) => v !== OTHER_OPTION_VALUE);
                            updateResponse(question.id, { type: 'multiple_choice', values: newValues });
                          }}
                        />
                        <Label 
                          htmlFor={`${question.id}-other`} 
                          className="cursor-pointer text-sm text-foreground"
                        >
                          {t.polls?.otherSpecify}
                        </Label>
                      </div>
                      {((responses[question.id] as { type: 'multiple_choice'; values: string[] })?.values || []).includes(OTHER_OPTION_VALUE) && (
                        <Input
                          value={otherTexts[question.id] || ''}
                          onChange={(e) => updateOtherText(question.id, e.target.value)}
                          placeholder={t.polls?.otherPlaceholder}
                          className="ml-7 max-w-sm bg-background"
                          maxLength={100}
                          disabled={readOnly}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {question.question_type === 'text' && (
                <Textarea
                  value={(responses[question.id] as { type: 'text'; value: string })?.value || ''}
                  onChange={(e) => updateResponse(question.id, { type: 'text', value: e.target.value })}
                  placeholder={t.polls?.textResponsePlaceholder}
                  className="bg-background resize-none"
                  rows={3}
                  disabled={readOnly}
                />
              )}

              {question.question_type === 'rating' && (
                <div className="space-y-2 pl-5">
                  <div className="flex flex-col items-center gap-2">
                    <StarRating
                      value={(responses[question.id] as { type: 'rating'; value: number })?.value ?? 0}
                      onChange={(value) => updateResponse(question.id, { type: 'rating', value })}
                      max={5}
                      allowHalf={true}
                      size="lg"
                      disabled={readOnly}
                    />
                    <div className="text-center">
                      <span className="text-base font-medium text-primary">
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
                  disabled={readOnly}
                />
              )}

              {question.question_type === 'time' && (
                <Input
                  type="time"
                  value={(responses[question.id] as { type: 'time'; value: string })?.value || ''}
                  onChange={(e) => updateResponse(question.id, { type: 'time', value: e.target.value })}
                  className="bg-background max-w-xs"
                  disabled={readOnly}
                />
              )}

              {question.question_type === 'datetime' && (
                <Input
                  type="datetime-local"
                  value={(responses[question.id] as { type: 'datetime'; value: string })?.value || ''}
                  onChange={(e) => updateResponse(question.id, { type: 'datetime', value: e.target.value })}
                  className="bg-background max-w-xs"
                  disabled={readOnly}
                />
              )}

              {question.question_type === 'scale' && (
                <div className="space-y-2 pl-5">
                  {question.scale_config?.min_label || question.scale_config?.max_label ? (
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      {question.scale_config?.min_label && <span>{question.scale_config.min_label}</span>}
                      <span>—</span>
                      {question.scale_config?.max_label && <span>{question.scale_config.max_label}</span>}
                    </div>
                  ) : null}
                  <div className="flex flex-col items-center gap-2">
                    {(() => {
                      const scaleConfig = getScaleConfig(question.scale_config);
                      const responseValue = (responses[question.id] as { type: 'scale'; value: number })?.value ?? scaleConfig.min;
                      const clampedValue = clampScaleValue(responseValue, scaleConfig.min, scaleConfig.max);
                      const roundedValue = roundToStep(clampedValue, scaleConfig.step, scaleConfig.min);
                      const formattedValue = formatScaleValue(roundedValue, scaleConfig.step);
                      const formattedMax = formatScaleValue(scaleConfig.max, scaleConfig.step);
                      const maxStars = Math.max(1, Math.round(scaleConfig.max - scaleConfig.min));
                      const starValue = clampScaleValue(roundedValue - scaleConfig.min, 0, maxStars);
                      const allowHalf = scaleConfig.step <= 0.5;

                      return (
                        <>
                          {scaleConfig.display === 'stars' ? (
                            <StarRating
                              value={starValue}
                              onChange={(value) => {
                                const next = clampScaleValue(
                                  roundToStep(scaleConfig.min + value, scaleConfig.step, scaleConfig.min),
                                  scaleConfig.min,
                                  scaleConfig.max
                                );
                                updateResponse(question.id, { type: 'scale', value: next });
                              }}
                              max={maxStars}
                              allowHalf={allowHalf}
                              size="lg"
                            />
                          ) : (
                            <div className="w-full max-w-md">
                              <Slider
                                min={scaleConfig.min}
                                max={scaleConfig.max}
                                step={scaleConfig.step}
                                value={[roundedValue]}
                                disabled={readOnly}
                                onValueChange={([value]) => {
                                  const next = clampScaleValue(
                                    roundToStep(value, scaleConfig.step, scaleConfig.min),
                                    scaleConfig.min,
                                    scaleConfig.max
                                  );
                                  updateResponse(question.id, { type: 'scale', value: next });
                                }}
                              />
                            </div>
                          )}
                          <div className="text-center">
                            <span className="text-base font-medium text-primary">
                              {formattedValue}
                            </span>
                            <span className="text-muted-foreground"> / {formattedMax}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {question.question_type === 'ranking' && (
                <div className="pl-5">
                  <RankingInput
                    items={(responses[question.id] as { type: 'ranking'; values: string[] })?.values || question.options}
                    onChange={(newItems) => updateResponse(question.id, { type: 'ranking', values: newItems })}
                    readOnly={readOnly}
                  />
                </div>
              )}
            </div>
          </GlowCard>
        );
      })}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {(alreadyResponded || readOnly) && (
          <div className="flex items-center gap-2 text-healer text-sm sm:mr-auto">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{t.polls?.alreadyResponded}</span>
          </div>
        )}

        {!readOnly && (
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
        )}
      </div>
    </div>
  );
};

