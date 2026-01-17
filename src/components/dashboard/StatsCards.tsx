import { Users, CheckCircle, Shield, Heart, Swords, Sword, Crosshair } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RoleStats, RangeStats } from '@/types/guild';

interface StatsCardsProps {
  totalPlayers: number;
  confirmedPlayers: number;
  roleStats: RoleStats;
  rangeStats: RangeStats;
}

export const StatsCards = ({ totalPlayers, confirmedPlayers, roleStats, rangeStats }: StatsCardsProps) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5 md:gap-3 mb-4">
      <div className="stat-card-compact total">
        <Users className="h-4 md:h-5 text-primary" strokeWidth={1.5} />
        <div className="text-base md:text-xl font-bold text-foreground">{totalPlayers}</div>
        <div className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t.dashboard.totalPlayers}</div>
      </div>
      <div className="stat-card-compact confirmed">
        <CheckCircle className="h-4 md:h-5 text-healer" strokeWidth={1.5} />
        <div className="text-base md:text-xl font-bold text-foreground">{confirmedPlayers}</div>
        <div className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t.dashboard.confirmedPlayers}</div>
      </div>
      <div className="stat-card-compact tank">
        <Shield className="h-4 md:h-5 text-tank" strokeWidth={1.5} />
        <div className="text-base md:text-xl font-bold text-foreground">{roleStats.tank}</div>
        <div className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t.dashboard.tank}</div>
      </div>
      <div className="stat-card-compact healer">
        <Heart className="h-4 md:h-5 text-healer" strokeWidth={1.5} />
        <div className="text-base md:text-xl font-bold text-foreground">{roleStats.healer}</div>
        <div className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t.dashboard.healer}</div>
      </div>
      {/* Hide range stats on very small screens */}
      <div className="stat-card-compact dps hidden md:flex">
        <Swords className="h-4 md:h-5 text-dps" strokeWidth={1.5} />
        <div className="text-base md:text-xl font-bold text-foreground">{roleStats.dps}</div>
        <div className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t.dashboard.dps}</div>
      </div>
      <div className="stat-card-compact melee hidden md:flex">
        <Sword className="h-4 md:h-5 text-orange-400" strokeWidth={1.5} />
        <div className="text-base md:text-xl font-bold text-foreground">{rangeStats.melee}</div>
        <div className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t.dashboard.melee}</div>
      </div>
      <div className="stat-card-compact ranged hidden md:flex">
        <Crosshair className="h-4 md:h-5 text-cyan-400" strokeWidth={1.5} />
        <div className="text-base md:text-xl font-bold text-foreground">{rangeStats.ranged}</div>
        <div className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t.dashboard.ranged}</div>
      </div>
    </div>
  );
};
