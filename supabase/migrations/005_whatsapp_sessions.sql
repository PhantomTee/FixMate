create table if not exists whatsapp_sessions (
  phone        text primary key,
  step         text not null default 'idle',
  context      jsonb not null default '{}',
  updated_at   timestamptz not null default now()
);
