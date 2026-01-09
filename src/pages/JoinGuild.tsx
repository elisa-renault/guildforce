import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, Users } from 'lucide-react';

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
      // Find guild by invite key
      const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .select('id, name')
        .eq('invite_key', values.inviteKey)
        .single();

      if (guildError || !guild) {
        toast({ title: t.guild.invalidKey, variant: 'destructive' });
        return;
      }

      // Check if already member
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

      // Join guild
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md glass">
        <CardHeader>
          <Button variant="ghost" size="sm" className="w-fit mb-2" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t.common.back}
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t.guild.join}
          </CardTitle>
          <CardDescription>Enter the invite key shared by your GM</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="inviteKey" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.guild.inviteKey}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.guild.inviteKeyPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.guild.join}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinGuild;
