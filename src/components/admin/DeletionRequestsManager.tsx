import { useState, useEffect } from 'react';
import log from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { Trash2, CheckCircle, XCircle, Loader2, User, AlertTriangle } from 'lucide-react';

interface DeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: string;
  processed_at: string | null;
  processed_by: string | null;
  user?: {
    username: string;
    avatar_url: string | null;
  };
}

export function DeletionRequestsManager() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each request
      const userIds = data?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const enrichedRequests = data?.map(r => ({
        ...r,
        user: profiles?.find(p => p.id === r.user_id)
      })) || [];

      setRequests(enrichedRequests);
    } catch (error) {
      log.error('Error fetching deletion requests:', error);
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Impossible de charger les demandes' : 'Failed to load requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const markAsProcessed = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_by: user?.id
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: language === 'fr' ? 'Demande traitée' : 'Request processed',
        description: language === 'fr' 
          ? 'La demande a été marquée comme traitée' 
          : 'The request has been marked as processed'
      });

      fetchRequests();
    } catch (error) {
      log.error('Error processing request:', error);
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">
          {language === 'fr' ? 'Demandes de suppression' : 'Deletion Requests'}
        </h2>
        {pendingRequests.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {pendingRequests.length} {language === 'fr' ? 'en attente' : 'pending'}
          </Badge>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {language === 'fr' ? 'En attente' : 'Pending'}
          </h3>
          {pendingRequests.map((request) => (
            <GlowCard key={request.id} className="p-4" hoverable={false}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={request.user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20">
                      <User className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {request.user?.username || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' ? 'Demandé le' : 'Requested on'}{' '}
                      {format(new Date(request.requested_at), 'dd MMM yyyy HH:mm', {
                        locale: language === 'fr' ? fr : enUS
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => markAsProcessed(request.id)}
                  disabled={processingId === request.id}
                  className="gap-2 flex-shrink-0"
                >
                  {processingId === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {language === 'fr' ? 'Marquer traité' : 'Mark Processed'}
                </Button>
              </div>
              <p className="text-xs text-amber-500 mt-3">
                ⚠️ {language === 'fr' 
                  ? 'Supprimez manuellement le compte dans Supabase Auth avant de marquer comme traité' 
                  : 'Manually delete the account in Supabase Auth before marking as processed'}
              </p>
            </GlowCard>
          ))}
        </div>
      )}

      {/* Processed requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {language === 'fr' ? 'Traitées' : 'Processed'}
          </h3>
          {processedRequests.map((request) => (
            <GlowCard key={request.id} className="p-4 opacity-60" hoverable={false}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={request.user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {request.user?.username || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.status === 'cancelled' 
                        ? (language === 'fr' ? 'Annulée' : 'Cancelled')
                        : (language === 'fr' ? 'Traitée le' : 'Processed on')
                      }{' '}
                      {request.processed_at && format(new Date(request.processed_at), 'dd MMM yyyy', {
                        locale: language === 'fr' ? fr : enUS
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant={request.status === 'cancelled' ? 'secondary' : 'outline'}>
                  {request.status === 'cancelled' 
                    ? (language === 'fr' ? 'Annulée' : 'Cancelled')
                    : (language === 'fr' ? 'Traitée' : 'Processed')
                  }
                </Badge>
              </div>
            </GlowCard>
          ))}
        </div>
      )}

      {/* Empty state */}
      {requests.length === 0 && (
        <GlowCard className="p-8 text-center" hoverable={false}>
          <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {language === 'fr' ? 'Aucune demande de suppression' : 'No deletion requests'}
          </p>
        </GlowCard>
      )}
    </div>
  );
}
