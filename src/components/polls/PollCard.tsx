import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BarChart3, Clock, Edit, Eye, Users, Lock, Trash2, Play, User, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import type { GuildPoll } from '@/types/poll';
import { EditActivePollDialog } from './EditActivePollDialog';

interface PollCardProps {
  poll: GuildPoll;
  isGM: boolean;
  guildSlug: string;
  onPublish?: (pollId: string) => void;
  onClose?: (pollId: string) => void;
  onDelete?: (pollId: string) => void;
}

export const PollCard = ({
  poll,
  isGM,
  guildSlug,
  onPublish,
  onClose,
  onDelete,
}: PollCardProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;
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
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    closed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusLabels = {
    draft: language === 'fr' ? 'Brouillon' : 'Draft',
    active: language === 'fr' ? 'Actif' : 'Active',
    closed: language === 'fr' ? 'Clôturé' : 'Closed',
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

  // Handle click on the card itself - navigate to poll view for voting
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or dialogs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="dialog"]')) {
      return;
    }
    
    // For active polls, go to vote/respond view
    // For closed polls, go to results
    // For drafts (GM only), go to edit
    if (poll.status === 'active') {
      handleRespond();
    } else if (poll.status === 'closed') {
      handleViewResults();
    } else if (poll.status === 'draft' && isGM) {
      handleEdit();
    }
  };

  return (
    <GlowCard 
      className="p-4 cursor-pointer transition-colors hover:bg-primary/5"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {poll.title}
            </h3>
            <Badge className={statusColors[poll.status]} variant="outline">
              {statusLabels[poll.status]}
            </Badge>
            {poll.is_anonymous && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                <Lock className="h-3 w-3 mr-1" />
                {language === 'fr' ? 'Anonyme' : 'Anonymous'}
              </Badge>
            )}
          </div>

          {poll.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {poll.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                {formatDistanceToNow(new Date(poll.created_at), { 
                  addSuffix: true, 
                  locale 
                })}
              </span>
            </div>

            {poll.response_count !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {poll.response_count} {language === 'fr' ? 'réponses' : 'responses'}
                </span>
              </div>
            )}

            {poll.roster && (
              <Badge variant="outline" className="text-xs">
                {poll.roster.name}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {poll.status === 'active' && !isGM && (
            <Button size="sm" onClick={handleRespond}>
              <Edit className="h-4 w-4 mr-1.5" />
              {language === 'fr' ? 'Répondre' : 'Respond'}
            </Button>
          )}

          {isGM && (
            <>
              {poll.status === 'draft' && (
                <>
                  <Button size="sm" variant="outline" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-1.5" />
                    {language === 'fr' ? 'Éditer' : 'Edit'}
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => onPublish?.(poll.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-1.5" />
                    {language === 'fr' ? 'Publier' : 'Publish'}
                  </Button>
                </>
              )}

              {poll.status === 'active' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <Settings className="h-4 w-4 mr-1.5" />
                    {language === 'fr' ? 'Modifier' : 'Edit'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleViewResults}>
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    {language === 'fr' ? 'Résultats' : 'Results'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onClose?.(poll.id)}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Lock className="h-4 w-4 mr-1.5" />
                    {language === 'fr' ? 'Clôturer' : 'Close'}
                  </Button>
                </>
              )}

              {poll.status === 'closed' && (
                <Button size="sm" variant="outline" onClick={handleViewResults}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  {language === 'fr' ? 'Voir résultats' : 'View Results'}
                </Button>
              )}

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
};
