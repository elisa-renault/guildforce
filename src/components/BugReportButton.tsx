import React, { useState } from 'react';
import { Bug, X, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getRecentLogs, getErrorCount, getBrowserInfo } from '@/lib/logCapture';

const BugReportButton = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  (props, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('bug');
    const [priority, setPriority] = useState('medium');
    const [showAutoInfo, setShowAutoInfo] = useState(false);
    
    const { user, profile } = useAuth();
    const { t } = useLanguage();
    
    const errorCount = getErrorCount();
    const browserInfo = getBrowserInfo();
    
    const categories = [
      { value: 'bug', label: t.bugReport.categories.bug },
      { value: 'ui', label: t.bugReport.categories.ui },
      { value: 'performance', label: t.bugReport.categories.performance },
      { value: 'feature', label: t.bugReport.categories.feature },
      { value: 'other', label: t.bugReport.categories.other },
    ];
    
    const priorities = [
      { value: 'low', label: t.bugReport.priorities.low },
      { value: 'medium', label: t.bugReport.priorities.medium },
      { value: 'high', label: t.bugReport.priorities.high },
      { value: 'critical', label: t.bugReport.priorities.critical },
    ];

    const resetForm = () => {
      setTitle('');
      setDescription('');
      setCategory('bug');
      setPriority('medium');
      setShowAutoInfo(false);
    };

    const handleSubmit = async () => {
      if (!title.trim() || !description.trim()) {
        toast.error(t.bugReport.errorMissingFields);
        return;
      }

      setIsSubmitting(true);
      
      try {
        const reportData = {
          reporter_id: user?.id || null,
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          current_url: window.location.href,
          console_logs: JSON.parse(JSON.stringify(getRecentLogs())),
          browser_info: JSON.parse(JSON.stringify(getBrowserInfo())),
          user_context: user ? JSON.parse(JSON.stringify({
            userId: user.id,
            username: profile?.username,
            battletag: profile?.battletag
          })) : { anonymous: true }
        };

        const { error } = await supabase.from('bug_reports').insert([reportData]);

        if (error) throw error;

        toast.success(t.bugReport.success);
        resetForm();
        setIsOpen(false);
      } catch (error) {
        console.error('Error submitting bug report:', error);
        toast.error(t.bugReport.error);
      } finally {
        setIsSubmitting(false);
      }
    };

    const getBrowserSummary = () => {
      const ua = browserInfo.userAgent || '';
      let browser = 'Unknown';
      let os = 'Unknown';
      
      if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Safari')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';
      
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iOS')) os = 'iOS';
      
      return `${browser} / ${os}`;
    };

    return (
      <>
        {/* Sticky container for bug button - stays above footer */}
        <div className="sticky bottom-0 z-[60] flex justify-end pointer-events-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                ref={ref}
                variant="outline"
                size="icon"
                className="m-4 h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm border-border shadow-lg hover:bg-primary/20 hover:border-primary/50 transition-all pointer-events-auto"
                onClick={() => setIsOpen(true)}
                {...props}
              >
                <Bug className="h-5 w-5" />
                {errorCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {errorCount > 9 ? '9+' : errorCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {t.bugReport.button}
            </TooltipContent>
          </Tooltip>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-primary" />
                {t.bugReport.title}
              </DialogTitle>
              <DialogDescription>
                {t.bugReport.subtitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bug-title">{t.bugReport.titleField}</Label>
                <Input
                  id="bug-title"
                  name="bug-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.bugReport.titlePlaceholder}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bug-description">{t.bugReport.descriptionField}</Label>
                <Textarea
                  id="bug-description"
                  name="bug-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.bugReport.descriptionPlaceholder}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bug-category">{t.bugReport.category}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="bug-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bug-priority">{t.bugReport.priority}</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="bug-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Collapsible open={showAutoInfo} onOpenChange={setShowAutoInfo}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {t.bugReport.autoInfo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {showAutoInfo ? '−' : '+'}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">URL:</span>
                    <span className="truncate max-w-[200px]">{window.location.pathname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.bugReport.browser}:</span>
                    <span>{getBrowserSummary()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.bugReport.errorsDetected}:</span>
                    <Badge variant={errorCount > 0 ? 'destructive' : 'secondary'}>
                      {errorCount}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.bugReport.userStatus}:</span>
                    <span>{user ? profile?.username || 'Connecté' : t.bugReport.anonymous}</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t.common.cancel}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t.bugReport.submit}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

BugReportButton.displayName = 'BugReportButton';

export { BugReportButton };
