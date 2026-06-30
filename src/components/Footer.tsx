import { Beer, Cookie, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

import { openCookiePreferences } from './CookieBanner';
import { DiscordIcon } from './DiscordIcon';
import { LanguageDisplayLabel } from './LanguageDisplayLabel';
import { TipeeeIcon } from './TipeeeIcon';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLanguageDisplayLabel, LANGUAGE_OPTIONS, isSupportedLanguage } from '@/i18n/config';
import { resolveSemanticMessage } from '@/i18n/semantic';

const DISCORD_INVITE_URL = 'https://discord.gg/b3AZKC8qHd';

export const Footer = () => {
  const { language, setLanguage, t } = useLanguage();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const year = new Date().getFullYear();
  const legalLinks = [
    { to: '/legal', label: t.legal.legalNotice },
    { to: '/privacy', label: t.legal.privacyPolicy },
    { to: '/terms', label: t.legal.termsOfService },
    { to: '/changelog', label: t.patchnotes.changelog },
  ];
  const linkClassName =
    'rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';
  const ctaBaseClassName =
    'inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-full border px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <footer className="relative z-10 mt-auto border-t border-border/30 bg-background/70 backdrop-blur-md">
      <div className="container mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 lg:justify-start">
            <span className="text-sm font-semibold text-foreground/85">{sm('footer.brand')}</span>
            <span className="rounded border border-primary/45 bg-primary/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
              Alpha
            </span>
            <span className="text-xs text-muted-foreground/80">© {year}</span>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ctaBaseClassName} border-primary/55 bg-primary/90 text-primary-foreground shadow-sm shadow-primary/10 hover:bg-primary hover:shadow-primary/20`}
            >
              <DiscordIcon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{t.common.joinDiscord}</span>
            </a>
            <a
              href="https://fr.tipeee.com/elsia/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${ctaBaseClassName} border-border/55 bg-background/25 text-muted-foreground hover:border-primary/60 hover:bg-primary/10 hover:text-foreground`}
            >
              <TipeeeIcon className="h-4 w-4 shrink-0" />
              <Beer className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{t.common.tipMe}</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/20 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <nav className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs leading-tight lg:justify-start">
            {legalLinks.map((link) => (
              <Link key={link.to} to={link.to} className={linkClassName}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center lg:justify-end">
            <span id="footer-language-label" className="sr-only">{t.profile.language}</span>
            <Select value={language} onValueChange={(value) => isSupportedLanguage(value) && setLanguage(value)}>
              <SelectTrigger
                aria-label={t.profile.language}
                aria-labelledby="footer-language-label"
                className="h-9 w-full min-w-0 justify-start gap-2 rounded-full border-border/55 bg-background/25 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:w-auto sm:min-w-[11.5rem]"
              >
                <Globe className="h-4 w-4 shrink-0" />
                <SelectValue placeholder={getLanguageDisplayLabel(language)} />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="pl-2 [&_[data-select-item-indicator]]:hidden"
                  >
                    <LanguageDisplayLabel language={lang.code} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={openCookiePreferences}
              className="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-full border border-border/55 bg-background/25 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
            >
              <Cookie className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{t.cookies.manageCookies}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
