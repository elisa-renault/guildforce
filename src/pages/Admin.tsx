import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { GuildManager } from '@/components/admin/GuildManager';
import { UserManager } from '@/components/admin/UserManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Shield, 
  MessageSquare, 
  AlertTriangle,
  ChevronRight,
  Crown,
  LayoutDashboard
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminStats {
  totalUsers: number;
  totalGuilds: number;
  totalTopics: number;
  totalPosts: number;
  pendingReports: number;
  activeSanctions: number;
}

export default function Admin() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    async function fetchStats() {
      if (!isAdmin) return;
      
      try {
        const [
          { count: usersCount },
          { count: guildsCount },
          { count: topicsCount },
          { count: postsCount },
          { count: reportsCount },
          { count: sanctionsCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('guilds').select('*', { count: 'exact', head: true }),
          supabase.from('forum_topics').select('*', { count: 'exact', head: true }),
          supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
          supabase.from('forum_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('forum_user_sanctions').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);

        setStats({
          totalUsers: usersCount || 0,
          totalGuilds: guildsCount || 0,
          totalTopics: topicsCount || 0,
          totalPosts: postsCount || 0,
          pendingReports: reportsCount || 0,
          activeSanctions: sanctionsCount || 0
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoadingStats(false);
      }
    }

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  if (authLoading || adminLoading) {
    return (
      <main className="flex-1 pt-20 pb-8">
        <CosmicBackground />
        <div className="container max-w-6xl mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
    }
  ];

  const adminSections = [
    {
      title: language === 'fr' ? 'Administration Forum' : 'Forum Administration',
      description: language === 'fr' 
        ? 'Gérer les catégories, modérateurs, signalements et sanctions' 
        : 'Manage categories, moderators, reports and sanctions',
      icon: MessageSquare,
      path: '/forum/admin',
      color: 'text-purple-400'
    },
    {
      title: language === 'fr' ? 'Gestion des Utilisateurs' : 'User Management',
      description: language === 'fr' 
        ? 'Attribuer des rôles (Admin, Modérateur) aux utilisateurs' 
        : 'Assign roles (Admin, Moderator) to users',
      icon: Users,
      path: '/forum/admin',
      color: 'text-blue-400'
    }
  ];

  return (
    <main className="flex-1 pt-20 pb-8">
      <CosmicBackground />
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/20 ring-1 ring-primary/50">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display text-foreground">
              {language === 'fr' ? 'Administration' : 'Administration'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'fr' ? 'Tableau de bord administrateur' : 'Admin dashboard'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground">
              <LayoutDashboard className="h-4 w-4" />
              <span>{language === 'fr' ? 'Tableau de bord' : 'Dashboard'}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground">
              <Users className="h-4 w-4" />
              <span>{language === 'fr' ? 'Utilisateurs' : 'Users'}</span>
            </TabsTrigger>
            <TabsTrigger value="guilds" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground">
              <Shield className="h-4 w-4" />
              <span>{language === 'fr' ? 'Guildes' : 'Guilds'}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {statCards.map((stat, index) => (
                <GlowCard key={index} className="p-4">
                  <div className="flex flex-col">
                    <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                    <span className="text-2xl font-bold text-foreground">
                      {loadingStats ? <Skeleton className="h-8 w-12" /> : stat.value}
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
                {adminSections.map((section, index) => (
                  <GlowCard 
                    key={index} 
                    className="p-5 cursor-pointer hover:ring-primary/50 transition-all"
                    onClick={() => navigate(section.path)}
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
          </TabsContent>

          <TabsContent value="users">
            <UserManager />
          </TabsContent>

          <TabsContent value="guilds">
            <GuildManager />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
