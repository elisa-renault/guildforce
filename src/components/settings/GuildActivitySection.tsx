import { useLanguage } from '@/contexts/LanguageContext';
import { ActivityLog } from '@/components/dashboard/ActivityLog';

interface GuildActivitySectionProps {
  guildId: string;
}

export const GuildActivitySection = ({ guildId }: GuildActivitySectionProps) => {
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg">
        {language === 'fr' ? 'Journal d\'activité' : 'Activity Log'}
      </h2>
      
      <div className="min-h-[500px]">
        <ActivityLog guildId={guildId} />
      </div>
    </div>
  );
};
