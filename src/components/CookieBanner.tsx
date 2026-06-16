import { Cookie, Settings } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { dispatchCookiePreferencesChanged } from '@/lib/analyticsConsent';

export type CookiePreferences = {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_CONSENT_KEY = 'guildforce_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'guildforce_cookie_preferences';

const defaultPreferences: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
};

export const getCookiePreferences = (): CookiePreferences | null => {
  const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

export const hasGivenConsent = (): boolean => {
  return localStorage.getItem(COOKIE_CONSENT_KEY) === 'true';
};

export const CookieBanner: React.FC = () => {
  const { t } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const bannerVisible = showBanner && !showPreferences;

  const openPreferences = useCallback(() => {
    setShowPreferences(true);
    setShowBanner(false);
  }, []);

  useEffect(() => {
    // Check if user has already given consent
    if (!hasGivenConsent()) {
      setShowBanner(true);
    } else {
      const stored = getCookiePreferences();
      if (stored) {
        setPreferences(stored);
      }
    }
  }, []);

  // Listen for open-cookie-preferences event
  useEffect(() => {
    const handler = () => openPreferences();
    window.addEventListener('open-cookie-preferences', handler);
    return () => window.removeEventListener('open-cookie-preferences', handler);
  }, [openPreferences]);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    dispatchCookiePreferencesChanged(prefs);
    setPreferences(prefs);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const acceptAll = () => {
    saveConsent({ essential: true, analytics: true, marketing: true });
  };

  const rejectAll = () => {
    saveConsent({ essential: true, analytics: false, marketing: false });
  };

  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  // Always render the preferences dialog, but banner only when needed
  return (
    <>
      {/* Main Banner - sticky at bottom, stays above footer */}
      {bannerVisible ? (
        <div
          className={[
            "fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]",
            "bg-card/95 backdrop-blur-md border-t border-b border-border shadow-lg",
          ].join(" ")}
        >
          <div className="container mx-auto max-w-4xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm text-foreground font-medium">
                    {t.cookies.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.cookies.description}{' '}
                    <Link to="/privacy" className="text-foreground underline underline-offset-2 decoration-foreground/60 hover:decoration-foreground">
                      {t.cookies.learnMore}
                    </Link>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreferences(true)}
                  className="flex-1 md:flex-none"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {t.cookies.customize}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rejectAll}
                  className="flex-1 md:flex-none"
                >
                  {t.cookies.rejectAll}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={acceptAll}
                  className="flex-1 md:flex-none"
                >
                  {t.cookies.acceptAll}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Preferences Dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              {t.cookies.preferencesTitle}
            </DialogTitle>
            <DialogDescription>
              {t.cookies.preferencesDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Essential Cookies */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t.cookies.essential}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t.cookies.essentialDesc}
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t.cookies.analytics}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t.cookies.analyticsDesc}
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, analytics: checked }))
                }
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t.cookies.marketing}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t.cookies.marketingDesc}
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={rejectAll}>
              {t.cookies.rejectAll}
            </Button>
            <Button variant="outline" onClick={saveCustomPreferences}>
              {t.cookies.savePreferences}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Export a function to reopen cookie preferences
export const openCookiePreferences = () => {
  window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
};
