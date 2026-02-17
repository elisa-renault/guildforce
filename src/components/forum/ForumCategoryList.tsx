import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ForumCategory } from '@/types/forum';
import { GlowCard } from '@/components/GlowCard';
import { MessageSquare, Clock, ChevronRight, FolderOpen, MessageCircle, Lightbulb, HelpCircle, Bug } from 'lucide-react';
import { formatDistanceFromNowLocalized } from '@/i18n/format';

interface ForumCategoryListProps {
  categories: ForumCategory[];
  basePath?: string;
}

// Map category slugs to icons
const categoryIcons: Record<string, React.ElementType> = {
  feedback: Lightbulb,
  support: HelpCircle,
  general: MessageCircle,
  bugs: Bug,
};

export const ForumCategoryList = forwardRef<HTMLDivElement, ForumCategoryListProps>(
  ({ categories, basePath = '/forum' }, ref) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">{t.forum.noCategory}</p>
      </div>
    );
  }

  // Group by global vs guild
  const globalCategories = categories.filter(c => c.is_global);
  const guildCategories = categories.filter(c => !c.is_global && c.guild_id);

  // Get translated name and description for a category
  const getCategoryName = (category: ForumCategory) => {
    const slug = category.slug as keyof typeof t.forum.categoryNames;
    return t.forum.categoryNames[slug] || category.name;
  };

  const getCategoryDescription = (category: ForumCategory) => {
    const slug = category.slug as keyof typeof t.forum.categoryDescriptions;
    return t.forum.categoryDescriptions[slug] || category.description;
  };

  const renderCategory = (category: ForumCategory) => {
    const IconComponent = categoryIcons[category.slug] || MessageSquare;
    
    return (
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
          <IconComponent 
            className="h-6 w-6" 
            style={{ color: category.color || 'hsl(var(--primary))' }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {getCategoryName(category)}
          </h3>
          {getCategoryDescription(category) && (
            <p className="text-sm text-muted-foreground line-clamp-1">{getCategoryDescription(category)}</p>
          )}
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <div className="text-center min-w-[60px]">
            <div className="font-semibold text-foreground">{category.topic_count || 0}</div>
            <div className="text-xs">{t.forum.topicsCount}</div>
          </div>
        </div>

        {/* Last topic */}
        <div className="hidden lg:block min-w-[200px] max-w-[250px]">
          {category.last_topic ? (
            <div className="text-sm">
              <p className="text-foreground truncate">{category.last_topic.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceFromNowLocalized(category.last_topic.created_at, language, true)}
                <span>{t.forum.by} {category.last_topic.author_name}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t.forum.noTopicYet}</p>
          )}
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    );
  };

  return (
    <div ref={ref} className="space-y-6">
      {globalCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t.forum.globalForum}
          </h2>
          <div className="space-y-2">
            {globalCategories.map(renderCategory)}
          </div>
        </div>
      )}

      {guildCategories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-warning" />
            {t.forum.guildForum}
          </h2>
          <div className="space-y-2">
            {guildCategories.map(renderCategory)}
          </div>
        </div>
      )}
    </div>
  );
});

ForumCategoryList.displayName = 'ForumCategoryList';

