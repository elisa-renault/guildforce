import { useLayoutEffect, useState, RefObject } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { LayoutDashboard, Users, Shield, FileText, Bug, Trash2, MessageSquare, Settings, BookOpen } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export type AdminSection = 'dashboard' | 'users' | 'permissions' | 'guilds' | 'forum' | 'legal' | 'bugs' | 'deletions' | 'docs';

interface SectionConfig {
  id: AdminSection;
  labelEn: string;
  labelFr: string;
  icon: React.ElementType;
  category: 'overview' | 'management' | 'content' | 'support';
  requiresAdmin?: boolean;
  allowsModerator?: boolean;
}

const SECTIONS: SectionConfig[] = [
  { id: 'dashboard', labelEn: 'Dashboard', labelFr: 'Tableau de bord', icon: LayoutDashboard, category: 'overview', allowsModerator: true },
  { id: 'docs', labelEn: 'Documentation', labelFr: 'Documentation', icon: BookOpen, category: 'overview', requiresAdmin: true },
  { id: 'users', labelEn: 'Users', labelFr: 'Utilisateurs', icon: Users, category: 'management', requiresAdmin: true },
  { id: 'permissions', labelEn: 'Permissions', labelFr: 'Permissions', icon: Settings, category: 'management', requiresAdmin: true },
  { id: 'guilds', labelEn: 'Guilds', labelFr: 'Guildes', icon: Shield, category: 'management', requiresAdmin: true },
  { id: 'forum', labelEn: 'Forum', labelFr: 'Forum', icon: MessageSquare, category: 'content', allowsModerator: true },
  { id: 'legal', labelEn: 'Legal Pages', labelFr: 'Pages légales', icon: FileText, category: 'content', requiresAdmin: true },
  { id: 'bugs', labelEn: 'Bug Reports', labelFr: 'Bugs', icon: Bug, category: 'support', allowsModerator: true },
  { id: 'deletions', labelEn: 'Deletions', labelFr: 'Suppressions', icon: Trash2, category: 'support', requiresAdmin: true },
];

const CATEGORIES = {
  overview: { en: 'OVERVIEW', fr: 'APERÇU' },
  management: { en: 'MANAGEMENT', fr: 'GESTION' },
  content: { en: 'CONTENT', fr: 'CONTENU' },
  support: { en: 'SUPPORT', fr: 'SUPPORT' },
};

interface AdminSettingsSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  isAdmin: boolean;
  isModerator: boolean;
  mobileTabsRef?: RefObject<HTMLDivElement>;
}

export const AdminSettingsSidebar = ({
  activeSection,
  onSectionChange,
  isAdmin,
  isModerator,
  mobileTabsRef,
}: AdminSettingsSidebarProps) => {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [tabsTop, setTabsTop] = useState<number>(64);

  useLayoutEffect(() => {
    if (!isMobile) return;

    const compute = () => {
      const globalNav = document.querySelector<HTMLElement>('[data-global-nav]');
      const globalH = globalNav?.offsetHeight ?? 64;
      setTabsTop(globalH);
    };

    requestAnimationFrame(compute);
    window.addEventListener('resize', compute);

    const ro = new ResizeObserver(compute);
    const globalNavEl = document.querySelector<HTMLElement>('[data-global-nav]');
    if (globalNavEl) ro.observe(globalNavEl);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [isMobile]);

  // Filter sections based on permissions
  const visibleSections = SECTIONS.filter(section => {
    if (isAdmin) return true;
    if (isModerator && section.allowsModerator) return true;
    return false;
  });

  // Group by category
  const sectionsByCategory = visibleSections.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, SectionConfig[]>);

  // Mobile: fixed horizontal tabs only (spacer is handled by parent)
  if (isMobile) {
    return (
      <div 
        ref={mobileTabsRef}
        className="fixed left-0 right-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-sm px-3" 
        style={{ top: tabsTop }}
      >
        <ScrollArea className="w-full">
          <div className="flex items-center gap-0.5 py-1.5">
            {visibleSections.map((section) => {
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
    );
  }

  // Desktop: vertical sidebar
  return (
    <aside className="w-56 flex-shrink-0 bg-card/30 backdrop-blur-sm border-r border-border/50 py-4 px-2">
      <nav className="space-y-4">
        {(['overview', 'management', 'content', 'support'] as const).map((categoryKey) => {
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
