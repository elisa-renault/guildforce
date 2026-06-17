import { useState } from 'react';
import { GlowCard } from '@/components/GlowCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Loader2, ShieldAlert } from 'lucide-react';
import { getSupabaseUrl } from '@/lib/supabaseConfig';

export function AdminBackupSection() {
  const { language, t } = useLanguage();
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [downloadingUsers, setDownloadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backupUi = {
    title: resolveSemanticMessage({ key: 'admin.backup.title', language, translations: t }),
    description: resolveSemanticMessage({ key: 'admin.backup.description', language, translations: t }),
    downloadBackup: resolveSemanticMessage({ key: 'admin.backup.download_backup', language, translations: t }),
    downloadUsers: resolveSemanticMessage({ key: 'admin.backup.download_users', language, translations: t }),
    warningTitle: resolveSemanticMessage({ key: 'admin.backup.warning_title', language, translations: t }),
    warningDescription: resolveSemanticMessage({ key: 'admin.backup.warning_description', language, translations: t }),
  };

  const download = async (path: string, fallbackFilename: string, setBusy: (v: boolean) => void) => {
    setError(null);
    setBusy(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing session token');

      const baseUrl = getSupabaseUrl();
      if (!baseUrl) throw new Error('Missing backend URL');

      const res = await fetch(`${baseUrl}/functions/v1/${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename="?([^";]+)"?/i);
      const filename = filenameMatch?.[1] || fallbackFilename;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = () => download('full-backup', 'guildforce_full_backup.sql', setDownloadingBackup);
  const downloadUsers = () => download('export-users', 'guildforce_users.csv', setDownloadingUsers);

  return (
    <div className="space-y-4">
      <GlowCard surface="section" className="space-y-4 p-4">
        <div>
          <h2 className="font-sans text-lg font-medium text-foreground">{backupUi.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{backupUi.description}</p>
        </div>

          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{backupUi.warningTitle}</AlertTitle>
            <AlertDescription>{backupUi.warningDescription}</AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>{t.common.error}</AlertTitle>
              <AlertDescription className="break-words">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button onClick={downloadBackup} disabled={downloadingBackup || downloadingUsers}>
              {downloadingBackup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span className="ml-2">{backupUi.downloadBackup}</span>
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={downloadUsers}
              disabled={downloadingBackup || downloadingUsers}
            >
              {downloadingUsers ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span className="ml-2">{backupUi.downloadUsers}</span>
                </>
              )}
            </Button>
          </div>
      </GlowCard>
    </div>
  );
}
