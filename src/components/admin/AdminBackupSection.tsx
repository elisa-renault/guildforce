import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Loader2, ShieldAlert } from 'lucide-react';

export function AdminBackupSection() {
  const { language } = useLanguage();
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [downloadingUsers, setDownloadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    fr: {
      title: 'Backup complet',
      desc: 'Télécharge un export complet des données au format SQL (réservé aux admins).',
      button: 'Télécharger le backup',
      usersButton: 'Exporter les users (CSV)',
      warningTitle: 'Attention',
      warning: 'Selon la taille de la base, le téléchargement peut être long.',
    },
    en: {
      title: 'Full backup',
      desc: 'Download a full data export as an SQL file (admins only).',
      button: 'Download backup',
      usersButton: 'Export users (CSV)',
      warningTitle: 'Warning',
      warning: 'Depending on database size, this download can take a while.',
    },
  } as const;

  const t = copy[language];

  const download = async (path: string, fallbackFilename: string, setBusy: (v: boolean) => void) => {
    setError(null);
    setBusy(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Missing session token');

      const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
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
    } catch (e: any) {
      setError(e?.message || 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadBackup = () => download('full-backup', 'guildforce_full_backup.sql', setDownloadingBackup);
  const downloadUsers = () => download('export-users', 'guildforce_users.csv', setDownloadingUsers);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">{t.title}</CardTitle>
          <CardDescription>{t.desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{t.warningTitle}</AlertTitle>
            <AlertDescription>{t.warning}</AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription className="break-words">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button onClick={downloadBackup} disabled={downloadingBackup || downloadingUsers}>
              {downloadingBackup ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2">…</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span className="ml-2">{t.button}</span>
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
                  <span className="ml-2">…</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span className="ml-2">{t.usersButton}</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
