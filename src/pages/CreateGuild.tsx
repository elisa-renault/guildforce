import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ArrowLeft } from 'lucide-react';

const CreateGuild = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const schema = z.object({
    name: z.string().min(2, 'Guild name is required'),
    server: z.string().min(2, 'Server is required'),
  });

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', server: '' },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .insert({
          name: values.name,
          server: values.server,
          faction: 'alliance', // Default value for database compatibility
          owner_id: user.id,
        })
        .select()
        .single();

      if (guildError) throw guildError;

      const { error: memberError } = await supabase
        .from('guild_members')
        .insert({
          guild_id: guild.id,
          user_id: user.id,
          role: 'gm',
          status: 'confirmed',
        });

      if (memberError) throw memberError;

      toast({ title: t.guild.guildCreated });
      navigate(`/guild/${guild.id}`);
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
          <h2 className="font-display text-2xl font-normal gradient-text">{t.guild.create}</h2>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t.guild.name}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={t.guild.namePlaceholder} 
                    {...field} 
                    className="cosmic-input h-12" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="server" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t.guild.server}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={t.guild.serverPlaceholder} 
                    {...field} 
                    className="cosmic-input h-12" 
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
              {t.guild.create}
            </CosmicButton>
          </form>
        </Form>
      </GlowCard>
    </div>
  );
};

export default CreateGuild;