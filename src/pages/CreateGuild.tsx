import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { ArrowLeft, Shield, Swords } from 'lucide-react';

const CreateGuild = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const schema = z.object({
    name: z.string().min(2, 'Guild name is required'),
    server: z.string().min(2, 'Server is required'),
    faction: z.enum(['horde', 'alliance']),
  });

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', server: '', faction: 'alliance' },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .insert({
          name: values.name,
          server: values.server,
          faction: values.faction,
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

  const selectedFaction = form.watch('faction');
  const isHorde = selectedFaction === 'horde';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <CosmicBackground variant={isHorde ? 'horde' : 'alliance'} />

      <GlowCard 
        className="w-full max-w-md p-8 relative z-10 animate-scale-in" 
        variant={isHorde ? 'horde' : 'alliance'}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute left-4 top-4 text-muted-foreground hover:text-foreground hover:bg-white/5" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
        </Button>

        <div className="text-center mb-8 pt-4">
          <div 
            className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${
              isHorde 
                ? 'gradient-horde shadow-horde/30' 
                : 'gradient-alliance shadow-alliance/30'
            }`}
          >
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t.guild.create}</h2>
          <p className="text-muted-foreground">Create a new guild to collect class wishes</p>
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

            <FormField control={form.control} name="faction" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">{t.guild.faction}</FormLabel>
                <FormControl>
                  <RadioGroup 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    className="grid grid-cols-2 gap-4"
                  >
                    <label 
                      htmlFor="alliance" 
                      className={`flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                        field.value === 'alliance' 
                          ? 'gradient-alliance glow-alliance border-alliance text-white' 
                          : 'bg-card/50 border-border/50 hover:border-alliance/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <RadioGroupItem value="alliance" id="alliance" className="sr-only" />
                      <Shield className="h-5 w-5" />
                      <span className="font-semibold">{t.guild.alliance}</span>
                    </label>
                    <label 
                      htmlFor="horde" 
                      className={`flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                        field.value === 'horde' 
                          ? 'gradient-horde glow-horde border-horde text-white' 
                          : 'bg-card/50 border-border/50 hover:border-horde/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <RadioGroupItem value="horde" id="horde" className="sr-only" />
                      <Swords className="h-5 w-5" />
                      <span className="font-semibold">{t.guild.horde}</span>
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <CosmicButton 
              type="submit" 
              className="w-full mt-6" 
              size="lg"
              variant={isHorde ? 'horde' : 'alliance'}
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
