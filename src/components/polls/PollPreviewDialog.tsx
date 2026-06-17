import { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { GlowCard } from '@/components/GlowCard';
import { StarRating } from '@/components/ui/star-rating';
import { Slider } from '@/components/ui/slider';
import { RankingInput } from './RankingInput';
import { AlertTriangle, Lock, GitBranch, X } from 'lucide-react';
import { OTHER_OPTION_VALUE } from '@/types/poll';
import type { PollFormData, QuestionFormData, GuildPollQuestion, ResponseValue, QuestionCondition } from '@/types/poll';
import { clampScaleValue, formatScaleValue, getScaleConfig, roundToStep } from '@/lib/pollScale';

interface PollPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  formData: PollFormData;
}

// Transform form data to GuildPollQuestion format with preview IDs
const formDataToQuestions = (formData: PollFormData): GuildPollQuestion[] => {
  const questions: GuildPollQuestion[] = [];
  let displayOrder = 0;

  // Build a mapping from form indices to preview IDs
  const idMapping: Record<string, string> = {};
  
  // First pass: create IDs mapping from editor format to preview format
  // Editor uses: "general-q-0", "section-0-q-1"
  // Preview uses: "preview-general-0", "preview-section-0-1"
  formData.questions.forEach((_, i) => {
    idMapping[`general-q-${i}`] = `preview-general-${i}`;
  });
  formData.sections.forEach((section, si) => {
    section.questions.forEach((_, qi) => {
      idMapping[`section-${si}-q-${qi}`] = `preview-section-${si}-${qi}`;
    });
  });

  // Helper to transform condition - map question IDs from editor to preview format
  const transformCondition = (condition?: QuestionCondition | null): QuestionCondition | null => {
    if (!condition) return null;
    
    // Map the question_id from editor format to preview format
    const mappedId = idMapping[condition.question_id];
    if (!mappedId) {
      console.warn('Could not map condition question_id:', condition.question_id);
      return null;
    }
    
    return {
      ...condition,
      question_id: mappedId,
    };
  };

  // General questions
  formData.questions.forEach((q, i) => {
    questions.push({
      id: `preview-general-${i}`,
      poll_id: 'preview',
      section_id: null,
      question_text: q.question_text,
      question_type: q.question_type,
      is_required: q.is_required,
      display_order: displayOrder++,
      options: q.options || [],
      scale_config: q.scale_config || null,
      allow_other: q.allow_other || false,
      condition: transformCondition(q.condition),
      created_at: new Date().toISOString(),
    });
  });

  // Section questions
  formData.sections.forEach((section, si) => {
    section.questions.forEach((q, qi) => {
      questions.push({
        id: `preview-section-${si}-${qi}`,
        poll_id: 'preview',
        section_id: `preview-section-${si}`,
        question_text: q.question_text,
        question_type: q.question_type,
        is_required: q.is_required,
        display_order: displayOrder++,
        options: q.options || [],
        scale_config: q.scale_config || null,
        allow_other: q.allow_other || false,
        condition: transformCondition(q.condition),
        created_at: new Date().toISOString(),
      });
    });
  });

  return questions;
};

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
    selectedValues = sourceResponse.value === OTHER_OPTION_VALUE 
      ? [OTHER_OPTION_VALUE] 
      : [sourceResponse.value];
  } else if (sourceResponse.type === 'multiple_choice') {
    selectedValues = [...sourceResponse.values];
  } else {
    return false;
  }

  if (selectedValues.length === 0) return false;

  switch (condition.operator) {
    case 'equals':
      return condition.values.some(v => selectedValues.includes(v));
    case 'not_equals':
      return !condition.values.some(v => selectedValues.includes(v));
    case 'contains':
      return condition.values.every(v => selectedValues.includes(v));
    case 'not_contains':
      return !condition.values.some(v => selectedValues.includes(v));
    default:
      return false;
  }
};

export const PollPreviewDialog = ({
  open,
  onClose,
  formData,
}: PollPreviewDialogProps) => {
  const { t } = useLanguage();
  
  // Transform form data to questions
  const questions = useMemo(() => formDataToQuestions(formData), [formData]);
  
  // Initialize responses state
  const [responses, setResponses] = useState<Record<string, ResponseValue>>(() => {
    const initial: Record<string, ResponseValue> = {};
    questions.forEach((q) => {
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
    });
    return initial;
  });
  const [touchedQuestions, setTouchedQuestions] = useState<Record<string, boolean>>({});

  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});

  // Reset responses when dialog opens with new data
  useMemo(() => {
    if (open) {
      const initial: Record<string, ResponseValue> = {};
      questions.forEach((q) => {
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
      });
      setResponses(initial);
      setOtherTexts({});
      setTouchedQuestions({});
    }
  }, [open, questions]);

  // Compute visible questions based on conditions
  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.condition) return true;
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

  // Get index in full question list for display
  const getQuestionDisplayIndex = (questionId: string) => {
    return questions.findIndex(q => q.id === questionId) + 1;
  };

  // Group questions by section for rendering
  const groupedQuestions = useMemo(() => {
    const groups: { sectionId: string | null; sectionTitle?: string; sectionDescription?: string; questions: GuildPollQuestion[] }[] = [];
    
    // General questions
    const generalQuestions = visibleQuestions.filter(q => q.section_id === null);
    if (generalQuestions.length > 0) {
      groups.push({ sectionId: null, questions: generalQuestions });
    }
    
    // Section questions
    formData.sections.forEach((section, si) => {
      const sectionId = `preview-section-${si}`;
      const sectionQuestions = visibleQuestions.filter(q => q.section_id === sectionId);
      if (sectionQuestions.length > 0 || section.title) {
        groups.push({
          sectionId,
          sectionTitle: section.title,
          sectionDescription: section.description,
          questions: sectionQuestions,
        });
      }
    });
    
    return groups;
  }, [visibleQuestions, formData.sections]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t.polls.preview}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 p-3 mt-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t.polls.previewNote}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Poll header */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {formData.title || t.polls.sectionTitle}
            </h2>
            {formData.description && (
              <p className="text-muted-foreground">{formData.description}</p>
            )}
          </div>

          {/* Anonymous badge */}
          {formData.is_anonymous && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm">
              <Lock className="h-4 w-4" />
              {t.polls?.anonymousDesc}
            </div>
          )}

          {/* Questions */}
          {groupedQuestions.map((group, groupIndex) => (
            <div key={group.sectionId || 'general'} className="space-y-4">
              {/* Section header */}
              {group.sectionTitle && (
                <div className="pt-4 border-t border-border/50">
                  <h3 className="text-lg font-semibold text-primary">{group.sectionTitle}</h3>
                  {group.sectionDescription && (
                    <p className="text-sm text-muted-foreground mt-1">{group.sectionDescription}</p>
                  )}
                </div>
              )}

              {group.questions.map((question) => {
                const hasCondition = !!question.condition;
                
                return (
                  <GlowCard key={question.id} surface="section">
                    <div className="space-y-4">
                      <div className="flex items-start gap-2">
                        <span className="text-primary font-semibold">{getQuestionDisplayIndex(question.id)}.</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">
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

                      {/* Single choice */}
                      {question.question_type === 'single_choice' && (
                        <div className="space-y-2 pl-5">
                          <RadioGroup
                            value={(responses[question.id] as { type: 'single_choice'; value: string })?.value || ''}
                            onValueChange={(value) => updateResponse(question.id, { type: 'single_choice', value })}
                            className="space-y-2"
                          >
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-3">
                                <RadioGroupItem 
                                  value={option} 
                                  id={`preview-${question.id}-${optionIndex}`}
                                  className="border-primary/50"
                                />
                                <Label 
                                  htmlFor={`preview-${question.id}-${optionIndex}`} 
                                  className="cursor-pointer text-foreground"
                                >
                                  {option}
                                </Label>
                              </div>
                            ))}
                            {question.allow_other && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <RadioGroupItem 
                                    value={OTHER_OPTION_VALUE} 
                                    id={`preview-${question.id}-other`}
                                    className="border-primary/50"
                                  />
                                  <Label 
                                    htmlFor={`preview-${question.id}-other`} 
                                    className="cursor-pointer text-foreground"
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
                                  />
                                )}
                              </div>
                            )}
                          </RadioGroup>
                        </div>
                      )}

                      {/* Multiple choice */}
                      {question.question_type === 'multiple_choice' && (
                        <div className="space-y-2 pl-5">
                          {question.options.map((option, optionIndex) => {
                            const currentValues = (responses[question.id] as { type: 'multiple_choice'; values: string[] })?.values || [];
                            return (
                              <div key={optionIndex} className="flex items-center gap-3">
                                <Checkbox
                                  id={`preview-${question.id}-${optionIndex}`}
                                  checked={currentValues.includes(option)}
                                  onCheckedChange={(checked) => {
                                    const newValues = checked 
                                      ? [...currentValues, option]
                                      : currentValues.filter((v) => v !== option);
                                    updateResponse(question.id, { type: 'multiple_choice', values: newValues });
                                  }}
                                />
                                <Label 
                                  htmlFor={`preview-${question.id}-${optionIndex}`} 
                                  className="cursor-pointer text-foreground"
                                >
                                  {option}
                                </Label>
                              </div>
                            );
                          })}
                          {question.allow_other && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`preview-${question.id}-other`}
                                  checked={((responses[question.id] as { type: 'multiple_choice'; values: string[] })?.values || []).includes(OTHER_OPTION_VALUE)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = (responses[question.id] as { type: 'multiple_choice'; values: string[] })?.values || [];
                                    const newValues = checked 
                                      ? [...currentValues, OTHER_OPTION_VALUE]
                                      : currentValues.filter((v) => v !== OTHER_OPTION_VALUE);
                                    updateResponse(question.id, { type: 'multiple_choice', values: newValues });
                                  }}
                                />
                                <Label 
                                  htmlFor={`preview-${question.id}-other`} 
                                  className="cursor-pointer text-foreground"
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
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Text */}
                      {question.question_type === 'text' && (
                        <Textarea
                          value={(responses[question.id] as { type: 'text'; value: string })?.value || ''}
                          onChange={(e) => updateResponse(question.id, { type: 'text', value: e.target.value })}
                          placeholder={t.polls?.textResponsePlaceholder}
                          className="bg-background resize-none"
                          rows={3}
                        />
                      )}

                      {/* Rating */}
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

                      {/* Date */}
                      {question.question_type === 'date' && (
                        <Input
                          type="date"
                          value={(responses[question.id] as { type: 'date'; value: string })?.value || ''}
                          onChange={(e) => updateResponse(question.id, { type: 'date', value: e.target.value })}
                          className="bg-background max-w-xs"
                        />
                      )}

                      {/* Time */}
                      {question.question_type === 'time' && (
                        <Input
                          type="time"
                          value={(responses[question.id] as { type: 'time'; value: string })?.value || ''}
                          onChange={(e) => updateResponse(question.id, { type: 'time', value: e.target.value })}
                          className="bg-background max-w-xs"
                        />
                      )}

                      {/* Datetime */}
                      {question.question_type === 'datetime' && (
                        <Input
                          type="datetime-local"
                          value={(responses[question.id] as { type: 'datetime'; value: string })?.value || ''}
                          onChange={(e) => updateResponse(question.id, { type: 'datetime', value: e.target.value })}
                          className="bg-background max-w-xs"
                        />
                      )}

                      {/* Scale */}
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
                                      size="md"
                                    />
                                  ) : (
                                    <div className="w-full max-w-md">
                                      <Slider
                                        min={scaleConfig.min}
                                        max={scaleConfig.max}
                                        step={scaleConfig.step}
                                        value={[roundedValue]}
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
                                    <span className="text-lg font-semibold text-primary">
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

                      {/* Ranking */}
                      {question.question_type === 'ranking' && (
                        <div className="pl-5">
                          <p className="text-sm text-muted-foreground mb-2">{t.polls?.dragToRank}</p>
                          <RankingInput
                            items={(responses[question.id] as { type: 'ranking'; values: string[] })?.values || []}
                            onChange={(items) => updateResponse(question.id, { type: 'ranking', values: items })}
                          />
                        </div>
                      )}
                    </div>
                  </GlowCard>
                );
              })}
            </div>
          ))}

          {/* Close button */}
          <div className="flex justify-center pt-4">
            <Button onClick={onClose} variant="outline" className="min-w-[200px]">
              <X className="h-4 w-4 mr-2" />
              {t.polls.closePreview}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
