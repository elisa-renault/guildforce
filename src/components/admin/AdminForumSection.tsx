import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageSquare, Shield, AlertTriangle, UserX } from 'lucide-react';

export const AdminForumSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const sections = [
    {
      icon: MessageSquare,
      title: t.admin.categories,
      description: t.admin.stats.forumAdminDesc,
    },
    {
      icon: Shield,
      title: t.admin.moderators,
      description: t.admin.stats.forumAdminDesc,
    },
    {
      icon: AlertTriangle,
      title: t.admin.reports,
      description: t.admin.stats.forumAdminDesc,
    },
    {
      icon: UserX,
      title: t.admin.sanctions,
      description: t.admin.stats.forumAdminDesc,
    },
  ];

  return (
    <div className="space-y-6">
      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t.admin.forumAdmin}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t.admin.stats.forumAdminDesc}
            </p>
          </div>
          <Button onClick={() => navigate('/forum/admin')} className="gap-2">
            {t.common.loading === 'Chargement...' ? 'Ouvrir' : 'Open'}
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map((section, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <section.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{section.title}</h3>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>
          ))}
        </div>
      </GlowCard>
    </div>
  );
};
