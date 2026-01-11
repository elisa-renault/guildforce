import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ForumCategory } from '@/types/forum';
import { GlowCard } from '@/components/GlowCard';
import { MessageSquare, Clock, ChevronRight, FolderOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface ForumCategoryListProps {
  categories: ForumCategory[];
  basePath?: string;
}

export const ForumCategoryList = ({ categories, basePath = '/forum' }: ForumCategoryListProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">Aucune catégorie disponible</p>
      </div>
    );
  }

  // Group by global vs guild
  const globalCategories = categories.filter(c => c.is_global);
  const guildCategories = categories.filter(c => !c.is_global && c.guild_id);

  const renderCategory = (category: ForumCategory) => (
    <div
      key={category.id}
      onClick={() => navigate(`${basePath}/category/${category.slug}`)}
      className="flex items-center gap-4 p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card/80 cursor-pointer transition-all group"
    >
      {/* Icon */}
      <div 
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: category.color ? `${category.color}20` : 'hsl(var(--primary) / 0.1)' }}
      >
        <MessageSquare 
          className="h-6 w-6" 
          style={{ color: category.color || 'hsl(var(--primary))' }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{category.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
        <div className="text-center min-w-[60px]">
          <div className="font-semibold text-foreground">{category.topic_count || 0}</div>
          <div className="text-xs">sujets</div>
        </div>
      </div>

      {/* Last topic */}
      <div className="hidden lg:block min-w-[200px] max-w-[250px]">
        {category.last_topic ? (
          <div className="text-sm">
            <p className="text-foreground truncate">{category.last_topic.title}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(category.last_topic.created_at), { addSuffix: true, locale })}
              <span>par {category.last_topic.author_name}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Aucun sujet</p>
        )}
      </div>

      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  );

  return (
    <div className="space-y-6">
      {globalCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Forum Général
          </h2>
          <div className="space-y-2">
            {globalCategories.map(renderCategory)}
          </div>
        </div>
      )}

      {guildCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-500" />
            Forum de Guilde
          </h2>
          <div className="space-y-2">
            {guildCategories.map(renderCategory)}
          </div>
        </div>
      )}
    </div>
  );
};
