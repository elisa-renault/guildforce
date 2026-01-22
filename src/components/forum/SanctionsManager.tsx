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
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';
import { toast } from 'sonner';

export const SanctionsManager = () => {
  const { language, t } = useLanguage();
  const locale = DATE_LOCALE_BY_LANGUAGE[language];
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
      toast.error(t.auto.components_forum_SanctionsManager_40);
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
        t.auto.components_forum_SanctionsManager_57,
        { style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' } }
      );
      loadSanctions();
    } catch (error) {
      console.error('Error revoking sanction:', error);
      toast.error(t.auto.components_forum_SanctionsManager_63);
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
            {t.auto.components_forum_SanctionsManager_86}
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
              {t.auto.components_forum_SanctionsManager_97}
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
                              {t.auto.components_forum_SanctionsManager_128}
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              {t.auto.components_forum_SanctionsManager_133}
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
                          {t.auto.components_forum_SanctionsManager_147}: {sanction.created_by_profile?.username || 'Unknown'}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(sanction.created_at), { addSuffix: true, locale })}
                        </span>
                        {sanction.expires_at ? (
                          <span>
                            {t.auto.components_forum_SanctionsManager_154}: {format(new Date(sanction.expires_at), 'PPp', { locale })}
                          </span>
                        ) : (
                          <span className="text-destructive">
                            {t.auto.components_forum_SanctionsManager_158}
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
                        {t.auto.components_forum_SanctionsManager_177}
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
              {t.forum.moderation?.revokeSanction || (t.auto.components_forum_SanctionsManager_193)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(t.forum.moderation?.revokeSanctionConfirm || (t.auto.components_forum_SanctionsManager_196))
                .replace('{{username}}', confirmRevoke?.profiles?.username || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>
              {t.forum.moderation?.revoke || (t.auto.components_forum_SanctionsManager_207)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
