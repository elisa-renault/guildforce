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
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';
import { Trash2, CheckCircle, Loader2, User, AlertTriangle } from 'lucide-react';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';

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
  const { language, t } = useLanguage();
  const s = (key: SemanticKey) => resolveSemanticMessage({ key, language, translations: t });
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

      const userIds = data?.map((r) => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const enrichedRequests =
        data?.map((r) => ({
          ...r,
          user: profiles?.find((p) => p.id === r.user_id),
        })) || [];

      setRequests(enrichedRequests);
    } catch (error) {
      log.error('Error fetching deletion requests:', error);
      toast({
        title: s('admin.deletion.toast.fetch_error.title'),
        description: s('admin.deletion.toast.fetch_error.description'),
        variant: 'destructive',
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: s('admin.deletion.toast.processed.title'),
        description: s('admin.deletion.toast.processed.description'),
      });

      fetchRequests();
    } catch (error) {
      log.error('Error processing request:', error);
      toast({
        title: s('admin.deletion.toast.process_error.title'),
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">{s('admin.deletion.title')}</h2>
        {pendingRequests.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {pendingRequests.length} {s('admin.deletion.pending_count_label')}
          </Badge>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">{s('admin.deletion.pending_section')}</h3>
          {pendingRequests.map((request) => (
            <GlowCard key={request.id} surface="section" hoverable={false}>
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
                      {request.user?.username || s('admin.deletion.unknown_user')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s('admin.deletion.requested_at_prefix')}{' '}
                      {format(new Date(request.requested_at), 'dd MMM yyyy HH:mm', {
                        locale: DATE_LOCALE_BY_LANGUAGE[language],
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
                  {s('admin.deletion.mark_processed')}
                </Button>
              </div>
              <p className="text-xs text-status-warning mt-3">?? {s('admin.deletion.warning_irreversible')}</p>
            </GlowCard>
          ))}
        </div>
      )}

      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">{s('admin.deletion.processed_section')}</h3>
          {processedRequests.map((request) => (
            <GlowCard key={request.id} surface="section" className="opacity-60" hoverable={false}>
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
                      {request.user?.username || s('admin.deletion.unknown_user')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.status === 'cancelled'
                        ? s('admin.deletion.status.cancelled_prefix')
                        : s('admin.deletion.status.processed_prefix')}{' '}
                      {request.processed_at &&
                        format(new Date(request.processed_at), 'dd MMM yyyy', {
                          locale: DATE_LOCALE_BY_LANGUAGE[language],
                        })}
                    </p>
                  </div>
                </div>
                <Badge variant={request.status === 'cancelled' ? 'secondary' : 'outline'}>
                  {request.status === 'cancelled'
                    ? s('admin.deletion.badge.cancelled')
                    : s('admin.deletion.badge.processed')}
                </Badge>
              </div>
            </GlowCard>
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <GlowCard surface="section" className="text-center" hoverable={false}>
          <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{s('admin.deletion.empty')}</p>
        </GlowCard>
      )}
    </div>
  );
}

