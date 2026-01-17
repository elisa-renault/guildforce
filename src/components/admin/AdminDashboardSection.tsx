import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Shield, 
  MessageSquare, 
  AlertTriangle,
  ChevronRight,
  FileText,
  Bug,
  Trash2
} from 'lucide-react';
import { AdminSection } from './AdminSettingsSidebar';

interface AdminStats {
  totalUsers: number;
  totalGuilds: number;
  totalTopics: number;
  totalPosts: number;
  pendingReports: number;
  activeSanctions: number;
  openBugs: number;
  pendingDeletions: number;
}

interface AdminDashboardSectionProps {
  stats: AdminStats | null;
  loading: boolean;
  isAdmin: boolean;
  onNavigateToSection: (section: AdminSection) => void;
}

export const AdminDashboardSection = ({
  stats,
  loading,
  isAdmin,
  onNavigateToSection,
}: AdminDashboardSectionProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const statCards = [
    {
      label: language === 'fr' ? 'Utilisateurs' : 'Users',
      value: stats?.totalUsers ?? '-',
      icon: Users,
      color: 'text-blue-400'
    },
    {
      label: language === 'fr' ? 'Guildes' : 'Guilds',
      value: stats?.totalGuilds ?? '-',
      icon: Shield,
      color: 'text-green-400'
    },
    {
      label: language === 'fr' ? 'Sujets Forum' : 'Forum Topics',
      value: stats?.totalTopics ?? '-',
      icon: MessageSquare,
      color: 'text-purple-400'
    },
    {
      label: language === 'fr' ? 'Messages Forum' : 'Forum Posts',
      value: stats?.totalPosts ?? '-',
      icon: MessageSquare,
      color: 'text-indigo-400'
    },
    {
      label: language === 'fr' ? 'Signalements en attente' : 'Pending Reports',
      value: stats?.pendingReports ?? '-',
      icon: AlertTriangle,
      color: stats?.pendingReports && stats.pendingReports > 0 ? 'text-amber-400' : 'text-muted-foreground'
    },
    {
      label: language === 'fr' ? 'Sanctions actives' : 'Active Sanctions',
      value: stats?.activeSanctions ?? '-',
      icon: AlertTriangle,
      color: stats?.activeSanctions && stats.activeSanctions > 0 ? 'text-red-400' : 'text-muted-foreground'
    },
    {
      label: language === 'fr' ? 'Bugs ouverts' : 'Open Bugs',
      value: stats?.openBugs ?? '-',
      icon: Bug,
      color: stats?.openBugs && stats.openBugs > 0 ? 'text-red-400' : 'text-muted-foreground'
    },
    {
      label: language === 'fr' ? 'Suppressions en attente' : 'Pending Deletions',
      value: stats?.pendingDeletions ?? '-',
      icon: Trash2,
      color: stats?.pendingDeletions && stats.pendingDeletions > 0 ? 'text-red-400' : 'text-muted-foreground'
    }
  ];

  const adminSections = [
    {
      title: language === 'fr' ? 'Administration Forum' : 'Forum Administration',
      description:
        language === 'fr'
          ? 'Gérer les catégories, modérateurs, signalements et sanctions'
          : 'Manage categories, moderators, reports and sanctions',
      icon: MessageSquare,
      onClick: () => onNavigateToSection('forum'),
      color: 'text-purple-400',
      allowsModerator: true,
    },
    {
      title: language === 'fr' ? 'Gestion des Utilisateurs' : 'User Management',
      description:
        language === 'fr'
          ? 'Attribuer des rôles (Admin, Modérateur) aux utilisateurs'
          : 'Assign roles (Admin, Moderator) to users',
      icon: Users,
      onClick: () => onNavigateToSection('users'),
      color: 'text-blue-400',
      requiresAdmin: true,
    },
    {
      title: language === 'fr' ? 'Gestion des Guildes' : 'Guild Management',
      description:
        language === 'fr'
          ? 'Rechercher, modifier et supprimer des guildes'
          : 'Search, edit and delete guilds',
      icon: Shield,
      onClick: () => onNavigateToSection('guilds'),
      color: 'text-green-400',
      requiresAdmin: true,
    },
    {
      title: language === 'fr' ? 'Pages légales' : 'Legal Pages',
      description:
        language === 'fr'
          ? 'Modifier le contenu des mentions légales, confidentialité et CGU'
          : 'Edit legal notice, privacy policy and terms of service content',
      icon: FileText,
      onClick: () => onNavigateToSection('legal'),
      color: 'text-amber-400',
      requiresAdmin: true,
    },
    {
      title: language === 'fr' ? 'Demandes de suppression' : 'Deletion Requests',
      description:
        language === 'fr'
          ? 'Traiter les demandes de suppression de compte (RGPD)'
          : 'Process account deletion requests (GDPR)',
      icon: Trash2,
      onClick: () => onNavigateToSection('deletions'),
      color: 'text-red-400',
      requiresAdmin: true,
    },
    {
      title: language === 'fr' ? 'Rapports de bugs' : 'Bug Reports',
      description:
        language === 'fr'
          ? 'Consulter et gérer les signalements de bugs'
          : 'View and manage bug reports',
      icon: Bug,
      onClick: () => onNavigateToSection('bugs'),
      color: 'text-red-400',
      allowsModerator: true,
    },
  ];

  const visibleSections = adminSections.filter(section => {
    if (isAdmin) return true;
    return section.allowsModerator;
  });

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((stat, index) => (
          <GlowCard key={index} className="p-4">
            <div className="flex flex-col">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <span className="text-2xl font-bold text-foreground">
                {loading ? <Skeleton className="h-8 w-12" /> : stat.value}
              </span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Admin Sections */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">
          {language === 'fr' ? 'Accès rapide' : 'Quick Access'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleSections.map((section, index) => (
            <GlowCard 
              key={index} 
              className="p-5 cursor-pointer hover:ring-primary/50 transition-all"
              onClick={section.onClick}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-card ${section.color}`}>
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{section.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </div>
  );
};
