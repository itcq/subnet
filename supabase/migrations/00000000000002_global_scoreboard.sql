-- Privacy-safe, opt-in public Journey scoreboard.
-- Public results expose only a learner-chosen name, rank, and completion count.
-- Emails and timestamps are never returned by the public function.

alter table public.profiles
  add column public_name text,
  add column leaderboard_opt_in boolean not null default false;

alter table public.profiles
  add constraint profiles_public_name_length
    check (public_name is null or char_length(public_name) between 3 and 24),
  add constraint profiles_public_name_trimmed
    check (public_name is null or public_name = btrim(public_name)),
  add constraint profiles_public_name_characters
    check (public_name is null or public_name ~ '^[[:alnum:] ._-]+$'),
  add constraint profiles_scoreboard_requires_name
    check (not leaderboard_opt_in or public_name is not null);

create unique index profiles_public_name_unique
  on public.profiles (lower(public_name))
  where public_name is not null;

create or replace function public.list_global_scoreboard(
  requested_catalog_version text
)
returns table (
  rank_position bigint,
  public_name text,
  completed_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if requested_catalog_version is distinct from '17dd300a' then
    raise exception 'unsupported progress catalog'
      using errcode = '22023';
  end if;

  return query
  with public_totals as (
    select
      profiles.public_name,
      count(progress.question_ordinal)::bigint as completed_count
    from public.profiles as profiles
    left join public.user_question_progress as progress
      on progress.user_id = profiles.id
      and progress.catalog_version = requested_catalog_version
    where profiles.leaderboard_opt_in
      and profiles.public_name is not null
    group by profiles.id, profiles.public_name
  )
  select
    rank() over (order by totals.completed_count desc)::bigint as rank_position,
    totals.public_name,
    totals.completed_count
  from public_totals as totals
  order by rank_position, lower(totals.public_name);
end;
$$;

revoke all on function public.list_global_scoreboard(text) from public;
grant execute on function public.list_global_scoreboard(text) to anon;
grant execute on function public.list_global_scoreboard(text) to authenticated;

create or replace function public.get_my_leaderboard_profile(
  expected_user_id uuid
)
returns table (
  public_name text,
  leaderboard_opt_in boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed while loading scoreboard settings'
      using errcode = '42501';
  end if;

  return query
  select profiles.public_name, profiles.leaderboard_opt_in
  from public.profiles as profiles
  where profiles.id = expected_user_id;
end;
$$;

revoke all on function public.get_my_leaderboard_profile(uuid) from public;
grant execute on function public.get_my_leaderboard_profile(uuid) to authenticated;

create or replace function public.update_leaderboard_profile(
  expected_user_id uuid,
  requested_public_name text,
  requested_opt_in boolean
)
returns table (
  public_name text,
  leaderboard_opt_in boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text;
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed while updating scoreboard settings'
      using errcode = '42501';
  end if;

  if requested_opt_in is null then
    raise exception 'scoreboard visibility is required'
      using errcode = '22023';
  end if;

  normalized_name := nullif(btrim(requested_public_name), '');

  if requested_opt_in and (
    normalized_name is null
    or char_length(normalized_name) not between 3 and 24
    or normalized_name !~ '^[[:alnum:] ._-]+$'
  ) then
    raise exception 'public name must be 3 to 24 approved characters'
      using errcode = '22023';
  end if;

  update public.profiles as profiles
  set
    public_name = case when requested_opt_in then normalized_name else null end,
    leaderboard_opt_in = requested_opt_in
  where profiles.id = expected_user_id;

  if not found then
    raise exception 'account profile is unavailable'
      using errcode = 'P0002';
  end if;

  return query
  select profiles.public_name, profiles.leaderboard_opt_in
  from public.profiles as profiles
  where profiles.id = expected_user_id;
end;
$$;

revoke all on function public.update_leaderboard_profile(uuid, text, boolean) from public;
grant execute on function public.update_leaderboard_profile(uuid, text, boolean) to authenticated;

-- Include scoreboard settings in a user's portable account export.
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
  profile_public_name text;
  profile_leaderboard_opt_in boolean;
  progress_rows jsonb;
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed during export'
      using errcode = '42501';
  end if;

  select
    users.email,
    profiles.created_at,
    profiles.public_name,
    profiles.leaderboard_opt_in
  into
    account_email,
    profile_created_at,
    profile_public_name,
    profile_leaderboard_opt_in
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
      )
      order by progress.catalog_version, progress.question_ordinal
    ),
    '[]'::jsonb
  )
  into progress_rows
  from public.user_question_progress as progress
  where progress.user_id = expected_user_id;

  return jsonb_build_object(
    'schema_version', 2,
    'exported_at', now(),
    'account', jsonb_build_object(
      'user_id', expected_user_id,
      'email', account_email,
      'created_at', profile_created_at
    ),
    'scoreboard', jsonb_build_object(
      'public_name', profile_public_name,
      'leaderboard_opt_in', profile_leaderboard_opt_in
    ),
    'synced_progress', progress_rows
  );
end;
$$;

revoke all on function public.export_account_data(uuid) from public;
grant execute on function public.export_account_data(uuid) to authenticated;
