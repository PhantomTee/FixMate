-- WhatsApp bot customers — no auth.users dependency
create table if not exists bot_customers (
  id         uuid        primary key default gen_random_uuid(),
  phone      text        not null unique,
  name       text        not null,
  location   text        not null default '',
  created_at timestamptz not null default now()
);

grant all on bot_customers to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
