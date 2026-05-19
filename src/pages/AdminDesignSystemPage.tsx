import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { CosmicBackground } from '@/components/CosmicBackground';
import { AdminDesignSystem } from '@/components/admin/AdminDesignSystem';
import { PageContainer } from '@/components/layout/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRoles } from '@/hooks/useAdmin';

export default function AdminDesignSystemPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useAdminRoles();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!rolesLoading && user && !isAdmin) {
      navigate('/admin');
    }
  }, [authLoading, isAdmin, navigate, rolesLoading, user]);

  if (authLoading || rolesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center pt-16">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="flex-1 relative">
      <CosmicBackground />
      <PageContainer as="main" className="relative z-10 py-4 md:py-6" width="app">
        <AdminDesignSystem />
      </PageContainer>
    </div>
  );
}
