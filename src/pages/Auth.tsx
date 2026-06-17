import { ArrowLeft, Loader2, Shield, ChevronDown, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { BattleNetIcon } from '@/components/BattleNetIcon';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { detectLanguageFromNavigator } from '@/i18n/config';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import {
  buildBattleNetDebugInfo,
  getErrorMessage as getDiagnosticErrorMessage,
  recordAuthDiagnostic,
  type AuthDiagnosticStatus,
} from '@/lib/authDiagnostics';
import {
  type BattleNetRegion,
  ALL_REGIONS,
  beginBattleNetCodeProcessing,
  cleanupOAuthParams,
  clearBattleNetCodeProcessing,
  completeBattleNetCodeProcessing,
  generateOAuthState,
  getRedirectUri,
  getStoredOAuthParams,
  getValidRegion,
  parseOAuthState,
  REGION_LABELS,
  storeOAuthParams,
  validateOAuthState,
} from '@/lib/battlenetOAuth';
import log from '@/lib/logger';
import { getSupabaseUrl } from '@/lib/supabaseConfig';

type BattleNetAuthResponse = Record<string, unknown> & {
  access_token?: string;
  authUrl?: string;
  battletag?: string;
  error?: string;
  isNewUser?: boolean;
  refresh_token?: string;
  tokenType?: string;
  verifyToken?: string;
};

type BattleNetDebugInfo = {
  flowId: string;
  step: string;
  status: AuthDiagnosticStatus;
  text: string;
};

const readBattleNetAuthResponse = async (response: Response): Promise<BattleNetAuthResponse> => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as BattleNetAuthResponse;
  } catch {
    return {
      error: text.length > 500 ? `${text.slice(0, 500)}...` : text || response.statusText,
    };
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const [bnetLoading, setBnetLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BattleNetRegion>('eu');
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [battleNetDebugInfo, setBattleNetDebugInfo] = useState<BattleNetDebugInfo | null>(null);
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.errors.generic;
  const setDebugInfo = (
    flowId: string,
    step: string,
    status: AuthDiagnosticStatus,
    error?: unknown
  ) => {
    setBattleNetDebugInfo({
      flowId,
      step,
      status,
      text: buildBattleNetDebugInfo({
        flowId,
        step,
        status,
        errorMessage: getDiagnosticErrorMessage(error),
      }),
    });
  };

  const copyDebugInfo = async () => {
    if (!battleNetDebugInfo) return;

    try {
      await navigator.clipboard.writeText(battleNetDebugInfo.text);
      toast({ title: t.common.copied });
    } catch {
      toast({
        title: t.common.error,
        description: battleNetDebugInfo.text,
        variant: 'destructive',
      });
    }
  };

  // Check for Battle.net callback - only process once
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (code && state) {
      const parsedState = parseOAuthState(state);
      const storedParams = getStoredOAuthParams();
      const flowId = parsedState.flowId || storedParams.flowId || generateOAuthState();

      void recordAuthDiagnostic({
        flowId,
        step: 'callback_page_loaded',
        status: 'ok',
        metadata: {
          hasCode: true,
          hasState: true,
          stateMode: parsedState.mode ?? 'login',
          stateRegion: parsedState.region ?? null,
          hasStoredState: Boolean(storedParams.state),
        },
      });

      const processing = beginBattleNetCodeProcessing(code, flowId);
      if (!processing.allowed) {
        void recordAuthDiagnostic({
          flowId,
          step: 'callback_duplicate_skipped',
          status: 'warning',
          metadata: { reason: processing.reason },
        });
        navigate('/auth', { replace: true });
        return;
      }

      void handleBattleNetCallback(code, state, flowId);
    }
    // This effect is intentionally tied to URL params; the callback clears/replaces the URL on every terminal path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate]);

  useEffect(() => {
    if (user) navigate('/guilds');
  }, [user, navigate]);

  const handleBattleNetCallback = async (code: string, stateParam: string, callbackFlowId?: string) => {
    setBnetLoading(true);
    const parsedState = parseOAuthState(stateParam);
    const storedParams = getStoredOAuthParams();
    const flowId = callbackFlowId || parsedState.flowId || storedParams.flowId || generateOAuthState();

    try {
      const stateMatches = validateOAuthState(parsedState, storedParams.state);
      if (!stateMatches) {
        await recordAuthDiagnostic({
          flowId,
          step: 'state_validation_failed',
          status: 'error',
          metadata: { hasStoredState: Boolean(storedParams.state) },
        });
        throw new Error('Battle.net login state mismatch. Please try again.');
      }

      await recordAuthDiagnostic({
        flowId,
        step: 'state_validation_success',
        status: storedParams.state ? 'ok' : 'warning',
        metadata: { hasStoredState: Boolean(storedParams.state) },
      });

      const region = getValidRegion(parsedState.region || storedParams.region);
      const redirectUri = getRedirectUri('/auth');

      // Detect browser language for new accounts
      const browserLanguage = detectLanguageFromNavigator(navigator.language);
      
      const baseUrl = getSupabaseUrl();
      if (!baseUrl) throw new Error('Missing Supabase URL configuration');

      await recordAuthDiagnostic({
        flowId,
        step: 'login_fetch_start',
        status: 'ok',
        metadata: { region, browserLanguage, redirectPath: '/auth' },
      });

      const response = await fetch(`${baseUrl}/functions/v1/battlenet-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri, region, browserLanguage, flowId }),
      });

      const data = await readBattleNetAuthResponse(response);
      await recordAuthDiagnostic({
        flowId,
        step: 'login_fetch_response',
        status: response.ok ? 'ok' : 'error',
        errorMessage: response.ok ? null : data?.error || 'Battle.net login failed',
        metadata: { status: response.status, hasVerifyToken: Boolean(data?.verifyToken), hasAccessToken: Boolean(data?.access_token) },
      });

      if (!response.ok) {
        throw new Error(data.error || 'Battle.net login failed');
      }

      if (data.access_token) {
        await recordAuthDiagnostic({ flowId, step: 'set_session_start', status: 'ok' });
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token || accessToken;
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          await recordAuthDiagnostic({
            flowId,
            step: 'set_session_error',
            status: 'error',
            errorMessage: error.message,
          });
          throw error;
        }

        await recordAuthDiagnostic({ flowId, step: 'set_session_success', status: 'ok' });

        completeBattleNetCodeProcessing(code, flowId);
        cleanupOAuthParams();
        toast({
          title: data.isNewUser ? t.auth.accountCreated : t.auth.welcomeBack,
          description: `${t.battlenet.connected} : ${data.battletag}`,
        });

        // Redirect new users to profile setup, existing users to guilds
        if (data.isNewUser) {
          navigate('/profile?setup=true', { replace: true });
        } else {
          navigate('/guilds', { replace: true });
        }
      } else if (data.verifyToken) {
        await recordAuthDiagnostic({ flowId, step: 'verify_otp_start', status: 'ok' });
        const token_hash = data.verifyToken as string;
        const type = (data.tokenType || 'magiclink') as
          | 'signup'
          | 'magiclink'
          | 'recovery'
          | 'invite'
          | 'email'
          | 'email_change';
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (error) {
          await recordAuthDiagnostic({
            flowId,
            step: 'verify_otp_error',
            status: 'error',
            errorMessage: error.message,
          });
          throw error;
        }

        await recordAuthDiagnostic({ flowId, step: 'verify_otp_success', status: 'ok' });

        completeBattleNetCodeProcessing(code, flowId);
        cleanupOAuthParams();
        toast({
          title: data.isNewUser ? t.auth.accountCreated : t.auth.welcomeBack,
          description: `${t.battlenet.connected} : ${data.battletag}`,
        });

        // Redirect new users to profile setup, existing users to guilds
        if (data.isNewUser) {
          navigate('/profile?setup=true', { replace: true });
        } else {
          navigate('/guilds', { replace: true });
        }
      } else {
        await recordAuthDiagnostic({
          flowId,
          step: 'login_response_invalid',
          status: 'error',
          metadata: { keys: Object.keys(data || {}) },
        });
        throw new Error('Battle.net login returned an invalid response');
      }
    } catch (error: unknown) {
      clearBattleNetCodeProcessing();
      setDebugInfo(flowId, 'callback_error', 'error', error);
      await recordAuthDiagnostic({
        flowId,
        step: 'callback_error',
        status: 'error',
        errorMessage: getDiagnosticErrorMessage(error),
      });
      log.error('Battle.net callback error:', error);
      toast({
        title: t.auth.battlenetError,
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      navigate('/auth', { replace: true });
    } finally {
      setBnetLoading(false);
    }
  };

  const handleBattleNetLogin = async () => {
    setBnetLoading(true);
    const flowId = generateOAuthState();
    try {
      const redirectUri = getRedirectUri('/auth');
      const state = generateOAuthState();
      storeOAuthParams(state, selectedRegion, flowId);
      setDebugInfo(flowId, 'login_clicked', 'ok');

      await recordAuthDiagnostic({
        flowId,
        step: 'login_clicked',
        status: 'ok',
        metadata: { region: selectedRegion },
      });

      const baseUrl = getSupabaseUrl();
      if (!baseUrl) throw new Error('Missing Supabase URL configuration');

      await recordAuthDiagnostic({
        flowId,
        step: 'auth_url_request',
        status: 'ok',
        metadata: { region: selectedRegion, redirectPath: '/auth' },
      });

      const response = await fetch(`${baseUrl}/functions/v1/battlenet-auth/auth-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUri, state, mode: 'login', region: selectedRegion, flowId }),
      });

      const data = await readBattleNetAuthResponse(response);
      await recordAuthDiagnostic({
        flowId,
        step: 'auth_url_response',
        status: response.ok && data.authUrl ? 'ok' : 'error',
        errorMessage: response.ok ? null : data?.error || 'Failed to get auth URL',
        metadata: { status: response.status, hasAuthUrl: Boolean(data.authUrl) },
      });

      if (data.authUrl) {
        await recordAuthDiagnostic({
          flowId,
          step: 'redirect_to_battlenet',
          status: 'ok',
          metadata: { region: selectedRegion },
        });
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to get auth URL');
      }
    } catch (error: unknown) {
      cleanupOAuthParams();
      setDebugInfo(flowId, 'auth_url_error', 'error', error);
      await recordAuthDiagnostic({
        flowId,
        step: 'auth_url_error',
        status: 'error',
        errorMessage: getDiagnosticErrorMessage(error),
      });
      log.error('Battle.net auth error:', error);
      toast({
        title: t.auth.battlenetError,
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      setBnetLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
    } catch (error: unknown) {
      toast({
        title: t.common.error,
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state during Battle.net callback
  if (bnetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">{t.battlenet.connecting}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <CosmicBackground />

      {/* Main Content */}
      <PageContainer width="full" className="flex-1 flex flex-col items-center justify-center py-8 pt-20 relative z-10">
        {/* Grid for Card alignment only */}
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Left Column - Branding (visible on lg+) */}
          <div className="hidden lg:flex flex-col items-start gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-primary/20 border border-primary/30">
                <Shield className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-4xl font-display text-foreground">{sm('auth.brand')}</h1>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold text-foreground">
                {t.auth.loginTitle}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                {t.auth.bnetNote}
              </p>
            </div>
          </div>

          {/* Right Column - Auth Form (Card only for alignment) */}
          <div className="flex flex-col items-center lg:items-stretch">
            
            {/* Mobile Header */}
            <div className="lg:hidden text-center space-y-2 mb-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-primary" />
                <span className="text-2xl font-display text-foreground">{sm('auth.brand')}</span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                {t.auth.loginTitle}
              </h1>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {t.auth.bnetNote}
              </p>
            </div>

            <GlowCard className="w-full max-w-md p-6 sm:p-8">
              {/* Region Selector */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="auth-region" className="text-sm text-muted-foreground">{t.battlenet.selectRegion}</Label>
                <Select value={selectedRegion} onValueChange={value => setSelectedRegion(value as BattleNetRegion)}>
                  <SelectTrigger id="auth-region" className="w-full bg-card/60 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_REGIONS.map(region => (
                      <SelectItem key={region} value={region}>
                        {REGION_LABELS[region]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Battle.net Button - Primary */}
              <CosmicButton
                type="button"
                className="w-full"
                size="lg"
                onClick={handleBattleNetLogin}
                disabled={bnetLoading}
                icon={<BattleNetIcon className="h-6 w-6" />}
              >
                {t.auth.loginWithBattleNet}
              </CosmicButton>

              {battleNetDebugInfo && (
                <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">Flow ID: {battleNetDebugInfo.flowId}</span>
                    <Button type="button" size="sm" variant="outline" onClick={copyDebugInfo}>
                      {t.common.copy}
                    </Button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-3 text-muted-foreground bg-[hsl(var(--card))]">{t.auth.orContinueWith}</span>
                </div>
              </div>

              {/* Email Form - Collapsible */}
              <Collapsible open={emailFormOpen} onOpenChange={setEmailFormOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t.common.email}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${emailFormOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-4">
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.common.email}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={sm('auth.email_placeholder')}
                        required
                        className="bg-card/60 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t.common.password}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={sm('auth.password_placeholder')}
                        required
                        className="bg-card/60 border-border"
                      />
                    </div>

                    <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.login}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      {t.auth.existingAccountsOnly}
                    </p>
                  </form>
                </CollapsibleContent>
              </Collapsible>
            </GlowCard>
          </div>
        </div>

        {/* Back Button - Outside grid, aligned under card */}
        <div className="w-full max-w-5xl mt-4 grid lg:grid-cols-2 gap-8 lg:gap-16">
          <div className="hidden lg:block" /> {/* Spacer for left column */}
          <div className="flex justify-center lg:justify-start">
            <div className="w-full max-w-md flex justify-center">
              <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t.common.back}
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
};

export default Auth;
