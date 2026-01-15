import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { SanctionDialog } from './SanctionDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Ban } from 'lucide-react';

interface UserContextMenuProps {
  user: {
    id: string;
    username: string;
    avatar_url?: string | null;
  };
  children: React.ReactNode;
  isModerator?: boolean;
}

export const UserContextMenu = ({
  user: targetUser,
  children,
  isModerator = false,
}: UserContextMenuProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { language } = useLanguage();
  const [sanctionDialogOpen, setSanctionDialogOpen] = useState(false);

  const isOwnProfile = currentUser?.id === targetUser.id;
  const canSanction = isModerator && !isOwnProfile;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer focus:outline-none">
            {children}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-card border-border">
          <DropdownMenuItem
            onClick={() => navigate(`/u/${targetUser.username}`)}
            className="cursor-pointer"
          >
            <User className="h-4 w-4 mr-2" />
            {language === 'fr' ? 'Voir le profil' : 'View profile'}
          </DropdownMenuItem>

          {canSanction && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSanctionDialogOpen(true)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Ban className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Sanctionner' : 'Sanction'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SanctionDialog
        open={sanctionDialogOpen}
        onOpenChange={setSanctionDialogOpen}
        targetUser={targetUser}
      />
    </>
  );
};
