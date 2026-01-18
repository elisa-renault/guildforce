import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Heart, Swords, Crosshair, CheckCircle, HelpCircle, XCircle, Pencil, ArrowLeft } from 'lucide-react';
import { CosmicButton } from '@/components/CosmicButton';
import { toSlug, getGuildPath } from '@/lib/guildSlug';
import { getClassById, getSpecById, Specialization } from '@/data/wowClasses';
import { WishValidationBadge } from '@/components/dashboard/WishValidationBadge';
import { ValidationStatus } from '@/types/guild';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBattletagVisibility } from '@/hooks/useBattletagVisibility';

interface WishChoice {
  choice_index: number;
  class_id: string;
  spec_ids: string[];
  comment: string | null;
  validation_status: ValidationStatus;
  validated_by: string | null;
  validated_at: string | null;
}

// Get the appropriate icon for a spec based on role and range
const getSpecIcon = (spec: Specialization) => {
  if (spec.role === 'tank') return Shield;
  if (spec.role === 'healer') return Heart;
  return spec.range === 'ranged' ? Crosshair : Swords;
};

const roleConfig: Record<string, { color: string }> = {
  tank: { color: 'text-tank' },
  healer: { color: 'text-healer' },
  dps: { color: 'text-dps' },
};

const MemberWishes = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, memberId } = useParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guild, setGuild] = useState<{ id: string; name: string; server: string; region: string } | null>(null);
  const [member, setMember] = useState<{ username: string; battletag: string | null; status: string } | null>(null);
  const [wishes, setWishes] = useState<WishChoice[]>([]);
  const [isGM, setIsGM] = useState(false);
  const [validatingWish, setValidatingWish] = useState<number | null>(null);
  
  // Use the centralized hook for BattleTag visibility
  // skipSelfCheck: true ensures user sees what OTHERS would see on their member page
  const { canSeeBattletag, isLoading: battletagLoading } = useBattletagVisibility(
    memberId,
    { skipSelfCheck: true }
  );

  // Handle back navigation - use history or fallback to roster page
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (guild) {
      navigate(`${getGuildPath(guild.region, guild.server, guild.name)}/roster`);
    }
  }, [navigate, guild]);

  useEffect(() => {
    if (!user || !regionSlug || !serverSlug || !guildSlug || !memberId) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      // Find guild by slugified region, server and name
      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, faction');
      
      const matchedGuild = allGuilds?.find(g => 
        toSlug(g.region || 'eu') === regionSlug &&
        toSlug(g.server) === serverSlug && 
        toSlug(g.name) === guildSlug
      );
      
      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }
      
      setGuild({ id: matchedGuild.id, name: matchedGuild.name, server: matchedGuild.server, region: matchedGuild.region || 'eu' });

      // Check if current user is GM
      if (user) {
        const { data: memberRole } = await supabase
          .from('guild_members')
          .select('role')
          .eq('guild_id', matchedGuild.id)
          .eq('user_id', user.id)
          .single();
        
        setIsGM(memberRole?.role === 'gm');
      }
      const { data: memberData } = await supabase
        .from('guild_members')
        .select('status, user_id')
        .eq('guild_id', matchedGuild.id)
        .eq('user_id', memberId)
        .single();

      if (!memberData) {
        navigate(getGuildPath(matchedGuild.region || 'eu', matchedGuild.server, matchedGuild.name));
        return;
      }

      // Get profile info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, battletag')
        .eq('id', memberId)
        .single();

      if (profileData) {
        setMember({
          username: profileData.username,
          battletag: profileData.battletag,
          status: memberData.status,
        });
      }

      // Get wishes with validation info
      const { data: wishesData } = await supabase
        .from('class_wishes')
        .select('choice_index, class_id, spec_ids, comment, validation_status, validated_by, validated_at')
        .eq('guild_id', matchedGuild.id)
        .eq('user_id', memberId)
        .order('choice_index');

      if (wishesData) {
        setWishes(wishesData.map(w => ({
          ...w,
          validation_status: (w.validation_status as ValidationStatus) || 'pending',
        })));
      }

      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, memberId, navigate]);

  // Handle validation
  const handleValidation = async (choiceIndex: number, status: ValidationStatus) => {
    if (!guild || !memberId || !user) return;
    
    setValidatingWish(choiceIndex);
    
    // Optimistic update
    setWishes(prev => prev.map(w => 
      w.choice_index === choiceIndex 
        ? { ...w, validation_status: status, validated_by: user.id, validated_at: new Date().toISOString() }
        : w
    ));

    const { error } = await supabase
      .from('class_wishes')
      .update({
        validation_status: status,
        validated_by: user.id,
        validated_at: new Date().toISOString(),
      })
      .eq('guild_id', guild.id)
      .eq('user_id', memberId)
      .eq('choice_index', choiceIndex);

    if (error) {
      toast.error(t.errors.generic);
      // Revert on error
      const { data } = await supabase
        .from('class_wishes')
        .select('choice_index, class_id, spec_ids, comment, validation_status, validated_by, validated_at')
        .eq('guild_id', guild.id)
        .eq('user_id', memberId)
        .order('choice_index');
      if (data) {
        setWishes(data.map(w => ({
          ...w,
          validation_status: (w.validation_status as ValidationStatus) || 'pending',
        })));
      }
    } else {
      const statusLabel = status === 'approved' 
        ? t.wishes.validation.approved
        : status === 'rejected'
        ? t.wishes.validation.rejected
        : t.wishes.validation.pending;
      toast.success(`${t.wishes.title.split(' ')[0]} ${statusLabel.toLowerCase()}`);
    }
    
    setValidatingWish(null);
  };

  const choiceLabels = [
    t.wishes.preferredChoice,
    t.wishes.secondChoice,
    t.wishes.thirdChoice,
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      {/* Header bar */}
      <div className="sticky top-14 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-3 md:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              title={t.common.back}
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{member?.username}</h1>
              {canSeeBattletag && member?.battletag && (
                <p className="text-xs text-muted-foreground">{member.battletag}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status badge */}
            {member && (
              <Badge 
                variant={member.status === 'confirmed' ? 'default' : 'outline'}
                className={cn(
                  "text-xs px-2 py-1",
                  member.status === 'confirmed' 
                    ? 'bg-healer/20 text-healer border-healer/30' 
                    : member.status === 'withdrawn'
                    ? 'bg-destructive/20 text-destructive border-destructive/30'
                    : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                )}
              >
                {member.status === 'confirmed' ? (
                  <><CheckCircle className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />{t.wishes.commitment.confirmed}</>
                ) : member.status === 'withdrawn' ? (
                  <><XCircle className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />{t.wishes.commitment.withdrawn}</>
                ) : (
                  <><HelpCircle className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />{t.wishes.commitment.undecided}</>
                )}
              </Badge>
            )}
            
            {/* Edit button for own wishes */}
            {user?.id === memberId && guild && (
              <CosmicButton
                size="sm"
                variant="outline"
                icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
                onClick={() => navigate(`${getGuildPath(guild.region, guild.server, guild.name)}/wishes`)}
              >
                {t.common.edit}
              </CosmicButton>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-4 relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-display cosmic-text">
            {user?.id === memberId 
              ? t.wishes.title 
              : `${t.wishes.wishesOf} ${member?.username || ''}`
            }
          </h2>
        </div>

        {wishes.length === 0 ? (
          <GlowCard className="p-6 text-center" hoverable={false}>
            <p className="text-muted-foreground">
              {t.wishes.noWishes}
            </p>
          </GlowCard>
        ) : (
          <div className="space-y-2">
            {wishes.map((wish, index) => {
              const cls = getClassById(wish.class_id);
              const specs = wish.spec_ids.map(id => getSpecById(id)).filter(Boolean) as Specialization[];

              return (
                <GlowCard key={wish.choice_index} className="p-3 md:p-4" hoverable={false}>
                  <div className="grid grid-cols-1 lg:grid-cols-[40px_200px_1fr_1fr_auto] gap-3 lg:gap-4 items-center">
                    {/* Choice number */}
                    <div className="hidden lg:flex w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 items-center justify-center border border-primary/20">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>

                    {/* Class */}
                    {cls ? (
                      <div 
                        className="h-9 w-full rounded-md flex items-center px-3 text-sm font-medium"
                        style={{ 
                          backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
                          color: `hsl(var(--class-${cls.id}))`
                        }}
                      >
                        <span className="lg:hidden mr-2 text-xs text-muted-foreground">#{index + 1}</span>
                        {cls.name[language]}
                      </div>
                    ) : (
                      <div className="h-9 w-full rounded-md border border-dashed border-muted-foreground/20 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground/50">—</span>
                      </div>
                    )}

                    {/* Specs */}
                    {specs.length > 0 ? (
                      <div className="h-9 w-full rounded-md border border-border bg-card/50 flex items-center px-3 gap-3 overflow-x-auto">
                        {specs.map((spec, idx) => {
                          const config = roleConfig[spec.role];
                          const Icon = getSpecIcon(spec);
                          return (
                            <span key={spec.id} className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                              {idx > 0 && <span className="text-muted-foreground/50 mr-1">•</span>}
                              <Icon className={cn("h-4 w-4 flex-shrink-0", config.color)} />
                              <span className="text-foreground">{spec.name[language]}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-9 w-full rounded-md border border-dashed border-muted-foreground/20 flex items-center justify-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground/30" />
                        <Heart className="h-4 w-4 text-muted-foreground/30" />
                        <Swords className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Comment */}
                    {wish.comment ? (
                      <div className="h-9 w-full rounded-md border border-border bg-card/50 flex items-center px-3">
                        <span className="text-sm text-foreground truncate">{wish.comment}</span>
                      </div>
                    ) : (
                      <div className="h-9 w-full rounded-md border border-dashed border-muted-foreground/20 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground/50">—</span>
                      </div>
                    )}

                    {/* Validation badge */}
                    <div className="flex justify-end lg:justify-center">
                      <WishValidationBadge
                        status={wish.validation_status}
                        validatedBy={wish.validated_by}
                        validatedAt={wish.validated_at}
                        isGM={isGM}
                        onValidate={isGM ? (status) => handleValidation(wish.choice_index, status) : undefined}
                        loading={validatingWish === wish.choice_index}
                      />
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MemberWishes;
