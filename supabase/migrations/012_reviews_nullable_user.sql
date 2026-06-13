-- Allow bot customers (no auth) to submit ratings
alter table reviews alter column user_id drop not null;
alter table reviews drop constraint if exists reviews_user_id_fkey;
