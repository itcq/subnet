begin;

-- PostgreSQL resolves PL/pgSQL output-column names alongside SQL identifiers.
-- Target the named primary-key constraint so challenge_date cannot be ambiguous.
create or replace function public.start_ranked_timed_attempt(expected_user_id uuid)
returns table (
  attempt_id uuid,
  challenge_date date,
  target_ip text,
  prefix integer,
  status text,
  expires_at timestamptz,
  failure_count integer,
  score integer,
  elapsed_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_timestamp_utc timestamptz := clock_timestamp();
  current_challenge_date date := (current_timestamp_utc at time zone 'utc')::date;
  selected_challenge_id smallint;
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed during ranked attempt'
      using errcode = '42501';
  end if;

  insert into public.ranked_daily_rounds (challenge_date, challenge_id)
  select current_challenge_date, challenge.id
  from public.ranked_timed_challenges as challenge
  where challenge.active
  order by random()
  limit 1
  on conflict on constraint ranked_daily_rounds_pkey do nothing;

  select round.challenge_id
    into selected_challenge_id
  from public.ranked_daily_rounds as round
  where round.challenge_date = current_challenge_date;

  if selected_challenge_id is null then
    raise exception 'ranked challenge is unavailable'
      using errcode = 'P0002';
  end if;

  insert into public.ranked_timed_attempts (
    user_id,
    challenge_date,
    challenge_id,
    started_at,
    expires_at
  ) values (
    expected_user_id,
    current_challenge_date,
    selected_challenge_id,
    current_timestamp_utc,
    current_timestamp_utc + interval '120 seconds'
  )
  on conflict on constraint ranked_timed_attempts_user_id_challenge_date_key do nothing;

  update public.ranked_timed_attempts as attempt
  set status = 'expired'
  where attempt.user_id = expected_user_id
    and attempt.challenge_date = current_challenge_date
    and attempt.status = 'active'
    and current_timestamp_utc >= attempt.expires_at;

  return query
  select
    attempt.id,
    attempt.challenge_date,
    host(challenge.target_ip),
    challenge.prefix::integer,
    attempt.status,
    attempt.expires_at,
    attempt.failure_count,
    attempt.score,
    attempt.elapsed_seconds
  from public.ranked_timed_attempts as attempt
  join public.ranked_timed_challenges as challenge on challenge.id = attempt.challenge_id
  where attempt.user_id = expected_user_id
    and attempt.challenge_date = current_challenge_date;
end;
$$;

commit;
