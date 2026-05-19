import { User, Shield, Users2, History, RefreshCw, Key } from 'lucide-react';

import type { SettingsSection } from '@/lib/guildSettingsSections';
import type { ElementType } from 'react';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { cn } from '@/lib/utils';

export type { SettingsSection } from '@/lib/guildSettingsSections';

interface SectionConfig {
  id: SettingsSection;
  labelKey: Parameters<typeof resolveSemanticMessage>[0]['key'];
  icon: ElementType;
  category: 'guild' | 'management' | 'audit' | 'integration' | 'mypermissions';
}

const SECTIONS: SectionConfig[] = [
  { id: 'profile', labelKey: 'settings.sidebar.section.profile', icon: User, category: 'guild' },
  { id: 'permissions', labelKey: 'settings.sidebar.section.permissions', icon: Shield, category: 'management' },
  { id: 'mypermissions', labelKey: 'settings.sidebar.section.mypermissions', icon: Key, category: 'mypermissions' },
  { id: 'rosters', labelKey: 'settings.sidebar.section.rosters', icon: Users2, category: 'management' },
  { id: 'activity', labelKey: 'settings.sidebar.section.activity', icon: History, category: 'audit' },
  { id: 'battlenet', labelKey: 'settings.sidebar.section.battlenet', icon: RefreshCw, category: 'integration' },
];

const CATEGORIES: Record<SectionConfig['category'], Parameters<typeof resolveSemanticMessage>[0]['key']> = {
  mypermissions: 'settings.sidebar.category.mypermissions',
  guild: 'settings.sidebar.category.guild',
  management: 'settings.sidebar.category.management',
  audit: 'settings.sidebar.category.audit',
  integration: 'settings.sidebar.category.integration',
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
  const { language, t } = useLanguage();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

  const visibleSectionConfigs = SECTIONS.filter(s => visibleSections.includes(s.id));

  // Group by category
  const sectionsByCategory = visibleSectionConfigs.reduce((acc, section) => {
    if (!acc[section.category]) {
      acc[section.category] = [];
    }
    acc[section.category].push(section);
    return acc;
  }, {} as Record<string, SectionConfig[]>);

  return (
    <>
      <div className="sticky z-30 border-b border-border/50 bg-background/95 px-3 backdrop-blur-sm md:hidden top-[calc(7.5rem+var(--global-nav-extra-offset,0px))]">
        <ScrollArea className="w-full">
          <div className="flex items-center gap-0.5 py-1.5">
            {visibleSectionConfigs.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary/20 text-foreground ring-1 ring-primary/50'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{sm(section.labelKey)}</span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <aside className="hidden h-full min-h-0 w-64 shrink-0 border-r border-border/50 bg-card/30 backdrop-blur-sm md:block">
        <nav className="h-full overflow-y-auto p-3">
          <div className="space-y-5">
            {(['guild', 'management', 'audit', 'integration', 'mypermissions'] as const).map((categoryKey) => {
              const sections = sectionsByCategory[categoryKey];
              if (!sections || sections.length === 0) return null;

              const categoryLabel = CATEGORIES[categoryKey];

              return (
                <section key={categoryKey} className="space-y-2">
                  <h3 className="flex h-5 items-center px-3 text-xs font-semibold uppercase leading-none tracking-wider text-muted-foreground">
                    {sm(categoryLabel)}
                  </h3>
                  <div className="space-y-1">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.id;

                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => onSectionChange(section.id)}
                          className={cn(
                            'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary/20 text-foreground ring-1 ring-primary/50'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{sm(section.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
};
