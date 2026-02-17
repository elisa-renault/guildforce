import { useState, useEffect, useCallback } from 'react';
import log from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getReportReasonLabel } from '@/types/forum';
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
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { formatDistanceFromNowLocalized } from '@/i18n/format';

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
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

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
      toast.error(resolveSemanticMessage({ key: 'forum.reports.error_fetch', language, translations: t }));
    } finally {
      setLoading(false);
    }
  }, [filter, language, t]);

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
          ? (sm('forum.reports.resolve_success'))
          : (sm('forum.reports.dismiss_success'))
      );
      setResolveDialogOpen(false);
      setSelectedReport(null);
      setResolutionNote('');
      fetchReports();
    } catch (error) {
      log.error('Error resolving report:', error);
      toast.error(sm('forum.reports.error_resolve'));
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
        return <Badge variant="secondary" className="bg-warning/20 text-warning">
          {sm('forum.reports.status.pending')}
        </Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-healer/20 text-healer">
          {sm('forum.reports.status.resolved')}
        </Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">
          {sm('forum.reports.status.dismissed')}
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
          {sm('forum.reports.title')}
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
            <SelectItem value="all">{sm('forum.reports.filter.all')}</SelectItem>
            <SelectItem value="pending">{sm('forum.reports.filter.pending')}</SelectItem>
            <SelectItem value="resolved">{sm('forum.reports.filter.resolved')}</SelectItem>
            <SelectItem value="dismissed">{sm('forum.reports.filter.dismissed')}</SelectItem>
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
            {sm('forum.reports.empty')}
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
                        {getReportReasonLabel(report.reason, language)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceFromNowLocalized(report.created_at, language, true)}
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
                        {report.reporter?.username || t.forum.unknownUser}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sm('forum.reports.reporter_label')}
                      </span>
                    </div>

                    {/* Reported content preview */}
                    <div className="p-2 rounded bg-background/50 border border-border/50 mb-2">
                      {report.post ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {sm('forum.reports.post_by')} {report.post.author?.username || t.forum.unknownUser}
                          </p>
                          <p className="text-sm text-foreground line-clamp-2">
                            {report.post.content}
                          </p>
                        </div>
                      ) : report.topic ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {sm('forum.reports.topic_by')} {report.topic.author?.username || t.forum.unknownUser}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {report.topic.title}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          {sm('forum.reports.content_missing')}
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
                        {sm('forum.reports.resolved_by')} {report.resolver.username}
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
                      {sm('forum.reports.action.view')}
                    </Button>
                    {report.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResolveDialog(report)}
                        className="h-8"
                      >
                        {sm('forum.reports.action.resolve')}
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
              {sm('forum.reports.dialog.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedReport && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">
                  {sm('forum.reports.dialog.reason')}{' '}
                  <span className="text-foreground">
                    {getReportReasonLabel(selectedReport.reason, language)}
                  </span>
                </p>
                {selectedReport.details && (
                  <p className="text-sm text-muted-foreground">
                    {sm('forum.reports.dialog.details')} "{selectedReport.details}"
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="resolution-note" className="text-sm font-medium">
                {sm('forum.reports.dialog.note_label')}
              </label>
              <Textarea
                id="resolution-note"
                name="resolution-note"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder={sm('forum.reports.dialog.note_placeholder')}
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
              {sm('forum.reports.dialog.dismiss')}
            </Button>
            <Button
              onClick={() => handleResolve('resolved')}
              disabled={resolving}
              className="bg-healer hover:bg-healer/80"
            >
              {resolving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {sm('forum.reports.dialog.resolve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

