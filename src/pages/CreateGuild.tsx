import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, Shield, Swords } from 'lucide-react';

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
  const isHordeFaction = selectedFaction === 'horde';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Background */}
      <div className={`fixed top-1/3 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-500 ${isHordeFaction ? 'bg-horde/20' : 'bg-alliance/20'}`} />
      <div className={`fixed bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-500 ${isHordeFaction ? 'bg-orange-500/15' : 'bg-blue-400/15'}`} />

      <Card className="w-full max-w-md glass-glow gradient-border relative z-10">
        <CardHeader className="text-center">
          <Button variant="ghost" size="sm" className="absolute left-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
          </Button>
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${isHordeFaction ? 'gradient-horde glow-horde' : 'gradient-alliance glow-alliance'}`}>
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">{t.guild.create}</CardTitle>
          <CardDescription>Create a new guild to collect class wishes</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.guild.name}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.guild.namePlaceholder} {...field} className="glass border-border/50 focus:border-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="server" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.guild.server}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.guild.serverPlaceholder} {...field} className="glass border-border/50 focus:border-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="faction" render={({ field }) => {
                const isAlliance = field.value === 'alliance';
                const isHorde = field.value === 'horde';
                return (
                  <FormItem>
                    <FormLabel>{t.guild.faction}</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4">
                        <label 
                          htmlFor="alliance" 
                          className={`flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                            isAlliance 
                              ? 'gradient-alliance glow-alliance border-alliance text-white' 
                              : 'glass border-border/50 hover:border-alliance/50'
                          }`}
                        >
                          <RadioGroupItem value="alliance" id="alliance" className="sr-only" />
                          <Shield className="h-5 w-5" />
                          <span className="font-semibold">{t.guild.alliance}</span>
                        </label>
                        <label 
                          htmlFor="horde" 
                          className={`flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all border-2 ${
                            isHorde 
                              ? 'gradient-horde glow-horde border-horde text-white' 
                              : 'glass border-border/50 hover:border-horde/50'
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
                );
              }} />

              <Button type="submit" className={`w-full mt-6 text-white ${isHordeFaction ? 'gradient-horde glow-horde' : 'gradient-alliance glow-alliance'}`} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.guild.create}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateGuild;
