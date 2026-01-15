import { useLanguage } from '@/contexts/LanguageContext';
import { Beer } from 'lucide-react';
import { TipeeeIcon } from './TipeeeIcon';
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
    <footer className="relative z-10 border-t border-border/50 bg-background/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Guildforce
        </span>

        <div className="flex items-center gap-3">
          <a
            href="https://fr.tipeee.com/elsiabeth/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
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
