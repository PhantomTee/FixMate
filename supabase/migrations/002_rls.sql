-- =============================================================
-- Handijob – Row Level Security
-- =============================================================
-- Principle: users see their own data; artisans see jobs assigned
-- to them; financial mutations go through server-side functions.
-- Admin access requires the service role (bypasses RLS entirely).
-- =============================================================

alter table users               enable row level security;
alter table artisans            enable row level security;
alter table job_requests        enable row level security;
alter table diagnoses           enable row level security;
alter table bookings            enable row level security;
alter table escrow_transactions enable row level security;
alter table messages            enable row level security;
alter table reviews             enable row level security;
alter table disputes            enable row level security;
alter table inventory_items     enable row level security;
alter table whatsapp_sessions   enable row level security;
alter table platform_config     enable row level security;

-- ── helpers ───────────────────────────────────────────────────
create or replace function my_artisan_id() returns uuid
language sql stable security definer as $$
  select id from artisans where user_id = auth.uid() limit 1;
$$;

-- ── users ─────────────────────────────────────────────────────
create policy "users: select own"  on users for select using (id = auth.uid());
create policy "users: insert own"  on users for insert with check (id = auth.uid());
create policy "users: update own"  on users for update using (id = auth.uid());

-- ── artisans ──────────────────────────────────────────────────
-- Public can list approved artisans (browse page)
create policy "artisans: public read approved"
  on artisans for select
  using (application_status = 'approved');

-- Own artisan record (all statuses)
create policy "artisans: own read all"
  on artisans for select
  using (user_id = auth.uid());

create policy "artisans: own update"
  on artisans for update
  using (user_id = auth.uid());

create policy "artisans: register"
  on artisans for insert
  with check (user_id = auth.uid());

-- ── job_requests ──────────────────────────────────────────────
create policy "jobs: user sees own"
  on job_requests for select
  using (user_id = auth.uid());

create policy "jobs: artisan sees assigned"
  on job_requests for select
  using (selected_artisan_id = my_artisan_id());

create policy "jobs: user creates"
  on job_requests for insert
  with check (user_id = auth.uid());

create policy "jobs: user updates own"
  on job_requests for update
  using (user_id = auth.uid());

-- ── diagnoses ─────────────────────────────────────────────────
create policy "diagnoses: user sees own"
  on diagnoses for select
  using (user_id = auth.uid());

create policy "diagnoses: artisan sees assigned"
  on diagnoses for select
  using (
    job_id in (
      select id from job_requests
      where selected_artisan_id = my_artisan_id()
    )
  );

create policy "diagnoses: user creates"
  on diagnoses for insert
  with check (user_id = auth.uid());

-- ── bookings ──────────────────────────────────────────────────
-- Read: both user and assigned artisan
create policy "bookings: user sees own"
  on bookings for select
  using (user_id = auth.uid());

create policy "bookings: artisan sees own"
  on bookings for select
  using (artisan_id = my_artisan_id());

-- Insert via service role only (from /api/bookings)
-- No client insert policy — mutations go through API routes

-- ── escrow_transactions ───────────────────────────────────────
create policy "escrow_tx: user reads own"
  on escrow_transactions for select
  using (
    booking_id in (select id from bookings where user_id = auth.uid())
  );

create policy "escrow_tx: artisan reads own"
  on escrow_transactions for select
  using (
    booking_id in (
      select id from bookings where artisan_id = my_artisan_id()
    )
  );

-- ── messages ──────────────────────────────────────────────────
create policy "messages: participants select"
  on messages for select
  using (
    job_id in (select id from job_requests where user_id = auth.uid())
    or job_id in (
      select id from job_requests
      where selected_artisan_id = my_artisan_id()
    )
  );

create policy "messages: participants insert"
  on messages for insert
  with check (
    job_id in (select id from job_requests where user_id = auth.uid())
    or job_id in (
      select id from job_requests
      where selected_artisan_id = my_artisan_id()
    )
  );

-- ── reviews ───────────────────────────────────────────────────
create policy "reviews: public read"   on reviews for select using (true);
create policy "reviews: user creates"  on reviews for insert with check (user_id = auth.uid());

-- ── disputes ──────────────────────────────────────────────────
create policy "disputes: user sees own"    on disputes for select using (user_id = auth.uid());
create policy "disputes: artisan sees own" on disputes for select using (artisan_id = my_artisan_id());
create policy "disputes: user creates"     on disputes for insert with check (user_id = auth.uid());

-- ── inventory_items ───────────────────────────────────────────
create policy "inventory: artisan manages"
  on inventory_items for all
  using (artisan_id = my_artisan_id())
  with check (artisan_id = my_artisan_id());

-- ── whatsapp_sessions ─────────────────────────────────────────
-- Only service role / API routes manage these
-- No client policies needed

-- ── platform_config ───────────────────────────────────────────
create policy "platform_config: read authenticated"
  on platform_config for select
  using (auth.role() = 'authenticated');
