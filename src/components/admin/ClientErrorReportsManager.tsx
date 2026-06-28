import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, Eye, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';
import log from '@/lib/logger';

interface ClientErrorReport {
  id: string;
  user_id: string | null;
  toast_title: string;
  toast_description: string | null;
  route_path: string | null;
  route_url: string | null;
  user_agent: string | null;
  locale: string | null;
  metadata: Json;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  reporter?: {
    username: string;
    avatar_url: string | null;
  } | null;
}

const STATUSES = ['open', 'investigating', 'resolved', 'closed', 'wontfix'] as const;

export function ClientErrorReportsManager() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [reports, setReports] = useState<ClientErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedReport, setSelectedReport] = useState<ClientErrorReport | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const dateLocale = DATE_LOCALE_BY_LANGUAGE[language];
  const s = useCallback((key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback }), [t]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('client_error_reports')
        .select(`
          *,
          reporter:profiles!client_error_reports_user_id_fkey(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      log.error('Error fetching client error reports:', error);
      toast.error(s('admin.client_errors.fetch_error'));
    } finally {
      setLoading(false);
    }
  }, [s, statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = async (reportId: string, nextStatus: string) => {
    setUpdating(true);
    try {
      const updateData: Record<string, unknown> = { status: nextStatus };
      if (['resolved', 'closed', 'wontfix'].includes(nextStatus)) {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id ?? null;
        updateData.resolution_note = resolutionNote || null;
      }

      const { error } = await supabase
        .from('client_error_reports')
        .update(updateData)
        .eq('id', reportId);
      if (error) throw error;

      toast.success(s('admin.client_errors.status_updated'));
      setSelectedReport(null);
      setResolutionNote('');
      fetchReports();
    } catch (error) {
      log.error('Error updating client error report:', error);
      toast.error(s('admin.client_errors.update_error'));
    } finally {
      setUpdating(false);
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase.from('client_error_reports').delete().eq('id', reportId);
      if (error) throw error;
      toast.success(s('admin.client_errors.deleted'));
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      log.error('Error deleting client error report:', error);
      toast.error(s('admin.client_errors.delete_error'));
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4" />;
      case 'investigating': return <Eye className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed':
      case 'wontfix':
        return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {s('admin.client_errors.title')}
              </CardTitle>
              <CardDescription>{s('admin.client_errors.description')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{s('admin.client_errors.status.all')}</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {s(`admin.client_errors.status.${status}` as SemanticKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">{reports.length}</Badge>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">{s('admin.client_errors.loading')}</div>
          ) : reports.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">{s('admin.client_errors.empty')}</div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setSelectedReport(report)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            {statusIcon(report.status)}
                            {s(`admin.client_errors.status.${report.status}` as SemanticKey)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(report.created_at), 'PPp', { locale: dateLocale })}
                          </span>
                        </div>
                        <h3 className="truncate font-semibold">{report.toast_title}</h3>
                        {report.toast_description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{report.toast_description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{report.reporter?.username || s('admin.client_errors.anonymous')}</span>
                          {report.route_path && <span>{report.route_path}</span>}
                          {report.locale && <span>{report.locale}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReport.toast_title}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4">
                  {selectedReport.toast_description && (
                    <div>
                      <Label className="text-muted-foreground">{s('admin.client_errors.details')}</Label>
                      <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{selectedReport.toast_description}</p>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">{s('admin.client_errors.user')}</Label>
                      <p>{selectedReport.reporter?.username || s('admin.client_errors.anonymous')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{s('admin.client_errors.created')}</Label>
                      <p>{format(new Date(selectedReport.created_at), 'PPpp', { locale: dateLocale })}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">URL</Label>
                      <p className="break-all text-sm">{selectedReport.route_url || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{s('admin.client_errors.user_agent')}</Label>
                      <p className="break-all text-sm">{selectedReport.user_agent || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{s('admin.client_errors.metadata')}</Label>
                    <pre className="mt-1 max-h-56 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
                      {JSON.stringify(selectedReport.metadata, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <Label htmlFor="resolution-note">{s('admin.client_errors.resolution_note')}</Label>
                    <Textarea
                      id="resolution-note"
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((status) => (
                      <Button
                        key={status}
                        variant={selectedReport.status === status ? 'default' : 'outline'}
                        size="sm"
                        disabled={updating}
                        onClick={() => updateStatus(selectedReport.id, status)}
                      >
                        {s(`admin.client_errors.status.${status}` as SemanticKey)}
                      </Button>
                    ))}
                    <Button variant="destructive" size="sm" onClick={() => deleteReport(selectedReport.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {s('admin.client_errors.delete')}
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
