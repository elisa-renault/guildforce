import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, RotateCcw, Check, X } from 'lucide-react';
import { PermissionType, PermissionRule } from '@/hooks/useGuildPermissions';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionPresetsProps {
  onApplyPreset: (permissions: Record<PermissionType, Omit<PermissionRule, 'permission_type'>[]>) => void;
  onReset: () => void;
}

type PresetKey = 'officer' | 'wishes_mod' | 'polls_mod' | 'auditor';

interface Preset {
  labelEn: string;
  labelFr: string;
  descEn: string;
  descFr: string;
  permissions: PermissionType[];
  maxRankIndex: number;
  recommended?: boolean;
}

const PRESETS: Record<PresetKey, Preset> = {
  officer: {
    labelEn: 'Officer',
    labelFr: 'Officier',
    descEn: 'Full management except members',
    descFr: 'Gestion complète sauf membres',
    permissions: ['manage_wishes', 'manage_polls', 'manage_rosters', 'view_activity_log'],
    maxRankIndex: 2,
    recommended: true,
  },
  wishes_mod: {
    labelEn: 'Wishes Moderator',
    labelFr: 'Modérateur Vœux',
    descEn: 'Manage wishes only',
    descFr: 'Gérer les vœux uniquement',
    permissions: ['manage_wishes'],
    maxRankIndex: 3,
  },
  polls_mod: {
    labelEn: 'Polls Moderator',
    labelFr: 'Modérateur Sondages',
    descEn: 'Manage polls only',
    descFr: 'Gérer les sondages uniquement',
    permissions: ['manage_polls'],
    maxRankIndex: 3,
  },
  auditor: {
    labelEn: 'Auditor',
    labelFr: 'Auditeur',
    descEn: 'View-only access to logs',
    descFr: 'Accès lecture seule aux logs',
    permissions: ['view_activity_log'],
    maxRankIndex: 4,
  },
};

const ALL_PERMISSIONS: { type: PermissionType; labelEn: string; labelFr: string }[] = [
  { type: 'manage_wishes', labelEn: 'Manage wishes', labelFr: 'Gérer les vœux' },
  { type: 'manage_polls', labelEn: 'Manage polls', labelFr: 'Gérer les sondages' },
  { type: 'manage_rosters', labelEn: 'Manage rosters', labelFr: 'Gérer les rosters' },
  { type: 'view_activity_log', labelEn: 'View activity log', labelFr: 'Voir le journal' },
  { type: 'manage_members', labelEn: 'Manage members', labelFr: 'Gérer les membres' },
];

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

  const PresetPreview = ({ presetKey }: { presetKey: PresetKey }) => {
    const preset = PRESETS[presetKey];
    const included = preset.permissions;
    const excluded = ALL_PERMISSIONS.filter(p => !included.includes(p.type));

    return (
      <div className="space-y-3 min-w-[180px]">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isFrench ? preset.labelFr : preset.labelEn}
          </span>
          {preset.recommended && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {isFrench ? 'Recommandé' : 'Recommended'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isFrench ? preset.descFr : preset.descEn}
        </p>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-green-500 flex items-center gap-1">
            <Check className="h-3 w-3" />
            {isFrench ? 'Peut :' : 'Can:'}
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
            {included.map(perm => {
              const p = ALL_PERMISSIONS.find(ap => ap.type === perm);
              return <li key={perm}>• {isFrench ? p?.labelFr : p?.labelEn}</li>;
            })}
          </ul>
        </div>
        {excluded.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-destructive flex items-center gap-1">
              <X className="h-3 w-3" />
              {isFrench ? 'Ne peut pas :' : 'Cannot:'}
            </p>
            <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
              {excluded.map(p => (
                <li key={p.type}>• {isFrench ? p.labelFr : p.labelEn}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground">
            {isFrench 
              ? `Rangs autorisés : 0 → ${preset.maxRankIndex}` 
              : `Allowed ranks: 0 → ${preset.maxRankIndex}`}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-muted/20 border border-border/30">
      <Wand2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
      
      <Select value={selectedPreset} onValueChange={(v) => setSelectedPreset(v as PresetKey)}>
        <SelectTrigger className="w-[140px] h-7 text-[11px] bg-card border-border">
          <SelectValue placeholder={isFrench ? 'Preset...' : 'Preset...'} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
            const preset = PRESETS[key];
            return (
              <HoverCard key={key} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <SelectItem value={key} className="text-xs hover:bg-primary/20 cursor-pointer">
                    <div className="flex items-center gap-1.5">
                      <span>{isFrench ? preset.labelFr : preset.labelEn}</span>
                      {preset.recommended && <span className="text-primary">★</span>}
                    </div>
                  </SelectItem>
                </HoverCardTrigger>
                <HoverCardContent side="right" align="start" className="w-auto p-3">
                  <PresetPreview presetKey={key} />
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </SelectContent>
      </Select>
      
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={handleApplyPreset}
        disabled={!selectedPreset}
        className="h-7 text-[11px] px-2"
      >
        {isFrench ? 'Appliquer' : 'Apply'}
      </Button>
      
      <div className="flex-1 min-w-0" />
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{isFrench ? 'Réinitialiser' : 'Reset'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
