import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Lock, User, Users, Calendar, Clock, ListOrdered, SlidersHorizontal } from 'lucide-react';
import type { GuildPollQuestion, ResponseValue, ScaleConfig } from '@/types/poll';
import { format, parseISO } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

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
  const { language } = useLanguage();

  const getChoiceStats = (question: GuildPollQuestion) => {
    const stats: Record<string, { count: number; users: { id: string; username: string; avatar_url: string | null }[] }> = {};
    
    question.options.forEach((option) => {
      stats[option] = { count: 0, users: [] };
    });

    question.responses?.forEach((response) => {
      const value = response.response_value as ResponseValue;
      if (value.type === 'single_choice') {
        if (stats[value.value]) {
          stats[value.value].count++;
          if (response.user) {
            stats[value.value].users.push(response.user);
          }
        }
      } else if (value.type === 'multiple_choice') {
        value.values.forEach((v) => {
          if (stats[v]) {
            stats[v].count++;
            if (response.user) {
              stats[v].users.push(response.user);
            }
          }
        });
      }
    });

    return stats;
  };

  const getRatingStats = (question: GuildPollQuestion) => {
    const ratings = question.responses?.map((r) => {
      const value = r.response_value as ResponseValue;
      return value.type === 'rating' ? value.value : 0;
    }) || [];

    if (ratings.length === 0) return { average: 0, distribution: {} };

    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      if (distribution[r] !== undefined) distribution[r]++;
    });

    return { average, distribution };
  };

  const getScaleStats = (question: GuildPollQuestion) => {
    const config = question.scale_config as ScaleConfig | null;
    const min = config?.min ?? 1;
    const max = config?.max ?? 10;

    const values = question.responses?.map((r) => {
      const value = r.response_value as ResponseValue;
      return value.type === 'scale' ? value.value : 0;
    }).filter(v => v >= min && v <= max) || [];

    if (values.length === 0) return { average: 0, distribution: {}, config };

    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const distribution: Record<number, number> = {};
    for (let i = min; i <= max; i++) {
      distribution[i] = 0;
    }
    values.forEach((v) => {
      if (distribution[v] !== undefined) distribution[v]++;
    });

    return { average, distribution, config };
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
      const locale = language === 'fr' ? fr : enUS;
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
            {language === 'fr'
              ? totalResponses === 1
                ? 'réponse'
                : 'réponses'
              : totalResponses === 1
                ? 'response'
                : 'responses'}
          </span>
        </div>
        {isAnonymous && (
          <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
            <Lock className="h-3 w-3 mr-1" />
            {language === 'fr' ? 'Anonyme' : 'Anonymous'}
          </Badge>
        )}
      </div>

      {questions.map((question, index) => (
        <GlowCard key={question.id} className="p-5">
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <span className="text-primary font-semibold">{index + 1}.</span>
              <p className="font-medium text-foreground">{question.question_text}</p>
            </div>

            {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
              <div className="space-y-3 pl-5">
                {(() => {
                  const stats = getChoiceStats(question);
                  const total = question.responses?.length || 0;

                  return Object.entries(stats).map(([option, data]) => {
                    const percentage = total > 0 ? (data.count / total) * 100 : 0;
                    return (
                      <div key={option} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{option}</span>
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
                {question.responses?.map((response, respIndex) => {
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
                {(!question.responses || question.responses.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">
                    {language === 'fr' ? 'Aucune réponse' : 'No responses'}
                  </p>
                )}
              </div>
            )}

            {question.question_type === 'rating' && (
              <div className="pl-5 space-y-3">
                {(() => {
                  const { average, distribution } = getRatingStats(question);
                  const total = question.responses?.length || 0;

                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold text-primary">
                          {average.toFixed(1)}
                        </div>
                        <div className="text-muted-foreground">
                          / 5 ({total} {language === 'fr' ? 'votes' : 'votes'})
                        </div>
                      </div>
                      <div className="space-y-1">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = distribution[rating] || 0;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={rating} className="flex items-center gap-2">
                              <span className="w-4 text-sm text-muted-foreground">{rating}</span>
                              <Progress value={percentage} className="h-2 flex-1 bg-muted/40" />
                              <span className="w-8 text-xs text-muted-foreground text-right">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
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
                    {question.responses?.length || 0} {language === 'fr' ? 'réponses' : 'responses'}
                  </span>
                </div>
                {(() => {
                  const stats = getDateTimeStats(question);
                  const total = question.responses?.length || 0;

                  if (stats.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground italic">
                        {language === 'fr' ? 'Aucune réponse' : 'No responses'}
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
              <div className="pl-5 space-y-3">
                {(() => {
                  const { average, distribution, config } = getScaleStats(question);
                  const total = question.responses?.length || 0;
                  const min = config?.min ?? 1;
                  const max = config?.max ?? 10;

                  return (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="text-sm">{total} {language === 'fr' ? 'réponses' : 'responses'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold text-primary">
                          {average.toFixed(1)}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {config?.min_label && <span className="mr-2">{config.min_label}</span>}
                          {min} - {max}
                          {config?.max_label && <span className="ml-2">{config.max_label}</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {Array.from({ length: max - min + 1 }, (_, i) => max - i).map((value) => {
                          const count = distribution[value] || 0;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          return (
                            <div key={value} className="flex items-center gap-2">
                              <span className="w-6 text-sm text-muted-foreground text-right">{value}</span>
                              <Progress value={percentage} className="h-2 flex-1 bg-muted/40" />
                              <span className="w-8 text-xs text-muted-foreground text-right">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
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
                    {question.responses?.length || 0} {language === 'fr' ? 'réponses' : 'responses'}
                  </span>
                </div>
                {(() => {
                  const ranked = getRankingStats(question);
                  const total = question.responses?.length || 0;

                  if (ranked.length === 0 || total === 0) {
                    return (
                      <p className="text-sm text-muted-foreground italic">
                        {language === 'fr' ? 'Aucune réponse' : 'No responses'}
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
                                {language === 'fr' ? 'Score' : 'Score'}: {item.averageScore.toFixed(1)}
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
