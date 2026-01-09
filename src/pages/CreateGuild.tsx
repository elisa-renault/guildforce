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
import { Loader2, ArrowLeft, Shield } from 'lucide-react';

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

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', server: '', faction: 'alliance' as const },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Create guild
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

      // Add owner as GM member
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md glass">
        <CardHeader>
          <Button variant="ghost" size="sm" className="w-fit mb-2" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t.guild.create}
          </CardTitle>
          <CardDescription>Create a new guild to collect class wishes</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.guild.name}</FormLabel>
                  <FormControl><Input placeholder={t.guild.namePlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="server" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.guild.server}</FormLabel>
                  <FormControl><Input placeholder={t.guild.serverPlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="faction" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.guild.faction}</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="alliance" id="alliance" className="border-alliance text-alliance" />
                        <label htmlFor="alliance" className="text-alliance font-medium cursor-pointer">{t.guild.alliance}</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="horde" id="horde" className="border-horde text-horde" />
                        <label htmlFor="horde" className="text-horde font-medium cursor-pointer">{t.guild.horde}</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={loading}>
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
