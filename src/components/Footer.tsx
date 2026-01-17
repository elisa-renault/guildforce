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
    <footer className="relative z-10 border-t border-border/30 bg-background/60 backdrop-blur-md mt-auto">
      <div className="container mx-auto px-4 py-6">
        {/* Desktop: Single row layout */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground/80">
              Guildforce
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/15 text-primary border border-primary/25">
              Alpha
            </span>
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()}
            </span>
          </div>

          {/* Center: Legal links */}
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
            <button
              onClick={openCookiePreferences}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Cookie className="h-3 w-3" />
              {t.cookies.manageCookies}
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <a
              href="https://fr.tipeee.com/elsiabeth/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all"
            >
              <TipeeeIcon className="h-3.5 w-3.5" />
              <Beer className="h-3.5 w-3.5" />
              <span>{t.common.tipMe}</span>
            </a>
            <div className="w-px h-4 bg-border/50" />
            <Select value={language} onValueChange={(value: 'fr' | 'en') => setLanguage(value)}>
              <SelectTrigger className="w-[90px] h-7 bg-transparent border-none text-muted-foreground hover:text-foreground text-xs gap-1 px-2">
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

        {/* Mobile: Stacked layout */}
        <div className="flex flex-col gap-4 md:hidden">
          {/* Top: Branding centered */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium text-foreground/80">
              Guildforce
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/15 text-primary border border-primary/25">
              Alpha
            </span>
          </div>

          {/* Middle: Actions */}
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://fr.tipeee.com/elsiabeth/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all border border-border/50"
            >
              <TipeeeIcon className="h-3.5 w-3.5" />
              <Beer className="h-3.5 w-3.5" />
              <span>{t.common.tipMe}</span>
            </a>
            <Select value={language} onValueChange={(value: 'fr' | 'en') => setLanguage(value)}>
              <SelectTrigger className="w-[90px] h-7 bg-transparent border-border/50 text-muted-foreground text-xs rounded-full px-3">
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

          {/* Bottom: Legal links */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px]">
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
            <span className="text-muted-foreground/30">•</span>
            <button
              onClick={openCookiePreferences}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Cookie className="h-3 w-3" />
              {t.cookies.manageCookies}
            </button>
          </div>

          {/* Copyright */}
          <div className="text-center text-[10px] text-muted-foreground/60">
            © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </footer>
  );
};
