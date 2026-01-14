import { useState, useEffect, useCallback } from 'react';
import { REACTION_TYPES, ReactionType, ReactionSummary } from '@/types/forum';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReactionPickerProps {
  reactions?: ReactionSummary;
  onReaction: (reactionType: ReactionType) => void;
  disabled?: boolean;
}

export const ReactionPicker = ({ reactions, onReaction, disabled = false }: ReactionPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Optimistic local state
  const [optimisticCounts, setOptimisticCounts] = useState<Record<ReactionType, number>>({} as Record<ReactionType, number>);
  const [optimisticUserReactions, setOptimisticUserReactions] = useState<ReactionType[]>([]);
  const [usersByReaction, setUsersByReaction] = useState<Record<ReactionType, string[]>>({} as Record<ReactionType, string[]>);
  
  // Sync with server state when reactions prop changes
  useEffect(() => {
    if (reactions) {
      setOptimisticCounts(reactions.counts);
      setOptimisticUserReactions(reactions.userReactions);
      setUsersByReaction(reactions.usersByReaction || {} as Record<ReactionType, string[]>);
    }
  }, [reactions]);

  const handleReaction = useCallback((type: ReactionType) => {
    // Optimistic update
    const isUserReaction = optimisticUserReactions.includes(type);
    
    if (isUserReaction) {
      // Remove reaction
      setOptimisticUserReactions(prev => prev.filter(r => r !== type));
      setOptimisticCounts(prev => ({
        ...prev,
        [type]: Math.max(0, (prev[type] || 0) - 1)
      }));
    } else {
      // Add reaction
      setOptimisticUserReactions(prev => [...prev, type]);
      setOptimisticCounts(prev => ({
        ...prev,
        [type]: (prev[type] || 0) + 1
      }));
    }
    
    // Trigger server update
    onReaction(type);
    setIsOpen(false);
  }, [optimisticUserReactions, onReaction]);

  // Get reactions that have at least 1 count
  const activeReactions = Object.entries(optimisticCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number)) as [ReactionType, number][];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 flex-wrap">
        {/* Display existing reactions */}
        {activeReactions.map(([type, count]) => {
          const isUserReaction = optimisticUserReactions.includes(type);
          const users = usersByReaction[type] || [];
          const displayUsers = users.slice(0, 10);
          const remainingCount = users.length - 10;
          
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => !disabled && handleReaction(type)}
                  disabled={disabled}
                  className={cn(
                    "h-7 px-2 gap-1 text-xs rounded-full transition-all",
                    isUserReaction && "bg-primary/20 border border-primary/50"
                  )}
                >
                  <span>{REACTION_TYPES[type]}</span>
                  <span className="font-medium">{count}</span>
                </Button>
              </TooltipTrigger>
              {users.length > 0 && (
                <TooltipContent 
                  className="bg-card border-border text-foreground max-w-xs"
                  side="top"
                >
                  <div className="text-xs">
                    {displayUsers.join(', ')}
                    {remainingCount > 0 && (
                      <span className="text-muted-foreground"> +{remainingCount}</span>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}

        {/* Add reaction button */}
        {!disabled && (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full hover:bg-primary/10"
              >
                <SmilePlus className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-2 bg-card border-border" 
              align="start"
              sideOffset={4}
            >
              <div className="flex gap-1">
                {(Object.entries(REACTION_TYPES) as [ReactionType, string][]).map(([type, emoji]) => {
                  const isUserReaction = optimisticUserReactions.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      className={cn(
                        "text-xl p-1.5 rounded-lg hover:bg-primary/20 transition-colors",
                        isUserReaction && "bg-primary/20 ring-1 ring-primary/50"
                      )}
                      title={type}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
};
