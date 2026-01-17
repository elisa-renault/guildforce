import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Beer, Cookie, Globe } from 'lucide-react';
import { TipeeeIcon } from './TipeeeIcon';
import { openCookiePreferences } from './CookieBanner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const languages = [
  { code: 'fr' as const, label: 'Français' },
  { code: 'en' as const, label: 'English' },
];

export const Footer = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <footer className="relative z-10 border-t border-border/30 bg-background/60 backdrop-blur-md mt-auto">
      <div className="container mx-auto px-4 py-5">
        {/* Desktop: Single row with 4 logical groups */}
        <div className="hidden md:flex items-center justify-between">
          {/* Group 1: Identité (Branding) */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground/80">Guildforce</span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/15 text-primary border border-primary/25">
              Alpha
            </span>
            <span className="text-xs text-muted-foreground/60">© {new Date().getFullYear()}</span>
          </div>

          {/* Group 2: Navigation légale (pure links) */}
          <div className="flex items-center gap-4 text-xs">
            <Link to="/legal" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.legalNotice}
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.privacyPolicy}
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.termsOfService}
            </Link>
          </div>

          {/* Group 3: Préférences (user settings) */}
          <div className="flex items-center gap-3">
            <Select value={language} onValueChange={(value: 'fr' | 'en') => setLanguage(value)}>
              <SelectTrigger className="w-[120px] h-7 bg-transparent border-none text-muted-foreground hover:text-foreground text-xs gap-1.5 px-2">
                <Globe className="h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={openCookiePreferences}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Cookie className="h-3.5 w-3.5" />
              <span>{t.cookies.manageCookies}</span>
            </button>
          </div>

          {/* Group 4: Support (CTA) */}
          <a
            href="https://fr.tipeee.com/elsia/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-all border border-border/50 hover:border-primary"
          >
            <TipeeeIcon className="h-3.5 w-3.5" />
            <Beer className="h-3.5 w-3.5" />
            <span>{t.common.tipMe}</span>
          </a>
        </div>

        {/* Mobile: Stacked layout with logical grouping */}
        <div className="flex flex-col gap-3.5 md:hidden">
          {/* Row 1: Identité + Support CTA */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground/80">Guildforce</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/15 text-primary border border-primary/25">
                Alpha
              </span>
            </div>
            <div className="w-px h-4 bg-border/40" />
            <a
              href="https://fr.tipeee.com/elsia/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-primary-foreground hover:bg-primary transition-all border border-border/50 hover:border-primary"
            >
              <TipeeeIcon className="h-3.5 w-3.5" />
              <Beer className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Row 2: Préférences (Langue + Cookies) */}
          <div className="flex items-center justify-center gap-3">
            <Select value={language} onValueChange={(value: 'fr' | 'en') => setLanguage(value)}>
              <SelectTrigger className="w-[115px] h-7 bg-transparent border-border/50 text-muted-foreground text-xs rounded-full px-2.5 gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={openCookiePreferences}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50"
            >
              <Cookie className="h-3.5 w-3.5" />
              <span>{t.cookies.manageCookies}</span>
            </button>
          </div>

          {/* Row 3: Navigation légale */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
            <Link to="/legal" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.legalNotice}
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.privacyPolicy}
            </Link>
            <span className="text-muted-foreground/30">•</span>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.termsOfService}
            </Link>
          </div>

          {/* Row 4: Copyright */}
          <div className="text-center text-[10px] text-muted-foreground/50">
            © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </footer>
  );
};
