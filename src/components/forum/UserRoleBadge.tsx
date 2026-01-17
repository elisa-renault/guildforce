import { Shield, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';

type AppRole = 'admin' | 'moderator' | 'user';

interface RoleBadgeProps {
  roles: AppRole[];
  size?: 'sm' | 'md';
}

export const UserRoleBadge = ({ roles, size = 'sm' }: RoleBadgeProps) => {
  const { t } = useLanguage();
  
  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator');

  if (!isAdmin && !isModerator) return null;

  if (isAdmin) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="destructive" 
            className={`${size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'} gap-1`}
          >
            <Crown className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            Admin
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t.forum.siteAdministrator}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isModerator) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`${size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'} gap-1 bg-primary/20 hover:bg-primary/30`}
          >
            <Shield className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            Mod
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t.forum.forumModerator}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
};
