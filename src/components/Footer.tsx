import { useLanguage } from '@/contexts/LanguageContext';
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
  const { language, setLanguage } = useLanguage();

  return (
    <footer className="relative z-10 border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Guildforce
        </span>

        <Select value={language} onValueChange={(value: 'fr' | 'en') => setLanguage(value)}>
          <SelectTrigger className="w-[120px] h-9 bg-card border-border text-foreground">
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
    </footer>
  );
};
