-- Create profiles table (enriched profile with Battle.net support)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  discord_pseudo TEXT NOT NULL,
  battletag TEXT,
  main_character_name TEXT,
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create guilds table
CREATE TABLE public.guilds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  server TEXT NOT NULL,
  faction TEXT NOT NULL CHECK (faction IN ('horde', 'alliance')),
  invite_key TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on guilds
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;

-- Guilds policies
CREATE POLICY "Guilds are viewable by everyone" ON public.guilds FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create guilds" ON public.guilds FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Guild owners can update their guilds" ON public.guilds FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Guild owners can delete their guilds" ON public.guilds FOR DELETE USING (auth.uid() = owner_id);

-- Create guild_members table
CREATE TABLE public.guild_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('gm', 'officer', 'member')),
  status TEXT NOT NULL DEFAULT 'potential' CHECK (status IN ('confirmed', 'potential')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guild_id, user_id)
);

-- Enable RLS on guild_members
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;

-- Guild members policies
CREATE POLICY "Guild members are viewable by guild members" ON public.guild_members 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = guild_id AND gm.user_id = auth.uid())
  );
CREATE POLICY "Users can join guilds" ON public.guild_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave guilds" ON public.guild_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "GMs can manage members" ON public.guild_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = guild_id AND gm.user_id = auth.uid() AND gm.role = 'gm')
);
CREATE POLICY "GMs can remove members" ON public.guild_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = guild_id AND gm.user_id = auth.uid() AND gm.role = 'gm')
);

-- Create characters table (alts management)
CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_id TEXT NOT NULL,
  level INTEGER DEFAULT 70,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Characters policies
CREATE POLICY "Users can view characters of guild members" ON public.characters FOR SELECT USING (true);
CREATE POLICY "Users can manage their own characters" ON public.characters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own characters" ON public.characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own characters" ON public.characters FOR DELETE USING (auth.uid() = user_id);

-- Create class_wishes table
CREATE TABLE public.class_wishes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES public.guilds ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  choice_index INTEGER NOT NULL CHECK (choice_index BETWEEN 1 AND 3),
  class_id TEXT NOT NULL,
  spec_ids TEXT[] NOT NULL DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guild_id, user_id, choice_index)
);

-- Enable RLS on class_wishes
ALTER TABLE public.class_wishes ENABLE ROW LEVEL SECURITY;

-- Class wishes policies
CREATE POLICY "Wishes viewable by guild members" ON public.class_wishes 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.guild_members gm WHERE gm.guild_id = guild_id AND gm.user_id = auth.uid())
  );
CREATE POLICY "Users can create their own wishes" ON public.class_wishes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wishes" ON public.class_wishes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wishes" ON public.class_wishes FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, discord_pseudo, preferred_language)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'discord_pseudo', new.email),
    COALESCE(new.raw_user_meta_data ->> 'preferred_language', 'fr')
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON public.guilds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_wishes_updated_at BEFORE UPDATE ON public.class_wishes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();