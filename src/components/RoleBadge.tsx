import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Role } from '@/data/wowClasses';
import { Shield, Heart, Sword } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md';
}

const roleConfig: Record<Role, { icon: React.ElementType; color: string }> = {
  tank: { icon: Shield, color: 'bg-tank/20 text-tank border-tank/50' },
  healer: { icon: Heart, color: 'bg-healer/20 text-healer border-healer/50' },
  dps: { icon: Sword, color: 'bg-dps/20 text-dps border-dps/50' },
};

export const RoleBadge = ({ role, size = 'md' }: RoleBadgeProps) => {
  const { t } = useLanguage();
  const config = roleConfig[role];
  const Icon = config.icon;

  const label = role === 'tank' ? t.dashboard.tank : role === 'healer' ? t.dashboard.healer : t.dashboard.dps;

  return (
    <Badge variant="outline" className={cn(config.color, size === 'sm' && 'text-xs px-1.5 py-0.5')}>
      <Icon className={cn("mr-1", size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {label}
    </Badge>
  );
};
