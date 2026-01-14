import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useForumSanctionActions, ForumSanction } from '@/hooks/useForumSanctions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Ban, Clock, User, Undo2, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

export const SanctionsManager = () => {
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;
  const { fetchActiveSanctions, revokeSanction } = useForumSanctionActions();
  
  const [sanctions, setSanctions] = useState<ForumSanction[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<ForumSanction | null>(null);

  const loadSanctions = async () => {
    setLoading(true);
    try {
      const data = await fetchActiveSanctions();
      setSanctions(data);
    } catch (error) {
      console.error('Error loading sanctions:', error);
      toast.error(language === 'fr' ? 'Erreur de chargement' : 'Loading error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSanctions();
  }, []);

  const handleRevoke = async () => {
    if (!confirmRevoke) return;
    
    setRevoking(confirmRevoke.id);
    try {
      await revokeSanction(confirmRevoke.id);
      toast.success(
        language === 'fr' ? 'Sanction révoquée' : 'Sanction revoked',
        { style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' } }
      );
      loadSanctions();
    } catch (error) {
      console.error('Error revoking sanction:', error);
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    } finally {
      setRevoking(null);
      setConfirmRevoke(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            {language === 'fr' ? 'Sanctions actives' : 'Active Sanctions'}
            {sanctions.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {sanctions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sanctions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {language === 'fr' ? 'Aucune sanction active' : 'No active sanctions'}
            </p>
          ) : (
            <div className="space-y-3">
              {sanctions.map((sanction) => (
                <div
                  key={sanction.id}
                  className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      {sanction.profiles?.avatar_url ? (
                        <AvatarImage src={sanction.profiles.avatar_url} alt={sanction.profiles.username} />
                      ) : (
                        <AvatarFallback className="bg-destructive/20 text-destructive">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {sanction.profiles?.username || 'Unknown'}
                        </span>
                        <Badge 
                          variant={sanction.sanction_type === 'ban' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {sanction.sanction_type === 'ban' ? (
                            <>
                              <Ban className="h-3 w-3 mr-1" />
                              {language === 'fr' ? 'Banni' : 'Banned'}
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              {language === 'fr' ? 'Timeout' : 'Timeout'}
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      {sanction.reason && (
                        <p className="text-sm text-muted-foreground">
                          {sanction.reason}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {language === 'fr' ? 'Par' : 'By'}: {sanction.created_by_profile?.username || 'Unknown'}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(sanction.created_at), { addSuffix: true, locale })}
                        </span>
                        {sanction.expires_at ? (
                          <span>
                            {language === 'fr' ? 'Expire' : 'Expires'}: {format(new Date(sanction.expires_at), 'PPp', { locale })}
                          </span>
                        ) : (
                          <span className="text-destructive">
                            {language === 'fr' ? 'Permanent' : 'Permanent'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRevoke(sanction)}
                    disabled={revoking === sanction.id}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {revoking === sanction.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Undo2 className="h-4 w-4 mr-1" />
                        {language === 'fr' ? 'Révoquer' : 'Revoke'}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm revoke dialog */}
      <AlertDialog open={!!confirmRevoke} onOpenChange={() => setConfirmRevoke(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Révoquer la sanction ?' : 'Revoke sanction?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr' 
                ? `Êtes-vous sûr de vouloir révoquer la sanction de ${confirmRevoke?.profiles?.username} ?`
                : `Are you sure you want to revoke the sanction for ${confirmRevoke?.profiles?.username}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>
              {language === 'fr' ? 'Révoquer' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
