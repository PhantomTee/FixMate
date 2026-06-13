-- Add missing profile columns to users table
alter table users
  add column if not exists avatar       text    not null default '',
  add column if not exists nin          text,
  add column if not exists nin_verified boolean not null default false;
