import { Users, CheckCircle, Shield, Heart, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RoleStats } from '@/types/guild';

interface StatsCardsProps {
  totalPlayers: number;
  confirmedPlayers: number;
  roleStats: RoleStats;
}

export const StatsCards = ({ totalPlayers, confirmedPlayers, roleStats }: StatsCardsProps) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div className="stat-card total animate-fade-in" style={{ animationDelay: '0ms' }}>
        <Users className="h-8 w-8 mx-auto mb-3 text-primary" strokeWidth={1.5} />
        <div className="text-3xl font-bold text-foreground">{totalPlayers}</div>
        <div className="text-sm text-muted-foreground mt-1">{t.dashboard.totalPlayers}</div>
      </div>
      <div className="stat-card confirmed animate-fade-in" style={{ animationDelay: '50ms' }}>
        <CheckCircle className="h-8 w-8 mx-auto mb-3 text-healer" strokeWidth={1.5} />
        <div className="text-3xl font-bold text-foreground">{confirmedPlayers}</div>
        <div className="text-sm text-muted-foreground mt-1">{t.dashboard.confirmedPlayers}</div>
      </div>
      <div className="stat-card tank animate-fade-in" style={{ animationDelay: '100ms' }}>
        <Shield className="h-8 w-8 mx-auto mb-3 text-tank" strokeWidth={1.5} />
        <div className="text-3xl font-bold text-foreground">{roleStats.tank}</div>
        <div className="text-sm text-muted-foreground mt-1">{t.dashboard.tank}</div>
      </div>
      <div className="stat-card healer animate-fade-in" style={{ animationDelay: '150ms' }}>
        <Heart className="h-8 w-8 mx-auto mb-3 text-healer" strokeWidth={1.5} />
        <div className="text-3xl font-bold text-foreground">{roleStats.healer}</div>
        <div className="text-sm text-muted-foreground mt-1">{t.dashboard.healer}</div>
      </div>
      <div className="stat-card dps animate-fade-in" style={{ animationDelay: '200ms' }}>
        <Swords className="h-8 w-8 mx-auto mb-3 text-dps" strokeWidth={1.5} />
        <div className="text-3xl font-bold text-foreground">{roleStats.dps}</div>
        <div className="text-sm text-muted-foreground mt-1">{t.dashboard.dps}</div>
      </div>
    </div>
  );
};
