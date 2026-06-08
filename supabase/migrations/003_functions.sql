-- =============================================================
-- Handijob – Server-side functions
-- =============================================================
-- These run as SECURITY DEFINER (bypass RLS) so the client
-- cannot manipulate escrow state directly. Called via:
--   supabase.rpc('perform_escrow_action', { ... })
-- =============================================================

create or replace function perform_escrow_action(
  p_booking_id  uuid,
  p_action      text,   -- matches escrow_action_type
  p_actor       text,   -- matches sender_type
  p_note        text    default ''
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking     bookings%rowtype;
  v_artisan_pay integer;
  v_plat_fee    integer;
  v_ref         text;
  v_seq         bigint;
begin
  -- Lock the row – prevents double-spend
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found: %', p_booking_id;
  end if;

  -- ── State machine ──────────────────────────────────────────
  case p_action

    when 'fund_escrow' then
      if v_booking.escrow_status != 'not_funded' then
        raise exception 'fund_escrow requires status=not_funded (got %)', v_booking.escrow_status;
      end if;
      update bookings set escrow_status='funded', updated_at=now() where id=p_booking_id;
      -- Deduct wallet, add to escrow
      update users set
        user_wallet_balance = user_wallet_balance - v_booking.total_charge,
        escrow_balance      = escrow_balance      + v_booking.total_charge
      where id = v_booking.user_id;

    when 'artisan_accept' then
      if v_booking.escrow_status != 'funded' then
        raise exception 'artisan_accept requires status=funded (got %)', v_booking.escrow_status;
      end if;
      update bookings set escrow_status='accepted', updated_at=now() where id=p_booking_id;

    when 'artisan_decline' then
      if v_booking.escrow_status not in ('not_funded','funded') then
        raise exception 'artisan_decline requires status in (not_funded, funded) (got %)', v_booking.escrow_status;
      end if;
      update bookings set escrow_status='refunded', updated_at=now() where id=p_booking_id;
      -- Refund user if money was held
      if v_booking.escrow_status = 'funded' then
        update users set
          user_wallet_balance = user_wallet_balance + v_booking.total_charge,
          escrow_balance      = escrow_balance      - v_booking.total_charge
        where id = v_booking.user_id;
      end if;

    when 'mark_in_progress' then
      if v_booking.escrow_status != 'accepted' then
        raise exception 'mark_in_progress requires status=accepted (got %)', v_booking.escrow_status;
      end if;
      update bookings set escrow_status='in_progress', updated_at=now() where id=p_booking_id;

    when 'mark_completed' then
      if v_booking.escrow_status != 'in_progress' then
        raise exception 'mark_completed requires status=in_progress (got %)', v_booking.escrow_status;
      end if;
      update bookings set escrow_status='completed', updated_at=now() where id=p_booking_id;

    when 'user_release' then
      if v_booking.escrow_status != 'completed' then
        raise exception 'user_release requires status=completed (got %)', v_booking.escrow_status;
      end if;
      v_plat_fee    := v_booking.artisan_fee;
      v_artisan_pay := v_booking.quote_amount - v_plat_fee;
      update bookings set escrow_status='released', updated_at=now() where id=p_booking_id;
      -- Clear user escrow, credit artisan, collect platform fee
      update users set
        escrow_balance = escrow_balance - v_booking.total_charge
      where id = v_booking.user_id;
      update artisans set
        artisan_available_balance = artisan_available_balance + v_artisan_pay,
        completed_jobs            = completed_jobs + 1
      where id = v_booking.artisan_id;
      update platform_config set fee_balance = fee_balance + v_plat_fee where id = 1;

    when 'open_dispute' then
      if v_booking.escrow_status not in ('funded','accepted','in_progress','completed') then
        raise exception 'open_dispute not allowed at status % ', v_booking.escrow_status;
      end if;
      update bookings set escrow_status='disputed', updated_at=now() where id=p_booking_id;
      insert into disputes (job_id, booking_id, user_id, artisan_id, reason)
      values (v_booking.job_id, p_booking_id, v_booking.user_id, v_booking.artisan_id, p_note);

    when 'admin_release' then
      if v_booking.escrow_status != 'disputed' then
        raise exception 'admin_release requires status=disputed (got %)', v_booking.escrow_status;
      end if;
      v_plat_fee    := v_booking.artisan_fee;
      v_artisan_pay := v_booking.quote_amount - v_plat_fee;
      update bookings set escrow_status='released', updated_at=now() where id=p_booking_id;
      update users set escrow_balance = escrow_balance - v_booking.total_charge where id = v_booking.user_id;
      update artisans set artisan_available_balance = artisan_available_balance + v_artisan_pay where id = v_booking.artisan_id;
      update platform_config set fee_balance = fee_balance + v_plat_fee where id = 1;
      update disputes set status='resolved_release' where booking_id=p_booking_id and status='open';

    when 'admin_refund' then
      if v_booking.escrow_status not in ('disputed','funded','accepted','in_progress','completed') then
        raise exception 'admin_refund not allowed at status %', v_booking.escrow_status;
      end if;
      update bookings set escrow_status='refunded', updated_at=now() where id=p_booking_id;
      update users set
        user_wallet_balance = user_wallet_balance + v_booking.total_charge,
        escrow_balance      = escrow_balance      - v_booking.total_charge
      where id = v_booking.user_id;
      update disputes set status='resolved_refund' where booking_id=p_booking_id and status='open';

    else
      raise exception 'Unknown escrow action: %', p_action;
  end case;

  -- ── Log the transaction ────────────────────────────────────
  select count(*) + 1 into v_seq from escrow_transactions;
  v_ref := 'HJ-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 5, '0');

  insert into escrow_transactions (
    reference, booking_id, job_id, action, amount,
    user_fee, artisan_fee, platform_fee, actor, note
  ) values (
    v_ref,
    p_booking_id,
    v_booking.job_id,
    p_action::escrow_action_type,
    v_booking.quote_amount,
    v_booking.user_fee,
    v_booking.artisan_fee,
    case when p_action in ('user_release','admin_release') then v_booking.artisan_fee else 0 end,
    p_actor::sender_type,
    p_note
  );

  -- Return the updated booking
  return (select row_to_json(b) from (select * from bookings where id = p_booking_id) b);
end;
$$;


-- ── Artisan matching (server-side scoring) ─────────────────────
create or replace function match_artisans(
  p_category  text,
  p_location  text   default '',
  p_limit     integer default 10
)
returns setof artisans
language sql
stable
security definer
set search_path = public
as $$
  select *
  from artisans
  where application_status = 'approved'
    and category = p_category::artisan_category
  order by
    (case when is_verified then 20 else 0 end)
    + trust_score * 0.3
    + least(completed_jobs, 100) * 0.1
    + (case when p_location != '' and location ilike '%' || split_part(p_location, ',', 1) || '%' then 15 else 0 end)
    desc
  limit p_limit;
$$;


-- ── Recalculate artisan rating after new review ────────────────
create or replace function _recalc_artisan_rating()
returns trigger language plpgsql as $$
begin
  update artisans
  set rating = (
    select round(avg(rating)::numeric, 2)
    from reviews where artisan_id = new.artisan_id
  )
  where id = new.artisan_id;
  return new;
end;
$$;

create trigger trg_reviews_rating
  after insert or update on reviews
  for each row execute function _recalc_artisan_rating();


-- ── Create user profile on signup ─────────────────────────────
-- Called by a Supabase Auth hook (set in dashboard under Auth > Hooks)
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into users (id, name, phone, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'location', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
