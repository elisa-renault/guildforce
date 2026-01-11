import { useState } from 'react';
import { REACTION_TYPES, ReactionType, ReactionSummary } from '@/types/forum';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReactionPickerProps {
  reactions?: ReactionSummary;
  onReaction: (reactionType: ReactionType) => void;
  disabled?: boolean;
}

export const ReactionPicker = ({ reactions, onReaction, disabled = false }: ReactionPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleReaction = (type: ReactionType) => {
    onReaction(type);
    setIsOpen(false);
  };

  // Get reactions that have at least 1 count
  const activeReactions = reactions 
    ? (Object.entries(reactions.counts) as [ReactionType, number][])
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Display existing reactions */}
      {activeReactions.map(([type, count]) => {
        const isUserReaction = reactions?.userReactions.includes(type);
        return (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => !disabled && onReaction(type)}
            disabled={disabled}
            className={cn(
              "h-7 px-2 gap-1 text-xs rounded-full",
              isUserReaction && "bg-primary/20 border border-primary/50"
            )}
          >
            <span>{REACTION_TYPES[type]}</span>
            <span className="font-medium">{count}</span>
          </Button>
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
                const isUserReaction = reactions?.userReactions.includes(type);
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
  );
};
