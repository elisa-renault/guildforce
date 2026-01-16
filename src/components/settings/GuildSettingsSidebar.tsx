import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { User, Shield, Users2, History, RefreshCw, Key } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export type SettingsSection = 'profile' | 'permissions' | 'rosters' | 'activity' | 'battlenet' | 'mypermissions';

interface SectionConfig {
  id: SettingsSection;
  labelEn: string;
  labelFr: string;
  icon: React.ElementType;
  category: 'guild' | 'management' | 'audit' | 'integration' | 'mypermissions';
}

const SECTIONS: SectionConfig[] = [
  { id: 'profile', labelEn: 'Profile', labelFr: 'Profil', icon: User, category: 'guild' },
  { id: 'permissions', labelEn: 'Permissions', labelFr: 'Permissions', icon: Shield, category: 'management' },
  { id: 'mypermissions', labelEn: 'My Permissions', labelFr: 'Mes permissions', icon: Key, category: 'mypermissions' },
  { id: 'rosters', labelEn: 'Rosters', labelFr: 'Rosters', icon: Users2, category: 'management' },
  { id: 'activity', labelEn: 'Activity', labelFr: 'Activité', icon: History, category: 'audit' },
  { id: 'battlenet', labelEn: 'Battle.net', labelFr: 'Battle.net', icon: RefreshCw, category: 'integration' },
];

const CATEGORIES = {
  mypermissions: { en: 'MY ACCESS', fr: 'MON ACCÈS' },
  guild: { en: 'GUILD', fr: 'GUILDE' },
  management: { en: 'MANAGEMENT', fr: 'GESTION' },
  audit: { en: 'AUDIT', fr: 'AUDIT' },
  integration: { en: 'INTEGRATION', fr: 'INTÉGRATION' },
};

interface GuildSettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  visibleSections: SettingsSection[];
}

export const GuildSettingsSidebar = ({
  activeSection,
  onSectionChange,
  visibleSections,
}: GuildSettingsSidebarProps) => {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [tabsTop, setTabsTop] = useState<number>(104);

  // Measure heights once on mount and on resize (not scroll) for fixed positioning
  useEffect(() => {
    if (!isMobile) return;

    const compute = () => {
      const subNav = document.querySelector<HTMLElement>('[data-guild-subnav]');
      const globalNav = document.querySelector<HTMLElement>('[data-global-nav]');
      
      const globalH = globalNav?.offsetHeight ?? 64;
      const subH = subNav?.offsetHeight ?? 40;
      const nextTop = globalH + subH;
      setTabsTop((prev) => (prev === nextTop ? prev : nextTop));
    };

    compute();
    window.addEventListener('resize', compute);

    const ro = new ResizeObserver(compute);
    const subNavEl = document.querySelector<HTMLElement>('[data-guild-subnav]');
    const globalNavEl = document.querySelector<HTMLElement>('[data-global-nav]');
    if (globalNavEl) ro.observe(globalNavEl);
    if (subNavEl) ro.observe(subNavEl);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [isMobile]);

  const visibleSectionConfigs = SECTIONS.filter(s => visibleSections.includes(s.id));

  // Group by category
  const sectionsByCategory = visibleSectionConfigs.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, SectionConfig[]>);

  // Mobile: fixed horizontal tabs - glued under sub-nav
  if (isMobile) {
    return (
      <>
        {/* Fixed tabs bar */}
        <div 
          className="fixed left-0 right-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm px-3" 
          style={{ top: tabsTop }}
        >
          <ScrollArea className="w-full">
            <div className="flex items-center gap-0.5 py-1.5">
              {visibleSectionConfigs.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => onSectionChange(section.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-primary/20 text-foreground ring-1 ring-primary/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{language === 'fr' ? section.labelFr : section.labelEn}</span>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        {/* Spacer to prevent content from being hidden under fixed tabs */}
        <div className="h-10" />
      </>
    );
  }

  // Desktop: vertical sidebar grouped by category
  return (
    <aside className="w-56 flex-shrink-0 bg-card/30 backdrop-blur-sm border-r border-border/50 py-4 px-2">
      <nav className="space-y-4">
        {(['mypermissions', 'guild', 'management', 'audit', 'integration'] as const).map((categoryKey) => {
          const sections = sectionsByCategory[categoryKey];
          if (!sections || sections.length === 0) return null;

          const categoryLabel = CATEGORIES[categoryKey];

          return (
            <div key={categoryKey}>
              <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {language === 'fr' ? categoryLabel.fr : categoryLabel.en}
              </h3>
              <div className="space-y-0.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => onSectionChange(section.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
                        isActive
                          ? "bg-primary/20 text-foreground ring-1 ring-primary/50"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{language === 'fr' ? section.labelFr : section.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
