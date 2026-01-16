import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, ArrowLeft, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

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
  const { language } = useLanguage();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  if (loading) {
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
            {language === 'fr' ? 'Utilisateur introuvable' : 'User not found'}
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            {language === 'fr' 
              ? `L'utilisateur "${username}" n'existe pas.`
              : `The user "${username}" does not exist.`}
          </p>
          <CosmicButton onClick={() => navigate(-1)} icon={<ArrowLeft className="h-4 w-4" />}>
            {language === 'fr' ? 'Retour' : 'Go back'}
          </CosmicButton>
        </GlowCard>
      </div>
    );
  }

  const memberSince = format(new Date(profile.created_at), 'MMMM yyyy', { 
    locale: language === 'fr' ? fr : enUS 
  });

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-6 relative z-10">
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
              
              {profile.battletag && (
                <p className="text-sm text-muted-foreground mt-1">{profile.battletag}</p>
              )}
            </div>

            {/* Member since */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground border-t border-border pt-4">
              <Calendar className="h-4 w-4" />
              <span>
                {language === 'fr' ? 'Membre depuis' : 'Member since'} {memberSince}
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
              {language === 'fr' ? 'Retour' : 'Go back'}
            </CosmicButton>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicProfile;
