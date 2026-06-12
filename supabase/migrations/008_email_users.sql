-- Allow email-only users (no phone number)
-- phone was NOT NULL UNIQUE which breaks for email signups

alter table users alter column phone drop not null;
alter table users alter column phone set default null;

-- Update the trigger so email users get NULL phone instead of ''
-- (multiple NULLs are allowed in a UNIQUE column; multiple '' are not)
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into users (id, name, phone, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    nullif(coalesce(new.phone, new.raw_user_meta_data->>'phone', ''), ''),
    coalesce(new.raw_user_meta_data->>'location', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
