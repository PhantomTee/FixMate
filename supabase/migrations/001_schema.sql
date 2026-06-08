-- =============================================================
-- Handijob – Initial schema
-- =============================================================

-- ── Enums ─────────────────────────────────────────────────────
create type artisan_category as enum (
  'Plumber','Electrician','AC Repair','Tailor','Generator Repair',
  'Cleaning','Shoemaker','Vulcanizer','Carpenter','Painter',
  'Mechanic','Hair Stylist','Other'
);

create type urgency_level       as enum ('High','Medium','Low');
create type supported_language  as enum ('English','Pidgin','Yoruba','Hausa','Igbo');
create type sender_type         as enum ('user','artisan','admin');
create type application_status  as enum ('pending','approved','rejected');
create type dispute_status      as enum ('open','resolved_refund','resolved_release');

create type job_status as enum (
  'diagnosed','booking_created','payment_pending','escrow_funded',
  'artisan_accepted','in_progress','artisan_completed','released',
  'disputed','refunded','declined','completed'
);

create type escrow_status as enum (
  'not_funded','payment_pending','funded','accepted',
  'in_progress','completed','released','disputed','refunded'
);

create type escrow_action_type as enum (
  'fund_escrow','artisan_accept','artisan_decline','mark_in_progress',
  'mark_completed','user_release','open_dispute','admin_refund',
  'admin_release','trust_adjustment'
);

-- ── Users (extends Supabase auth.users) ───────────────────────
create table users (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text        not null,
  phone                text        not null unique,
  location             text        not null default '',
  user_wallet_balance  integer     not null default 0,
  escrow_balance       integer     not null default 0,
  created_at           timestamptz not null default now()
);

-- ── Artisans ──────────────────────────────────────────────────
create table artisans (
  id                          uuid           primary key default gen_random_uuid(),
  user_id                     uuid           references auth.users(id) on delete set null,
  full_name                   text           not null,
  phone                       text           not null unique,
  category                    artisan_category not null,
  location                    text           not null,
  years_experience            integer        not null default 0,
  verification_id             text,
  skills                      text[]         not null default '{}',
  service_radius_km           integer        not null default 10,
  opay_phone                  text           not null default '',
  trust_score                 integer        not null default 60
                              check (trust_score between 0 and 100),
  completed_jobs              integer        not null default 0,
  is_verified                 boolean        not null default false,
  application_status          application_status not null default 'pending',
  artisan_pending_balance     integer        not null default 0,
  artisan_available_balance   integer        not null default 0,
  avatar                      text           not null default '',
  emergency_available         boolean        not null default false,
  service_areas               text[]         not null default '{}',
  rating                      numeric(3,2),
  created_at                  timestamptz    not null default now()
);

-- ── Job requests ──────────────────────────────────────────────
create table job_requests (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references users(id) on delete cascade,
  description         text        not null,
  image_provided      boolean     not null default false,
  location            text        not null,
  diagnosis_id        uuid,                    -- set after diagnosis
  selected_artisan_id uuid        references artisans(id),
  booking_id          uuid,                    -- set after booking
  status              job_status  not null default 'diagnosed',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Diagnoses (AI-generated) ──────────────────────────────────
create table diagnoses (
  id                          uuid              primary key default gen_random_uuid(),
  job_id                      uuid              not null references job_requests(id) on delete cascade,
  user_id                     uuid              not null references users(id),
  issue_title                 text              not null,
  summary                     text              not null,
  artisan_category            artisan_category  not null,
  urgency                     urgency_level     not null default 'Medium',
  estimated_min_naira         integer           not null default 0,
  estimated_max_naira         integer           not null default 0,
  estimated_labor_naira       integer           not null default 0,
  estimated_materials_naira   integer           not null default 0,
  safety_warning              text,
  first_aid_steps             text[]            not null default '{}',
  follow_up_questions         text[]            not null default '{}',
  artisan_brief               jsonb,
  language                    supported_language default 'English',
  created_at                  timestamptz       not null default now()
);

-- ── Bookings ──────────────────────────────────────────────────
create table bookings (
  id                   uuid           primary key default gen_random_uuid(),
  job_id               uuid           not null references job_requests(id) on delete cascade,
  user_id              uuid           not null references users(id),
  artisan_id           uuid           not null references artisans(id),
  quote_amount         integer        not null,
  user_fee             integer        not null default 0,
  artisan_fee          integer        not null default 0,
  total_charge         integer        not null,
  escrow_status        escrow_status  not null default 'not_funded',
  paystack_reference   text           unique,
  created_at           timestamptz    not null default now(),
  updated_at           timestamptz    not null default now()
);

-- ── Escrow transactions (immutable ledger) ────────────────────
create table escrow_transactions (
  id            uuid               primary key default gen_random_uuid(),
  reference     text               not null unique,
  booking_id    uuid               not null references bookings(id),
  job_id        uuid               not null references job_requests(id),
  action        escrow_action_type not null,
  amount        integer            not null,
  user_fee      integer            not null default 0,
  artisan_fee   integer            not null default 0,
  platform_fee  integer            not null default 0,
  actor         sender_type        not null,
  note          text               not null default '',
  created_at    timestamptz        not null default now()
);

-- ── Messages (job chat) ───────────────────────────────────────
create table messages (
  id           uuid        primary key default gen_random_uuid(),
  job_id       uuid        not null references job_requests(id) on delete cascade,
  sender_type  sender_type not null,
  text         text        not null,
  timestamp    timestamptz not null default now()
);

-- ── Reviews ───────────────────────────────────────────────────
create table reviews (
  id          uuid        primary key default gen_random_uuid(),
  job_id      uuid        not null references job_requests(id),
  artisan_id  uuid        not null references artisans(id),
  user_id     uuid        not null references users(id),
  rating      integer     not null check (rating between 1 and 5),
  comment     text        not null default '',
  created_at  timestamptz not null default now(),
  unique (job_id)
);

-- ── Disputes ──────────────────────────────────────────────────
create table disputes (
  id          uuid           primary key default gen_random_uuid(),
  job_id      uuid           not null references job_requests(id),
  booking_id  uuid           not null references bookings(id),
  user_id     uuid           not null references users(id),
  artisan_id  uuid           not null references artisans(id),
  reason      text           not null,
  status      dispute_status not null default 'open',
  created_at  timestamptz    not null default now()
);

-- ── Inventory items ───────────────────────────────────────────
create table inventory_items (
  id           uuid        primary key default gen_random_uuid(),
  artisan_id   uuid        not null references artisans(id) on delete cascade,
  name         text        not null,
  quantity     integer     not null default 0,
  unit         text        not null default 'pcs',
  low_stock_at integer     not null default 1,
  created_at   timestamptz not null default now()
);

-- ── WhatsApp sessions (bot state) ────────────────────────────
create table whatsapp_sessions (
  id               uuid        primary key default gen_random_uuid(),
  phone            text        not null unique,
  state            text        not null default 'idle',
  context          jsonb       not null default '{}',
  user_id          uuid        references users(id),
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- ── Platform config (single row, id=1) ───────────────────────
create table platform_config (
  id              integer primary key default 1 check (id = 1),
  fee_balance     integer       not null default 0,
  user_fee_pct    numeric(5,2)  not null default 2.00,
  artisan_fee_pct numeric(5,2)  not null default 10.00
);
insert into platform_config (id) values (1);

-- ── Indexes ───────────────────────────────────────────────────
create index on artisans (category, application_status);
create index on artisans (location);
create index on job_requests (user_id, status);
create index on job_requests (selected_artisan_id);
create index on bookings (user_id);
create index on bookings (artisan_id);
create index on messages (job_id, timestamp desc);
create index on escrow_transactions (booking_id, created_at desc);
create index on whatsapp_sessions (phone);

-- ── updated_at trigger ────────────────────────────────────────
create or replace function _update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_job_requests_updated_at
  before update on job_requests
  for each row execute function _update_updated_at();

create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function _update_updated_at();
