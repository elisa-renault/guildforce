-- Rename discord_pseudo column to username
ALTER TABLE public.profiles RENAME COLUMN discord_pseudo TO username;

-- Update the trigger function to use the new column name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, preferred_language)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'discord_pseudo', new.email),
    COALESCE(new.raw_user_meta_data ->> 'preferred_language', 'fr')
  );
  RETURN new;
END;
$$;