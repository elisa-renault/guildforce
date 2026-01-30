-- Reassign all references from an old profile ID to a new auth user ID.
-- This supports re-linking data when a new auth.user is created for an existing profile.
create or replace function public.reassign_profile_id(old_id uuid, new_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  cols text;
  r record;
begin
  if old_id is null or new_id is null or old_id = new_id then
    return;
  end if;

  -- Create a new profile row if it doesn't exist, copying all columns from the old profile.
  if not exists (select 1 from public.profiles where id = new_id) then
    select string_agg(quote_ident(column_name), ', ')
      into cols
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name <> 'id';

    execute format(
      'insert into public.profiles (id, %s) select $1, %s from public.profiles where id = $2 on conflict (id) do nothing',
      cols,
      cols
    )
    using new_id, old_id;
  end if;

  -- Update all foreign keys referencing public.profiles(id)
  for r in
    select n.nspname as schema_name,
           c.relname as table_name,
           a.attname as column_name
    from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'public.profiles'::regclass
  loop
    execute format('update %I.%I set %I = $1 where %I = $2',
      r.schema_name, r.table_name, r.column_name, r.column_name)
    using new_id, old_id;
  end loop;

  delete from public.profiles where id = old_id;
end;
$$;
