import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { StarDisplay } from '@/components/ui/star-rating';
import { Lock, User, Users, Calendar, Clock, ListOrdered, Star, GitBranch } from 'lucide-react';
import { OTHER_OPTION_VALUE } from '@/types/poll';
import type { GuildPollQuestion, ResponseValue, ScaleConfig } from '@/types/poll';
import { format, parseISO } from 'date-fns';
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';
import { cn } from '@/lib/utils';

interface PollResultsProps {
  questions: GuildPollQuestion[];
  isAnonymous: boolean;
  totalResponses: number;
}

export const PollResults = ({
  questions,
  isAnonymous,
  totalResponses,
}: PollResultsProps) => {
  const { language, t } = useLanguage();

  const getChoiceStats = (question: GuildPollQuestion) => {
    const stats: Record<string, { count: number; users: { id: string; username: string; avatar_url: string | null }[]; otherTexts?: string[] }> = {};
    
    question.options.forEach((option) => {
      stats[option] = { count: 0, users: [] };
    });

    // Add "Other" option if question allows it
    if (question.allow_other) {
      stats[OTHER_OPTION_VALUE] = { count: 0, users: [], otherTexts: [] };
    }

    question.responses?.forEach((response) => {
      const value = response.response_value as ResponseValue;
      if (value.type === 'single_choice') {
        if (stats[value.value]) {
          stats[value.value].count++;
          if (response.user) {
            stats[value.value].users.push(response.user);
          }
          // Collect "Other" text
          if (value.value === OTHER_OPTION_VALUE && value.other_text) {
            stats[value.value].otherTexts?.push(value.other_text);
          }
        }
      } else if (value.type === 'multiple_choice') {
        value.values.forEach((v) => {
          if (stats[v]) {
            stats[v].count++;
            if (response.user) {
              stats[v].users.push(response.user);
            }
            // Collect "Other" text
            if (v === OTHER_OPTION_VALUE && value.other_text) {
              stats[v].otherTexts?.push(value.other_text);
            }
          }
        });
      }
    });

    return stats;
  };

  const getRatingStats = (question: GuildPollQuestion) => {
    const responses = question.responses?.map((r) => {
      const value = r.response_value as ResponseValue;
      return {
        value: value.type === 'rating' ? value.value : 0,
        user: r.user
      };
    }) || [];

    if (responses.length === 0) return { average: 0, distribution: {}, individualRatings: [] };

    const values = responses.map(r => r.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const distribution: Record<number, number> = {};
    for (let i = 0; i <= 5; i++) {
      distribution[i] = 0;
    }
    // Handle half stars by rounding to nearest 0.5
    values.forEach((v) => {
      const rounded = Math.round(v);
      if (distribution[rounded] !== undefined) distribution[rounded]++;
    });

    return { average, distribution, individualRatings: responses };
  };

  const getScaleStats = (question: GuildPollQuestion) => {
    const config = question.scale_config as ScaleConfig | null;
    const max = config?.max ?? 5;

    const responses = question.responses?.map((r) => {
      const value = r.response_value as ResponseValue;
      return {
        value: value.type === 'scale' ? value.value : 0,
        user: r.user
      };
    }) || [];

    if (responses.length === 0) return { average: 0, distribution: {}, config, individualRatings: [] };

    const values = responses.map(r => r.value).filter(v => v >= 0 && v <= max);
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const distribution: Record<number, number> = {};
    for (let i = 0; i <= max; i++) {
      distribution[i] = 0;
    }
    values.forEach((v) => {
      const rounded = Math.round(v);
      if (distribution[rounded] !== undefined) distribution[rounded]++;
    });

    return { average, distribution, config, individualRatings: responses };
  };

  const getRankingStats = (question: GuildPollQuestion) => {
    const options = question.options || [];
    const scores: Record<string, { totalScore: number; count: number; positions: number[] }> = {};
    
    options.forEach((option) => {
      scores[option] = { totalScore: 0, count: 0, positions: Array(options.length).fill(0) };
    });

    question.responses?.forEach((response) => {
      const value = response.response_value as ResponseValue;
      if (value.type === 'ranking') {
        value.values.forEach((item, position) => {
          if (scores[item]) {
            scores[item].totalScore += options.length - position;
            scores[item].count++;
            scores[item].positions[position]++;
          }
        });
      }
    });

    const ranked = Object.entries(scores)
      .map(([option, data]) => ({
        option,
        averageScore: data.count > 0 ? data.totalScore / data.count : 0,
        count: data.count,
        positions: data.positions,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    return ranked;
  };

  const getDateTimeStats = (question: GuildPollQuestion) => {
    const type = question.question_type;
    const stats: Record<string, { count: number; users: { id: string; username: string; avatar_url: string | null }[] }> = {};

    question.responses?.forEach((response) => {
      const value = response.response_value as ResponseValue;
      let key: string | null = null;

      if (type === 'date' && value.type === 'date') {
        key = value.value;
      } else if (type === 'time' && value.type === 'time') {
        key = value.value;
      } else if (type === 'datetime' && value.type === 'datetime') {
        key = value.value;
      }

      if (key) {
        if (!stats[key]) {
          stats[key] = { count: 0, users: [] };
        }
        stats[key].count++;
        if (response.user) {
          stats[key].users.push(response.user);
        }
      }
    });

    return Object.entries(stats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, data]) => ({ value, ...data }));
  };

  const formatDateValue = (value: string, type: 'date' | 'time' | 'datetime') => {
    try {
      const locale = DATE_LOCALE_BY_LANGUAGE[language];
      if (type === 'date') {
        return format(parseISO(value), 'PPP', { locale });
      } else if (type === 'time') {
        return value;
      } else {
        return format(parseISO(value), 'PPP p', { locale });
      }
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
            <span>
              {totalResponses}{' '}
              {totalResponses === 1
                ? t.auto.components_polls_PollResults_response_single
                : t.auto.components_polls_PollResults_response_plural}
            </span>
        </div>
        {isAnonymous && (
          <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
            <Lock className="h-3 w-3 mr-1" />
            {t.auto.components_polls_PollResults_224}
          </Badge>
        )}
      </div>

      {questions.map((question, index) => (
        <GlowCard key={question.id} className="p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <span className="text-primary font-semibold">{index + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{question.question_text}</p>
                  {question.condition && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      <GitBranch className="h-3 w-3 mr-1" />
                      {t.polls?.conditionalBadge}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
              <div className="space-y-3 pl-5">
                {(() => {
                  const stats = getChoiceStats(question);
                  const total = question.responses?.length || 0;

                  return Object.entries(stats).map(([option, data]) => {
                    const percentage = total > 0 ? (data.count / total) * 100 : 0;
                    const isOther = option === OTHER_OPTION_VALUE;
                    const displayLabel = isOther ? (t.polls?.otherSpecify || 'Other (specify)') : option;
                    
                    return (
                      <div key={option} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{displayLabel}</span>
                          <span className="text-muted-foreground">
                            {data.count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2 bg-muted/40" />
                        {!isAnonymous && data.users.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {data.users.slice(0, 5).map((user) => (
                              <Avatar key={user.id} className="h-5 w-5">
                                {user.avatar_url ? (
                                  <AvatarImage src={user.avatar_url} />
                                ) : (
                                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                    <User className="h-3 w-3" />
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            ))}
                            {data.users.length > 5 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                +{data.users.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {question.question_type === 'text' && (
              <div className="space-y-2 pl-5 max-h-60 overflow-y-auto">
                {question.responses?.filter((response) => {
                  const value = response.response_value as ResponseValue;
                  return value.type === 'text' && value.value && value.value.trim().length > 0;
                }).map((response, respIndex) => {
                  const value = response.response_value as ResponseValue;
                  if (value.type !== 'text') return null;
                  return (
                    <div 
                      key={respIndex} 
                      className="p-3 rounded-lg bg-background border border-border"
                    >
                      {!isAnonymous && response.user && (
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-5 w-5">
                            {response.user.avatar_url ? (
                              <AvatarImage src={response.user.avatar_url} />
                            ) : (
                              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                <User className="h-3 w-3" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="text-sm font-medium">{response.user.username}</span>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">{value.value}</p>
                    </div>
                  );
                })}
                {(!question.responses || question.responses.filter((r) => {
                  const v = r.response_value as ResponseValue;
                  return v.type === 'text' && v.value && v.value.trim().length > 0;
                }).length === 0) && (
                  <p className="text-sm text-muted-foreground italic">
                    {t.auto.components_polls_PollResults_330}
                  </p>
                )}
              </div>
            )}

            {question.question_type === 'rating' && (
              <div className="pl-5 space-y-4">
                {(() => {
                  const { average, distribution, individualRatings } = getRatingStats(question);
                  const total = question.responses?.length || 0;

                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <StarDisplay value={average} max={5} size="lg" />
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {average.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">
                            / 5 ({total} {total === 1 ? 'vote' : 'votes'})
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {[5, 4, 3, 2, 1, 0].map((rating) => {
                          const count = distribution[rating] || 0;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={rating} className="flex items-center gap-2">
                              <div className="w-16 flex items-center justify-end gap-0.5">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      'h-3 w-3 stroke-[1.5]',
                                      i < rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'
                                    )}
                                  />
                                ))}
                              </div>
                              <Progress value={percentage} className="h-2 flex-1 bg-muted/40" />
                              <span className="w-8 text-xs text-muted-foreground text-right">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {!isAnonymous && individualRatings.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-sm text-muted-foreground mb-2">
                            {t.auto.components_polls_PollResults_383}
                          </p>
                          <div className="grid gap-2">
                            {individualRatings.map((rating, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                {rating.user && (
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                    <Avatar className="h-6 w-6">
                                      {rating.user.avatar_url ? (
                                        <AvatarImage src={rating.user.avatar_url} />
                                      ) : (
                                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                          <User className="h-3 w-3" />
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <span className="text-sm font-medium truncate">{rating.user.username}</span>
                                  </div>
                                )}
                                <StarDisplay value={rating.value} max={5} size="sm" />
                                <span className="text-sm text-muted-foreground">{rating.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Date / Time / DateTime results */}
            {(question.question_type === 'date' || question.question_type === 'time' || question.question_type === 'datetime') && (
              <div className="pl-5 space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  {question.question_type === 'time' ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Calendar className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {question.responses?.length || 0} {t.auto.components_polls_PollResults_425}
                  </span>
                </div>
                {(() => {
                  const stats = getDateTimeStats(question);
                  const total = question.responses?.length || 0;

                  if (stats.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground italic">
                        {t.auto.components_polls_PollResults_435}
                      </p>
                    );
                  }

                  return stats.map(({ value, count, users }) => {
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={value} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground font-medium">
                            {formatDateValue(value, question.question_type as 'date' | 'time' | 'datetime')}
                          </span>
                          <span className="text-muted-foreground">
                            {count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2 bg-muted/40" />
                        {!isAnonymous && users.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {users.slice(0, 5).map((user) => (
                              <Avatar key={user.id} className="h-5 w-5">
                                {user.avatar_url ? (
                                  <AvatarImage src={user.avatar_url} />
                                ) : (
                                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                    <User className="h-3 w-3" />
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            ))}
                            {users.length > 5 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                +{users.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Scale results */}
            {question.question_type === 'scale' && (
              <div className="pl-5 space-y-4">
                {(() => {
                  const { average, distribution, config, individualRatings } = getScaleStats(question);
                  const total = question.responses?.length || 0;
                  const max = config?.max ?? 5;

                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <StarDisplay value={average} max={max} size="lg" />
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {average.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">
                            / {max} ({total} {total === 1 ? 'vote' : 'votes'})
                          </span>
                        </div>
                      </div>
                      {(config?.min_label || config?.max_label) && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {config?.min_label && <span>{config.min_label}</span>}
                          <span>—</span>
                          {config?.max_label && <span>{config.max_label}</span>}
                        </div>
                      )}
                      <div className="space-y-1">
                        {Array.from({ length: max + 1 }, (_, i) => max - i).map((value) => {
                          const count = distribution[value] || 0;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={value} className="flex items-center gap-2">
                              <div className="w-20 flex items-center justify-end gap-0.5">
                                {Array.from({ length: max }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      'h-3 w-3 stroke-[1.5]',
                                      i < value ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'
                                    )}
                                  />
                                ))}
                              </div>
                              <Progress value={percentage} className="h-2 flex-1 bg-muted/40" />
                              <span className="w-8 text-xs text-muted-foreground text-right">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {!isAnonymous && individualRatings.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <p className="text-sm text-muted-foreground mb-2">
                            {t.auto.components_polls_PollResults_536}
                          </p>
                          <div className="grid gap-2">
                            {individualRatings.map((rating, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                {rating.user && (
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                    <Avatar className="h-6 w-6">
                                      {rating.user.avatar_url ? (
                                        <AvatarImage src={rating.user.avatar_url} />
                                      ) : (
                                        <AvatarFallback className="bg-primary/20 text-primary text-xs">
                                          <User className="h-3 w-3" />
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <span className="text-sm font-medium truncate">{rating.user.username}</span>
                                  </div>
                                )}
                                <StarDisplay value={rating.value} max={max} size="sm" />
                                <span className="text-sm text-muted-foreground">{rating.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Ranking results */}
            {question.question_type === 'ranking' && (
              <div className="pl-5 space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <ListOrdered className="h-4 w-4" />
                  <span className="text-sm">
                    {question.responses?.length || 0} {t.auto.components_polls_PollResults_574}
                  </span>
                </div>
                {(() => {
                  const ranked = getRankingStats(question);
                  const total = question.responses?.length || 0;

                  if (ranked.length === 0 || total === 0) {
                    return (
                      <p className="text-sm text-muted-foreground italic">
                        {t.auto.components_polls_PollResults_584}
                      </p>
                    );
                  }

                  const maxScore = question.options.length;

                  return (
                    <div className="space-y-2">
                      {ranked.map((item, index) => (
                        <div
                          key={item.option}
                          className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border"
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            index === 1 ? 'bg-gray-400/20 text-gray-400' :
                            index === 2 ? 'bg-amber-600/20 text-amber-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.option}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress 
                                value={(item.averageScore / maxScore) * 100} 
                                className="h-1.5 flex-1 bg-muted/40" 
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {t.auto.components_polls_PollResults_614}: {item.averageScore.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </GlowCard>
      ))}
    </div>
  );
};
