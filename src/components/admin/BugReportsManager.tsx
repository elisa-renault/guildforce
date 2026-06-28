import { useState, useEffect, useCallback } from 'react';
import log from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import {
  Bug,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Terminal,
  Monitor,
  User,
  ChevronDown,
  Loader2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface BugReport {
  id: string;
  reporter_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  console_logs: Json;
  browser_info: Json;
  user_context: Json;
  current_url: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  reporter?: {
    username: string;
    avatar_url: string | null;
  } | null;
  resolver?: {
    username: string;
  } | null;
}

export function BugReportsManager() {
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const { user } = useAuth();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const dateLocale = DATE_LOCALE_BY_LANGUAGE[language];

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bug_reports')
        .select(`
          *,
          reporter:profiles!bug_reports_reporter_id_fkey(username, avatar_url),
          resolver:profiles!bug_reports_resolved_by_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      log.error('Error fetching bug reports:', error);
      toast.error(t.bugReport.admin.fetchError);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, t.bugReport.admin.fetchError]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = async (reportId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'resolved' || newStatus === 'closed' || newStatus === 'wontfix') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
        updateData.resolution_note = resolutionNote || null;
      }

      const { error } = await supabase
        .from('bug_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      toast.success(t.bugReport.admin.statusUpdated);
      setSelectedReport(null);
      setResolutionNote('');
      fetchReports();
    } catch (error) {
      log.error('Error updating status:', error);
      toast.error(t.bugReport.admin.updateError);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast.success(t.bugReport.admin.deleted);
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      log.error('Error deleting report:', error);
      toast.error(t.bugReport.admin.deleteError);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4" />;
      case 'investigating': return <Eye className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      case 'wontfix': return <XCircle className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const statuses = t.bugReport.statuses as Record<string, string>;
    return statuses[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'destructive',
      investigating: 'default',
      resolved: 'secondary',
      closed: 'outline',
      wontfix: 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'default'} className="gap-1">
        {getStatusIcon(status)}
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const getPriorityLabel = (priority: string) => {
    const priorities = t.bugReport.priorities as Record<string, string>;
    return priorities[priority] || priority;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-status-warning/20 text-status-warning',
      high: 'bg-status-warning/20 text-status-warning',
      critical: 'bg-status-error/20 text-status-error'
    };
    
    return (
      <Badge className={colors[priority] || ''}>
        {getPriorityLabel(priority)}
      </Badge>
    );
  };

  const getCategoryLabel = (category: string) => {
    const categories = t.bugReport.categories as Record<string, string>;
    return categories[category] || category;
  };

  const openBugsCount = reports.filter(r => r.status === 'open').length;
  const criticalCount = reports.filter(r => r.priority === 'critical' && r.status !== 'resolved' && r.status !== 'closed').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              {t.bugReport.admin.title}
              {openBugsCount > 0 && (
                <Badge variant="destructive">{openBugsCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {criticalCount > 0 && (
                <span className="text-status-error flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-4 w-4" />
                  {criticalCount} {t.bugReport.admin.criticalPending}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t.common.refresh}
            </Button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t.bugReport.admin.filterStatus} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="open">{t.bugReport.statuses.open}</SelectItem>
              <SelectItem value="investigating">{t.bugReport.statuses.investigating}</SelectItem>
              <SelectItem value="resolved">{t.bugReport.statuses.resolved}</SelectItem>
              <SelectItem value="closed">{t.bugReport.statuses.closed}</SelectItem>
              <SelectItem value="wontfix">{t.bugReport.statuses.wontfix}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t.bugReport.admin.filterPriority} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.common.all}</SelectItem>
              <SelectItem value="critical">{t.bugReport.priorities.critical}</SelectItem>
              <SelectItem value="high">{t.bugReport.priorities.high}</SelectItem>
              <SelectItem value="medium">{t.bugReport.priorities.medium}</SelectItem>
              <SelectItem value="low">{t.bugReport.priorities.low}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bug className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{t.bugReport.admin.noReports}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const consoleLogs = Array.isArray(report.console_logs) ? report.console_logs : [];
              const hasErrors = consoleLogs.some((log: unknown) => 
                typeof log === 'object' && log !== null && 'level' in log && (log as { level: string }).level === 'error'
              );
              
              return (
                <div
                  key={report.id}
                  className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{report.title}</h4>
                        {hasErrors && (
                          <Badge variant="destructive" className="gap-1">
                            <Terminal className="h-3 w-3" />
                            Logs
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{getCategoryLabel(report.category)}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(report.created_at), 'PPp', { locale: dateLocale })}
                        </span>
                        {report.reporter && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {report.reporter.username}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getPriorityBadge(report.priority)}
                      {getStatusBadge(report.status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              {selectedReport?.title}
            </DialogTitle>
            <DialogDescription asChild className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedReport && getStatusBadge(selectedReport.status)}
                {selectedReport && getPriorityBadge(selectedReport.priority)}
                <Badge variant="outline">{selectedReport && getCategoryLabel(selectedReport.category)}</Badge>
              </div>
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <Label className="text-muted-foreground">{t.bugReport.descriptionField}</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedReport.description}</p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">{t.bugReport.admin.reporter}</Label>
                    <p className="mt-1">{selectedReport.reporter?.username || t.bugReport.anonymous}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t.bugReport.admin.createdAt}</Label>
                    <p className="mt-1">{format(new Date(selectedReport.created_at), 'PPp', { locale: dateLocale })}</p>
                  </div>
                  {selectedReport.current_url && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">{s('admin.bug_reports.url_label')}</Label>
                      <p className="mt-1 truncate text-xs font-mono">{selectedReport.current_url}</p>
                    </div>
                  )}
                </div>

                {/* Console Logs */}
                {Array.isArray(selectedReport.console_logs) && selectedReport.console_logs.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          {t.bugReport.admin.consoleLogs} ({selectedReport.console_logs.length})
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="rounded-md bg-muted/50 p-3 font-mono text-xs max-h-48 overflow-auto space-y-1">
                        {selectedReport.console_logs.map((log: unknown, idx: number) => {
                          if (typeof log !== 'object' || log === null) return null;
                          const typedLog = log as { level: string; message: string; timestamp: string };
                          return (
                            <div key={idx} className={typedLog.level === 'error' ? 'text-status-error' : 'text-status-warning'}>
                              [{typedLog.level.toUpperCase()}] {typedLog.message}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Browser Info */}
                {selectedReport.browser_info && typeof selectedReport.browser_info === 'object' && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          {t.bugReport.admin.browserInfo}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
                        {Object.entries(selectedReport.browser_info as Record<string, unknown>).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="truncate max-w-[200px]">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* User Context */}
                {selectedReport.user_context && typeof selectedReport.user_context === 'object' && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t.bugReport.admin.userContext}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
                        {Object.entries(selectedReport.user_context as Record<string, unknown>).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Resolution */}
                {selectedReport.resolved_at && (
                  <div className="rounded-md bg-status-success/10 border border-status-success/20 p-3">
                    <div className="flex items-center gap-2 text-status-success mb-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">{t.bugReport.admin.resolvedBy}: {selectedReport.resolver?.username}</span>
                    </div>
                    {selectedReport.resolution_note && (
                      <p className="text-sm">{selectedReport.resolution_note}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {selectedReport.status !== 'resolved' && selectedReport.status !== 'closed' && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor="resolution-note">{t.bugReport.admin.resolutionNote}</Label>
                      <Textarea
                        id="resolution-note"
                        name="resolution-note"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder={t.bugReport.admin.resolutionNotePlaceholder}
                        rows={2}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.status === 'open' && (
                        <Button
                          variant="outline"
                          onClick={() => updateStatus(selectedReport.id, 'investigating')}
                          disabled={updatingStatus}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t.bugReport.admin.markInvestigating}
                        </Button>
                      )}
                      <Button
                        variant="default"
                        onClick={() => updateStatus(selectedReport.id, 'resolved')}
                        disabled={updatingStatus}
                      >
                        {updatingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t.bugReport.admin.markResolved}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateStatus(selectedReport.id, 'wontfix')}
                        disabled={updatingStatus}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {t.bugReport.admin.markWontfix}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Delete */}
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteReport(selectedReport.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t.bugReport.admin.delete}
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

