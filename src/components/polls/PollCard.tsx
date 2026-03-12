import React, { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart3, Clock, Edit, Eye, Users, Lock, Trash2, Play, User, Settings, Copy } from 'lucide-react';
import type { GuildPoll } from '@/types/poll';
import { EditActivePollDialog } from './EditActivePollDialog';
import { formatDistanceFromNowLocalized } from '@/i18n/format';
import { toneBadgeClass } from '@/lib/design-tokens';
import { getPollPrimaryAction } from '@/lib/pollAccess';

interface PollCardProps {
  poll: GuildPoll;
  isGM: boolean;
  guildSlug: string;
  onPublish?: (pollId: string) => void;
  onClose?: (pollId: string) => void;
  onDelete?: (pollId: string) => void;
  onDuplicate?: (pollId: string) => void;
}

export const PollCard = forwardRef<HTMLDivElement, PollCardProps>(({
  poll,
  isGM,
  guildSlug,
  onPublish,
  onClose,
  onDelete,
  onDuplicate,
}, ref) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEditMetadata = () => {
    setEditDialogOpen(false);
    navigate(`/guild/${guildSlug}/polls/${poll.id}/edit?mode=metadata`);
  };

  const handleEditFull = () => {
    setEditDialogOpen(false);
    navigate(`/guild/${guildSlug}/polls/${poll.id}/edit?mode=full`);
  };

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    active: toneBadgeClass('success'),
    closed: toneBadgeClass('error'),
  };

  const statusLabels = {
    draft: t.polls.status.draft,
    active: t.polls.status.active,
    closed: t.polls.status.closed,
  };

  const handleViewResults = () => {
    navigate(`/guild/${guildSlug}/poll/${poll.id}/results`);
  };

  const handleRespond = () => {
    navigate(`/guild/${guildSlug}/poll/${poll.id}`);
  };

  const handleEdit = () => {
    navigate(`/guild/${guildSlug}/polls/${poll.id}/edit`);
  };

  const primaryAction = getPollPrimaryAction(poll, isGM);

  const handlePrimaryView = () => {
    if (primaryAction === 'results') {
      handleViewResults();
      return;
    }

    if (primaryAction === 'edit') {
      handleEdit();
      return;
    }

    handleRespond();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="dialog"]')) {
      return;
    }
    
    if (primaryAction !== 'none') {
      handlePrimaryView();
    }
  };

  return (
    <GlowCard 
      ref={ref}
      className="p-4 cursor-pointer transition-colors hover:bg-primary/5"
      onClick={handleCardClick}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground truncate max-w-full">
            {poll.title}
          </h3>
          <Badge className={statusColors[poll.status]} variant="outline">
            {statusLabels[poll.status]}
          </Badge>
          {poll.is_anonymous && (
            <Badge variant="outline" className={toneBadgeClass('info')}>
              <Lock className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{t.polls?.anonymous}</span>
            </Badge>
          )}
        </div>

        {poll.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {poll.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {poll.creator && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                {poll.creator.avatar_url ? (
                  <AvatarImage src={poll.creator.avatar_url} />
                ) : (
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                )}
              </Avatar>
              <span>{poll.creator.username}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatDistanceFromNowLocalized(poll.created_at, language, true)}
            </span>
          </div>

          {poll.response_count !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{poll.response_count} {t.polls?.responses}</span>
            </div>
          )}

          {poll.roster && (
            <Badge variant="outline" className="text-xs">
              {poll.roster.name}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30" onClick={(e) => e.stopPropagation()}>
          {poll.status === 'active' && !isGM && primaryAction === 'respond' && (
            <Button size="sm" onClick={handleRespond}>
              <Edit className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t.polls?.respond}</span>
            </Button>
          )}

          {poll.status === 'active' && !isGM && primaryAction === 'results' && (
            <Button size="sm" variant="outline" onClick={handleViewResults}>
              <BarChart3 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t.polls?.viewResults}</span>
            </Button>
          )}

          {isGM && (
            <>
              {poll.status === 'draft' && (
                <>
                  <Button size="sm" variant="outline" onClick={handleEdit}>
                    <Edit className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.common.edit}</span>
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => onPublish?.(poll.id)}
                    className="bg-healer hover:bg-healer/80"
                  >
                    <Play className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.common.publish}</span>
                  </Button>
                </>
              )}

              {poll.status === 'active' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <Settings className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.common.edit}</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleViewResults}>
                    <BarChart3 className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.common.results}</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onClose?.(poll.id)}
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <Lock className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.common.close}</span>
                  </Button>
                </>
              )}

              {poll.status === 'closed' && (
                <>
                  <Button size="sm" variant="outline" onClick={handleEditMetadata}>
                    <Settings className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.common.edit}</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleViewResults}>
                    <Eye className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.polls?.viewResults}</span>
                  </Button>
                </>
              )}

              {/* Duplicate button - available for all statuses */}
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onDuplicate?.(poll.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </Button>

              {poll.status !== 'active' && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => onDelete?.(poll.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <EditActivePollDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        responseCount={poll.response_count || 0}
        onEditMetadata={handleEditMetadata}
        onEditFull={handleEditFull}
      />
    </GlowCard>
  );
});

PollCard.displayName = 'PollCard';
