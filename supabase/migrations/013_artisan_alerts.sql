create table if not exists artisan_alerts (
  id         uuid        primary key default gen_random_uuid(),
  phone      text        not null,
  category   text        not null,
  location   text        not null,
  notified   boolean     not null default false,
  created_at timestamptz not null default now()
);

grant all on artisan_alerts to anon, authenticated, service_role;
