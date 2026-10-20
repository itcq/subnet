begin;

-- Optional server-authoritative daily competition for signed-in learners.
-- Emails and answers are never published through the leaderboard contract.

alter table public.profiles
  add column competition_alias text
  default ('Subnetter-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));

update public.profiles
set competition_alias = 'Subnetter-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where competition_alias is null;

alter table public.profiles
  alter column competition_alias set not null;

alter table public.profiles
  add constraint profiles_competition_alias_key unique (competition_alias),
  add constraint profiles_competition_alias_format check (
    competition_alias ~ '^Subnetter-[A-F0-9]{8}$'
  );

create table public.ranked_timed_challenges (
  id smallint primary key,
  target_ip inet not null,
  prefix smallint not null check (prefix between 8 and 30),
  active boolean not null default true,
  unique (target_ip, prefix)
);

insert into public.ranked_timed_challenges (id, target_ip, prefix) values
  (1, '10.73.148.219', 24),
  (2, '172.21.199.44', 16),
  (3, '10.201.77.13', 8),
  (4, '192.168.83.214', 26),
  (5, '172.29.133.201', 20),
  (6, '10.145.222.91', 12),
  (7, '192.168.214.131', 27),
  (8, '172.18.245.190', 22),
  (9, '10.99.181.247', 14),
  (10, '192.168.37.126', 25),
  (11, '172.24.177.238', 18),
  (12, '10.188.64.173', 10),
  (13, '192.168.156.211', 28),
  (14, '172.30.91.155', 21),
  (15, '10.53.239.202', 13),
  (16, '192.168.109.245', 29),
  (17, '172.17.206.151', 19),
  (18, '10.224.117.63', 11),
  (19, '192.168.72.254', 30),
  (20, '172.27.143.231', 23),
  (21, '10.126.209.182', 15);

create table public.ranked_daily_rounds (
  challenge_date date primary key,
  challenge_id smallint not null references public.ranked_timed_challenges (id),
  created_at timestamptz not null default now()
);

create table public.ranked_timed_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_date date not null,
  challenge_id smallint not null references public.ranked_timed_challenges (id),
  started_at timestamptz not null,
  expires_at timestamptz not null,
  time_limit_seconds integer not null default 120 check (time_limit_seconds = 120),
  status text not null default 'active' check (status in ('active', 'correct', 'expired')),
  failure_count integer not null default 0 check (failure_count between 0 and 10),
  score integer check (score between 100 and 1000),
  elapsed_seconds integer check (elapsed_seconds between 0 and 120),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, challenge_date),
  check (expires_at = started_at + interval '120 seconds'),
  check (
    (status = 'correct' and score is not null and elapsed_seconds is not null and completed_at is not null)
    or
    (status in ('active', 'expired') and score is null and elapsed_seconds is null and completed_at is null)
  )
);

create index ranked_timed_attempts_daily_leaderboard_idx
  on public.ranked_timed_attempts (challenge_date, score desc, elapsed_seconds, completed_at)
  where status = 'correct';

alter table public.ranked_timed_challenges enable row level security;
alter table public.ranked_timed_challenges force row level security;
alter table public.ranked_daily_rounds enable row level security;
alter table public.ranked_daily_rounds force row level security;
alter table public.ranked_timed_attempts enable row level security;
alter table public.ranked_timed_attempts force row level security;

revoke all on table public.ranked_timed_challenges from anon;
revoke all on table public.ranked_timed_challenges from authenticated;
revoke all on table public.ranked_daily_rounds from anon;
revoke all on table public.ranked_daily_rounds from authenticated;
revoke all on table public.ranked_timed_attempts from anon;
revoke all on table public.ranked_timed_attempts from authenticated;

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
  on conflict (challenge_date) do nothing;

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

create or replace function public.submit_ranked_timed_answer(
  expected_user_id uuid,
  requested_attempt_id uuid,
  answer_text text
)
returns table (
  attempt_id uuid,
  challenge_date date,
  target_ip text,
  prefix integer,
  status text,
  expires_at timestamptz,
  failure_count integer,
  score integer,
  elapsed_seconds integer,
  answer_correct boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_timestamp_utc timestamptz := clock_timestamp();
  selected_attempt public.ranked_timed_attempts%rowtype;
  selected_challenge public.ranked_timed_challenges%rowtype;
  normalized_answer text;
  canonical_answer text;
  computed_elapsed_seconds integer;
  computed_score integer;
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed during ranked answer'
      using errcode = '42501';
  end if;

  if answer_text is null
    or length(answer_text) > 15
    or answer_text !~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' then
    raise exception 'ranked answer must be an IPv4 address'
      using errcode = '22023';
  end if;

  begin
    normalized_answer := host(answer_text::inet);
  exception when others then
    raise exception 'ranked answer must be an IPv4 address'
      using errcode = '22023';
  end;

  select attempt.*
    into selected_attempt
  from public.ranked_timed_attempts as attempt
  where attempt.id = requested_attempt_id
    and attempt.user_id = expected_user_id
  for update;

  if not found then
    raise exception 'ranked attempt is unavailable'
      using errcode = 'P0002';
  end if;

  select challenge.*
    into selected_challenge
  from public.ranked_timed_challenges as challenge
  where challenge.id = selected_attempt.challenge_id;

  if selected_attempt.status = 'active' and current_timestamp_utc >= selected_attempt.expires_at then
    update public.ranked_timed_attempts as attempt
    set status = 'expired'
    where attempt.id = selected_attempt.id;
    selected_attempt.status := 'expired';
  end if;

  canonical_answer := host(network(set_masklen(selected_challenge.target_ip, selected_challenge.prefix)));

  if selected_attempt.status = 'active' and normalized_answer = canonical_answer then
    computed_elapsed_seconds := greatest(
      0,
      least(
        selected_attempt.time_limit_seconds,
        floor(extract(epoch from (current_timestamp_utc - selected_attempt.started_at)))::integer
      )
    );
    computed_score := greatest(
      100,
      1000 - (computed_elapsed_seconds * 5) - (selected_attempt.failure_count * 100)
    );

    update public.ranked_timed_attempts as attempt
    set status = 'correct',
        score = computed_score,
        elapsed_seconds = computed_elapsed_seconds,
        completed_at = current_timestamp_utc
    where attempt.id = selected_attempt.id;
  elsif selected_attempt.status = 'active' and selected_attempt.failure_count >= 9 then
    update public.ranked_timed_attempts as attempt
    set failure_count = attempt.failure_count + 1,
        status = 'expired'
    where attempt.id = selected_attempt.id;
  elsif selected_attempt.status = 'active' then
    update public.ranked_timed_attempts as attempt
    set failure_count = attempt.failure_count + 1
    where attempt.id = selected_attempt.id;
  end if;

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
    attempt.elapsed_seconds,
    attempt.status = 'correct' and normalized_answer = canonical_answer
  from public.ranked_timed_attempts as attempt
  join public.ranked_timed_challenges as challenge on challenge.id = attempt.challenge_id
  where attempt.id = selected_attempt.id;
end;
$$;

create or replace function public.get_ranked_timed_leaderboard(expected_user_id uuid)
returns table (
  rank bigint,
  competition_alias text,
  score integer,
  elapsed_seconds integer,
  completed_at timestamptz,
  is_current_user boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_challenge_date date := (clock_timestamp() at time zone 'utc')::date;
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed during ranked leaderboard request'
      using errcode = '42501';
  end if;

  return query
  select
    ranked.rank,
    ranked.competition_alias,
    ranked.score,
    ranked.elapsed_seconds,
    ranked.completed_at,
    ranked.user_id = expected_user_id
  from (
    select
      row_number() over (
        order by attempt.score desc, attempt.elapsed_seconds, attempt.completed_at, attempt.id
      ) as rank,
      profile.competition_alias,
      attempt.score,
      attempt.elapsed_seconds,
      attempt.completed_at,
      attempt.user_id
    from public.ranked_timed_attempts as attempt
    join public.profiles as profile on profile.id = attempt.user_id
    where attempt.status = 'correct'
      and attempt.challenge_date = current_challenge_date
    order by attempt.score desc, attempt.elapsed_seconds, attempt.completed_at, attempt.id
    limit 50
  ) as ranked
  order by ranked.rank;
end;
$$;

revoke all on function public.start_ranked_timed_attempt(uuid) from public;
revoke all on function public.submit_ranked_timed_answer(uuid, uuid, text) from public;
revoke all on function public.get_ranked_timed_leaderboard(uuid) from public;
grant execute on function public.start_ranked_timed_attempt(uuid) to authenticated;
grant execute on function public.submit_ranked_timed_answer(uuid, uuid, text) to authenticated;
grant execute on function public.get_ranked_timed_leaderboard(uuid) to authenticated;

create or replace function public.export_account_data(
  expected_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
  profile_created_at timestamptz;
  account_competition_alias text;
  progress_rows jsonb;
  ranked_attempt_rows jsonb;
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed during export'
      using errcode = '42501';
  end if;

  select users.email, profiles.created_at, profiles.competition_alias
    into account_email, profile_created_at, account_competition_alias
  from auth.users as users
  join public.profiles as profiles on profiles.id = users.id
  where users.id = expected_user_id;

  if account_email is null then
    raise exception 'account data is unavailable'
      using errcode = 'P0002';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'catalog_version', progress.catalog_version,
        'question_ordinal', progress.question_ordinal,
        'completed_at', progress.completed_at,
        'created_at', progress.created_at
      ) order by progress.catalog_version, progress.question_ordinal
    ),
    '[]'::jsonb
  )
  into progress_rows
  from public.user_question_progress as progress
  where progress.user_id = expected_user_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'attempt_id', attempt.id,
        'challenge_date', attempt.challenge_date,
        'target_ip', host(challenge.target_ip),
        'prefix', challenge.prefix,
        'status', attempt.status,
        'failure_count', attempt.failure_count,
        'score', attempt.score,
        'elapsed_seconds', attempt.elapsed_seconds,
        'started_at', attempt.started_at,
        'expires_at', attempt.expires_at,
        'completed_at', attempt.completed_at
      ) order by attempt.challenge_date, attempt.started_at
    ),
    '[]'::jsonb
  )
  into ranked_attempt_rows
  from public.ranked_timed_attempts as attempt
  join public.ranked_timed_challenges as challenge on challenge.id = attempt.challenge_id
  where attempt.user_id = expected_user_id;

  return jsonb_build_object(
    'schema_version', 2,
    'exported_at', now(),
    'account', jsonb_build_object(
      'user_id', expected_user_id,
      'email', account_email,
      'created_at', profile_created_at,
      'competition_alias', account_competition_alias
    ),
    'synced_progress', progress_rows,
    'ranked_timed_attempts', ranked_attempt_rows
  );
end;
$$;

commit;
