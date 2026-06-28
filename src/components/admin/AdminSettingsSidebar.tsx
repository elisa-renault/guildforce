import { LayoutDashboard, Users, Shield, FileText, Bug, Trash2, Settings, BookOpen, ScrollText, Download, AlertTriangle } from 'lucide-react';
import { useLayoutEffect, useState, RefObject } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { navItemClass } from '@/lib/nav-styles';
import { cn } from '@/lib/utils';

export type AdminSection = 'dashboard' | 'users' | 'permissions' | 'guilds' | 'legal' | 'patchnotes' | 'bugs' | 'client-errors' | 'deletions' | 'docs' | 'backup';

interface SectionConfig {
  id: AdminSection;
  labelKey: Parameters<typeof resolveSemanticMessage>[0]['key'];
  icon: React.ElementType;
  category: 'overview' | 'management' | 'content' | 'support';
  requiresAdmin?: boolean;
  allowsModerator?: boolean;
}

const SECTIONS: SectionConfig[] = [
  { id: 'dashboard', labelKey: 'admin.sidebar.section.dashboard', icon: LayoutDashboard, category: 'overview', allowsModerator: true },
  { id: 'docs', labelKey: 'admin.sidebar.section.docs', icon: BookOpen, category: 'overview', requiresAdmin: true },
  { id: 'users', labelKey: 'admin.sidebar.section.users', icon: Users, category: 'management', requiresAdmin: true },
  { id: 'permissions', labelKey: 'admin.sidebar.section.permissions', icon: Settings, category: 'management', requiresAdmin: true },
  { id: 'guilds', labelKey: 'admin.sidebar.section.guilds', icon: Shield, category: 'management', requiresAdmin: true },
  { id: 'backup', labelKey: 'admin.sidebar.section.backup', icon: Download, category: 'management', requiresAdmin: true },
  { id: 'legal', labelKey: 'admin.sidebar.section.legal', icon: FileText, category: 'content', requiresAdmin: true },
  { id: 'patchnotes', labelKey: 'admin.sidebar.section.patchnotes', icon: ScrollText, category: 'content', requiresAdmin: true },
  { id: 'bugs', labelKey: 'admin.sidebar.section.bugs', icon: Bug, category: 'support', allowsModerator: true },
  { id: 'client-errors', labelKey: 'admin.sidebar.section.client_errors', icon: AlertTriangle, category: 'support', allowsModerator: true },
  { id: 'deletions', labelKey: 'admin.sidebar.section.deletions', icon: Trash2, category: 'support', requiresAdmin: true },
];

const CATEGORIES: Record<SectionConfig['category'], Parameters<typeof resolveSemanticMessage>[0]['key']> = {
  overview: 'admin.sidebar.category.overview',
  management: 'admin.sidebar.category.management',
  content: 'admin.sidebar.category.content',
  support: 'admin.sidebar.category.support',
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
  const location = useLocation();
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();
  const [tabsTop, setTabsTop] = useState<number>(64);
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const designSystemLabel = 'Global Design System';
  const isDesignSystemRoute = location.pathname.startsWith('/admin/design-system');

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
        className="fixed left-0 right-0 z-30 border-b border-border/35 bg-background/95 backdrop-blur-sm px-3"
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
                  className={cn(navItemClass({ active: isActive, size: 'xs' }), 'shrink-0')}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{sm(section.labelKey)}</span>
                </button>
              );
            })}
            <Link
              to="/admin/design-system"
              className={cn(navItemClass({ active: isDesignSystemRoute, size: 'xs' }), 'shrink-0')}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{designSystemLabel}</span>
            </Link>
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
                {sm(categoryLabel)}
              </h3>
              <div className="space-y-0.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => onSectionChange(section.id)}
                      className={cn(navItemClass({ active: isActive, size: 'sm', fullWidth: true, justifyStart: true }), 'text-left')}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{sm(section.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="pt-2 border-t border-border/40">
          <Link
            to="/admin/design-system"
            className={cn(navItemClass({ active: isDesignSystemRoute, size: 'sm', fullWidth: true, justifyStart: true }), 'text-left')}
          >
            <BookOpen className="h-4 w-4 flex-shrink-0" />
            <span>{designSystemLabel}</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
};
