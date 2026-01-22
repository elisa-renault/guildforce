import { useState, useEffect, useCallback } from 'react';
import log from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { REPORT_REASONS, ReportReason } from '@/types/forum';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Flag, User, Clock, Check, X, Eye, MessageSquare,
  Loader2, ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';
import { toast } from 'sonner';

interface ReportWithDetails {
  id: string;
  reporter_id: string;
  post_id: string | null;
  topic_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  reporter?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string;
    topic_id: string;
    author?: {
      username: string;
    };
  } | null;
  topic?: {
    id: string;
    title: string;
    author?: {
      username: string;
    };
  } | null;
  resolver?: {
    username: string;
  } | null;
}

export const ReportsManager = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const locale = DATE_LOCALE_BY_LANGUAGE[language];

  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');
  
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('forum_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch additional details for each report
      const enrichedReports = await Promise.all(
        (data || []).map(async (report) => {
          // Fetch reporter
          const { data: reporter } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', report.reporter_id)
            .single();

          // Fetch resolver if exists
          let resolver = null;
          if (report.resolved_by) {
            const { data: resolverData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', report.resolved_by)
              .single();
            resolver = resolverData;
          }
      if (error) throw error;

          let post = null;
          let topic = null;

          if (report.post_id) {
            const { data: postData } = await supabase
              .from('forum_posts')
              .select('id, content, topic_id')
              .eq('id', report.post_id)
              .single();
            if (postData) {
              const { data: postAuthor } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', (await supabase.from('forum_posts').select('author_id').eq('id', report.post_id).single()).data?.author_id || '')
                .single();
              post = { ...postData, author: postAuthor };
            }
          }

          if (report.topic_id) {
            const { data: topicData } = await supabase
              .from('forum_topics')
              .select('id, title')
              .eq('id', report.topic_id)
              .single();
            if (topicData) {
              const { data: topicAuthor } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', (await supabase.from('forum_topics').select('author_id').eq('id', report.topic_id).single()).data?.author_id || '')
                .single();
              topic = { ...topicData, author: topicAuthor };
            }
          }

          return {
            ...report,
            status: report.status as 'pending' | 'resolved' | 'dismissed',
            reporter,
            resolver,
            post,
            topic,
          } as ReportWithDetails;
        })
      );

      setReports(enrichedReports);
    } catch (error) {
      log.error('Error fetching reports:', error);
      toast.error(t.auto.components_forum_ReportsManager_173);
    } finally {
      setLoading(false);
    }
  }, [filter, language]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('reports-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_reports' },
        () => fetchReports()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  const handleResolve = async (status: 'resolved' | 'dismissed') => {
    if (!selectedReport || !user) return;

    setResolving(true);
    try {
      const { error } = await supabase
        .from('forum_reports')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_note: resolutionNote.trim() || null,
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast.success(
        status === 'resolved'
          ? (t.auto.components_forum_ReportsManager_218)
          : (t.auto.components_forum_ReportsManager_219)
      );
      setResolveDialogOpen(false);
      setSelectedReport(null);
      setResolutionNote('');
      fetchReports();
    } catch (error) {
      log.error('Error resolving report:', error);
      toast.error(t.auto.components_forum_ReportsManager_227);
    } finally {
      setResolving(false);
    }
  };

  const openResolveDialog = (report: ReportWithDetails) => {
    setSelectedReport(report);
    setResolutionNote('');
    setResolveDialogOpen(true);
  };

  const goToContent = (report: ReportWithDetails) => {
    if (report.post?.topic_id) {
      navigate(`/forum/topic/${report.post.topic_id}`);
    } else if (report.topic_id) {
      navigate(`/forum/topic/${report.topic_id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
          {t.auto.components_forum_ReportsManager_251}
        </Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400">
          {t.auto.components_forum_ReportsManager_255}
        </Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">
          {t.auto.components_forum_ReportsManager_259}
        </Badge>;
      default:
        return null;
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flag className="h-5 w-5" />
          {t.auto.components_forum_ReportsManager_273}
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pendingCount}
            </Badge>
          )}
        </CardTitle>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">{t.auto.components_forum_ReportsManager_285}</SelectItem>
            <SelectItem value="pending">{t.auto.components_forum_ReportsManager_286}</SelectItem>
            <SelectItem value="resolved">{t.auto.components_forum_ReportsManager_287}</SelectItem>
            <SelectItem value="dismissed">{t.auto.components_forum_ReportsManager_288}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t.auto.components_forum_ReportsManager_299}
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getStatusBadge(report.status)}
                      <Badge variant="outline" className="text-xs">
                        {REPORT_REASONS[report.reason as ReportReason]?.[language] || report.reason}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale })}
                      </span>
                    </div>

                    {/* Reporter */}
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-5 w-5">
                        {report.reporter?.avatar_url ? (
                          <AvatarImage src={report.reporter.avatar_url} />
                        ) : (
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="text-sm text-foreground">
                        {report.reporter?.username || 'Inconnu'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.auto.components_forum_ReportsManager_337}
                      </span>
                    </div>

                    {/* Reported content preview */}
                    <div className="p-2 rounded bg-background/50 border border-border/50 mb-2">
                      {report.post ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {t.auto.components_forum_ReportsManager_347} {report.post.author?.username || 'Inconnu'}
                          </p>
                          <p className="text-sm text-foreground line-clamp-2">
                            {report.post.content}
                          </p>
                        </div>
                      ) : report.topic ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t.auto.components_forum_ReportsManager_356} {report.topic.author?.username || 'Inconnu'}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {report.topic.title}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {t.auto.components_forum_ReportsManager_364}
                        </p>
                      )}
                    </div>

                    {/* Details */}
                    {report.details && (
                      <p className="text-sm text-muted-foreground italic mb-2">
                        "{report.details}"
                      </p>
                    )}

                    {/* Resolution info */}
                    {report.status !== 'pending' && report.resolver && (
                      <p className="text-xs text-muted-foreground">
                        {t.auto.components_forum_ReportsManager_379} {report.resolver.username}
                        {report.resolution_note && ` : "${report.resolution_note}"`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => goToContent(report)}
                      className="h-8"
                      disabled={!report.post && !report.topic}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {t.auto.components_forum_ReportsManager_395}
                    </Button>
                    {report.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResolveDialog(report)}
                        className="h-8"
                      >
                        {t.auto.components_forum_ReportsManager_404}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Resolve dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {t.auto.components_forum_ReportsManager_420}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedReport && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">
                  {t.auto.components_forum_ReportsManager_428}{' '}
                  <span className="text-foreground">
                    {REPORT_REASONS[selectedReport.reason as ReportReason]?.[language] || selectedReport.reason}
                  </span>
                </p>
                {selectedReport.details && (
                  <p className="text-sm text-muted-foreground">
                    {t.auto.components_forum_ReportsManager_435} "{selectedReport.details}"
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="resolution-note" className="text-sm font-medium">
                {t.auto.components_forum_ReportsManager_443}
              </label>
              <Textarea
                id="resolution-note"
                name="resolution-note"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder={t.auto.components_forum_ReportsManager_450}
                className="bg-background/50"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleResolve('dismissed')}
              disabled={resolving}
            >
              <X className="h-4 w-4 mr-2" />
              {t.auto.components_forum_ReportsManager_463}
            </Button>
            <Button
              onClick={() => handleResolve('resolved')}
              disabled={resolving}
              className="bg-green-600 hover:bg-green-700"
            >
              {resolving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t.auto.components_forum_ReportsManager_475}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
