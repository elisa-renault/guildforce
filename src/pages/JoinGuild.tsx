import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { ArrowLeft, Users, KeyRound } from 'lucide-react';

const JoinGuild = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const schema = z.object({
    inviteKey: z.string().min(1, 'Invite key is required'),
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { inviteKey: searchParams.get('key') || '' },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .select('id, name')
        .eq('invite_key', values.inviteKey)
        .single();

      if (guildError || !guild) {
        toast({ title: t.guild.invalidKey, variant: 'destructive' });
        return;
      }

      const { data: existing } = await supabase
        .from('guild_members')
        .select('id')
        .eq('guild_id', guild.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        toast({ title: t.guild.alreadyMember, variant: 'destructive' });
        navigate(`/guild/${guild.id}`);
        return;
      }

      const { error: joinError } = await supabase
        .from('guild_members')
        .insert({
          guild_id: guild.id,
          user_id: user.id,
          role: 'member',
          status: 'potential',
        });

      if (joinError) throw joinError;

      toast({ title: t.guild.guildJoined });
      navigate(`/guild/${guild.id}/wishes`);
    } catch (error: any) {
      toast({ title: t.errors.generic, description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <CosmicBackground />

      <GlowCard className="w-full max-w-md p-8 relative z-10 animate-scale-in">
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-4 top-4 text-muted-foreground hover:text-foreground hover:bg-white/5" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} /> {t.common.back}
        </Button>

        <div className="text-center mb-8 pt-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-lg shadow-secondary/25">
            <Users className="h-8 w-8 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold cosmic-text mb-2">{t.guild.join}</h2>
          <p className="text-muted-foreground">Enter the invite key shared by your GM</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="inviteKey" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-foreground">
                  <KeyRound className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  {t.guild.inviteKey}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder={t.guild.inviteKeyPlaceholder} 
                    {...field} 
                    className="cosmic-input h-12 font-mono text-center tracking-wider"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <CosmicButton 
              type="submit" 
              className="w-full mt-6" 
              size="lg"
              loading={loading}
            >
              {t.guild.join}
            </CosmicButton>
          </form>
        </Form>
      </GlowCard>
    </div>
  );
};

export default JoinGuild;
