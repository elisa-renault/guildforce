import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Lock, User, Users } from 'lucide-react';
import type { GuildPollQuestion, ResponseValue } from '@/types/poll';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {totalResponses} {language === 'fr' ? 'réponses' : 'responses'}
          </span>
        </div>
        {isAnonymous && (
          <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
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
                        <Progress value={percentage} className="h-2" />
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
                              <Progress value={percentage} className="h-2 flex-1" />
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
          </div>
        </GlowCard>
      ))}
    </div>
  );
};
