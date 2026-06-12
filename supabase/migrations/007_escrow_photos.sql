-- ── Booking columns for Phase 4 (before/after photos + auto-release) ──

alter table bookings
  add column if not exists before_photo         text        not null default '',
  add column if not exists after_photo          text        not null default '',
  add column if not exists payment_requested_at timestamptz,
  add column if not exists auto_release_at      timestamptz;
