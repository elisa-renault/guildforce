import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, RotateCcw } from 'lucide-react';
import { PermissionType, PermissionRule } from '@/hooks/useGuildPermissions';

interface PermissionPresetsProps {
  onApplyPreset: (permissions: Record<PermissionType, Omit<PermissionRule, 'permission_type'>[]>) => void;
  onReset: () => void;
}

type PresetKey = 'officer' | 'wishes_mod' | 'polls_mod' | 'auditor';

interface Preset {
  labelEn: string;
  labelFr: string;
  permissions: PermissionType[];
  maxRankIndex: number;
}

const PRESETS: Record<PresetKey, Preset> = {
  officer: {
    labelEn: 'Officer (all permissions)',
    labelFr: 'Officier (toutes les permissions)',
    permissions: ['manage_wishes', 'manage_polls', 'manage_rosters', 'view_activity_log', 'manage_members'],
    maxRankIndex: 2,
  },
  wishes_mod: {
    labelEn: 'Wishes Moderator',
    labelFr: 'Modérateur Vœux',
    permissions: ['manage_wishes'],
    maxRankIndex: 3,
  },
  polls_mod: {
    labelEn: 'Polls Moderator',
    labelFr: 'Modérateur Sondages',
    permissions: ['manage_polls'],
    maxRankIndex: 3,
  },
  auditor: {
    labelEn: 'Auditor (view only)',
    labelFr: 'Auditeur (lecture seule)',
    permissions: ['view_activity_log'],
    maxRankIndex: 4,
  },
};

export const PermissionPresets = ({ onApplyPreset, onReset }: PermissionPresetsProps) => {
  const { t } = useLanguage();
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | ''>('');
  
  const isFrench = t.common.loading === 'Chargement...';

  const handleApplyPreset = () => {
    if (!selectedPreset) return;
    
    const preset = PRESETS[selectedPreset];
    const allPermissionTypes: PermissionType[] = ['manage_wishes', 'manage_polls', 'manage_rosters', 'view_activity_log', 'manage_members'];
    
    const newPermissions: Record<PermissionType, Omit<PermissionRule, 'permission_type'>[]> = {} as any;
    
    allPermissionTypes.forEach(type => {
      if (preset.permissions.includes(type)) {
        newPermissions[type] = [{ access_type: 'rank', min_rank_index: 0, max_rank_index: preset.maxRankIndex }];
      } else {
        newPermissions[type] = [];
      }
    });
    
    onApplyPreset(newPermissions);
    setSelectedPreset('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/30">
      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-sm text-muted-foreground mr-1">
        {isFrench ? 'Appliquer un preset :' : 'Apply preset:'}
      </span>
      
      <Select value={selectedPreset} onValueChange={(v) => setSelectedPreset(v as PresetKey)}>
        <SelectTrigger className="w-[200px] h-8 text-xs bg-card border-border">
          <SelectValue placeholder={isFrench ? 'Sélectionner...' : 'Select...'} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <SelectItem key={key} value={key} className="text-xs hover:bg-primary/20">
              {isFrench ? PRESETS[key].labelFr : PRESETS[key].labelEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={handleApplyPreset}
        disabled={!selectedPreset}
        className="h-8 text-xs"
      >
        {isFrench ? 'Appliquer' : 'Apply'}
      </Button>
      
      <div className="flex-1" />
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 text-xs text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        {isFrench ? 'Réinitialiser' : 'Reset'}
      </Button>
    </div>
  );
};
