-- ── Artisan columns for onboarding (Phase 2) & trust (Phase 3) ──

alter table artisans
  add column if not exists portfolio_photos  text[]  not null default '{}',
  add column if not exists callout_fee_naira integer not null default 0,
  add column if not exists daily_rate_naira  integer not null default 0,
  add column if not exists selfie_url        text    not null default '',
  add column if not exists badge             text    not null default 'Newbie',
  add column if not exists nin_verified      boolean not null default false,
  add column if not exists nin_reference     text;

-- ── Detailed action-based ratings (Phase 3) ──────────────────────

create table if not exists artisan_ratings (
  id           uuid        primary key default gen_random_uuid(),
  booking_id   uuid        not null references bookings(id)  on delete cascade,
  artisan_id   uuid        not null references artisans(id)  on delete cascade,
  user_id      uuid        not null references users(id)     on delete cascade,
  punctuality  integer     not null check (punctuality  between 1 and 5),
  neatness     integer     not null check (neatness     between 1 and 5),
  skill        integer     not null check (skill        between 1 and 5),
  attitude     integer     not null check (attitude     between 1 and 5),
  comment      text        not null default '',
  created_at   timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists artisan_ratings_artisan_idx on artisan_ratings (artisan_id);
create index if not exists artisan_ratings_user_idx    on artisan_ratings (user_id);

-- ── RLS for artisan_ratings ───────────────────────────────────────

alter table artisan_ratings enable row level security;

create policy "Users can insert their own ratings"
  on artisan_ratings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Ratings are publicly readable"
  on artisan_ratings for select
  using (true);

-- ── Badge auto-update function ────────────────────────────────────
-- Called after a new rating is inserted to recalculate badge tier

create or replace function update_artisan_badge()
returns trigger language plpgsql security definer as $$
declare
  avg_score numeric;
  job_count integer;
begin
  select avg((punctuality + neatness + skill + attitude)::numeric / 4),
         count(*)
  into   avg_score, job_count
  from   artisan_ratings
  where  artisan_id = new.artisan_id;

  update artisans
  set    badge = case
                   when job_count >= 10 and avg_score >= 4.5 then 'iSabi Pro'
                   when job_count >=  3 and avg_score >= 3.5 then 'Verified'
                   else 'Newbie'
                 end,
         rating = avg_score,
         completed_jobs = job_count
  where  id = new.artisan_id;

  return new;
end;
$$;

create trigger trg_update_artisan_badge
  after insert on artisan_ratings
  for each row execute function update_artisan_badge();
