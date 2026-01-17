import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageSquare, Shield, AlertTriangle, UserX } from 'lucide-react';

export const AdminForumSection = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const sections = [
    {
      icon: MessageSquare,
      title: language === 'fr' ? 'Catégories' : 'Categories',
      description: language === 'fr' ? 'Gérer les catégories du forum' : 'Manage forum categories',
    },
    {
      icon: Shield,
      title: language === 'fr' ? 'Modérateurs' : 'Moderators',
      description: language === 'fr' ? 'Attribuer les droits de modération' : 'Assign moderation rights',
    },
    {
      icon: AlertTriangle,
      title: language === 'fr' ? 'Signalements' : 'Reports',
      description: language === 'fr' ? 'Traiter les signalements de contenu' : 'Handle content reports',
    },
    {
      icon: UserX,
      title: language === 'fr' ? 'Sanctions' : 'Sanctions',
      description: language === 'fr' ? 'Gérer les timeouts et bannissements' : 'Manage timeouts and bans',
    },
  ];

  return (
    <div className="space-y-6">
      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {language === 'fr' ? 'Administration du Forum' : 'Forum Administration'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'fr'
                ? 'Accédez à la page d\'administration complète du forum'
                : 'Access the full forum administration page'}
            </p>
          </div>
          <Button onClick={() => navigate('/forum/admin')} className="gap-2">
            {language === 'fr' ? 'Ouvrir' : 'Open'}
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
