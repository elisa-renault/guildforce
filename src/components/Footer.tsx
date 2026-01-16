import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Beer, Cookie } from 'lucide-react';
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
    <footer
      className="relative z-10 border-t border-border/50 bg-background/80 backdrop-blur-sm mt-auto"
      style={{ paddingBottom: 'var(--cookie-banner-offset, 0px)' }}
    >
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Guildforce
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-primary/20 text-primary border border-primary/30">
            Alpha
          </span>
          <span className="text-muted-foreground/50 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <Link to="/legal" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.legalNotice}
            </Link>
            <span className="text-muted-foreground/50">·</span>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.privacyPolicy}
            </Link>
            <span className="text-muted-foreground/50">·</span>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.legal.termsOfService}
            </Link>
            <span className="text-muted-foreground/50">·</span>
            <button
              onClick={openCookiePreferences}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Cookie className="h-3 w-3" />
              {t.cookies.manageCookies}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://fr.tipeee.com/elsiabeth/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-primary/20 transition-colors"
          >
            <TipeeeIcon className="h-4 w-4" />
            <Beer className="h-4 w-4" />
            <span>{t.common.tipMe}</span>
          </a>

          <Select value={language} onValueChange={(value: 'fr' | 'en') => setLanguage(value)}>
            <SelectTrigger className="w-[100px] h-8 bg-card border-border text-foreground text-sm">
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
        </div>
      </div>
    </footer>
  );
};
