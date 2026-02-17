import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { PageContainer } from '@/components/layout/PageContainer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { useBattletagVisibility } from '@/hooks/useBattletagVisibility';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { formatDateLocalized, interpolateMessage } from '@/i18n/format';

interface PublicProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  battletag: string | null;
  created_at: string;
}

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Use the centralized hook for BattleTag visibility
  // skipSelfCheck: true ensures user sees what OTHERS would see on their public profile
  const { canSeeBattletag, isLoading: battletagLoading } = useBattletagVisibility(
    profile?.id,
    { skipSelfCheck: true }
  );

  useEffect(() => {
    async function fetchProfile() {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, battletag, created_at')
          .ilike('username', username)
          .single();

        if (error || !data) {
          setNotFound(true);
        } else {
          setProfile(data);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [username]);

  if (loading || battletagLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <CosmicBackground />
        <GlowCard className="w-full max-w-md p-8 text-center relative z-10" hoverable={false}>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-display text-foreground mb-2">
            {t.errors.notFound}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {interpolateMessage(s('public_profile.user_not_found'), { username: username ?? '' })}
          </p>
          <CosmicButton onClick={() => navigate(-1)} icon={<ArrowLeft className="h-4 w-4" />}>
            {t.common.back}
          </CosmicButton>
        </GlowCard>
      </div>
    );
  }

  const memberSince = formatDateLocalized(profile.created_at, language, { month: 'long', year: 'numeric' });

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <PageContainer as="main" className="relative z-10 py-6" width="contained">
        <div className="max-w-md mx-auto">
          <GlowCard className="p-6" hoverable={false}>
            {/* Avatar and username */}
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="h-24 w-24 mb-4 border-2 border-primary/30">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-2xl">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <h1 className="text-2xl font-display text-foreground">{profile.username}</h1>
              
              {canSeeBattletag && profile.battletag && (
                <p className="text-sm text-muted-foreground mt-1">{profile.battletag}</p>
              )}
            </div>

            {/* Member since */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground border-t border-border pt-4">
              <Calendar className="h-4 w-4" />
              <span>
                {s('public_profile.member_since_prefix')} {memberSince}
              </span>
            </div>
          </GlowCard>

          {/* Back button */}
          <div className="mt-4 text-center">
            <CosmicButton 
              variant="outline" 
              onClick={() => navigate(-1)} 
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              {t.common.back}
            </CosmicButton>
          </div>
        </div>
      </PageContainer>
    </div>
  );
};

export default PublicProfile;
