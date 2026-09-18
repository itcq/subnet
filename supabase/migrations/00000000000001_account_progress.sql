-- Public account and synced-practice foundation.
-- These rows represent user-reported practice completion, not verified mastery.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.user_question_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  catalog_version text not null check (catalog_version = '17dd300a'),
  question_ordinal integer not null check (question_ordinal between 1 and 500),
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, catalog_version, question_ordinal)
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_question_progress enable row level security;
alter table public.user_question_progress force row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
revoke all on table public.user_question_progress from anon;
revoke all on table public.user_question_progress from authenticated;

grant select on table public.profiles to authenticated;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "progress_select_own"
on public.user_question_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "progress_insert_own"
on public.user_question_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.sync_account_progress(
  expected_user_id uuid,
  requested_catalog_version text,
  completion_rows jsonb
)
returns table (
  catalog_version text,
  question_ordinal integer,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed during synchronization'
      using errcode = '42501';
  end if;

  if requested_catalog_version is distinct from '17dd300a' then
    raise exception 'unsupported progress catalog'
      using errcode = '22023';
  end if;

  if completion_rows is null or jsonb_typeof(completion_rows) <> 'array' then
    raise exception 'completion rows must be an array'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(completion_rows) as item(
      catalog_version text,
      question_ordinal integer,
      completed_at timestamptz
    )
    where item.catalog_version is distinct from requested_catalog_version
  ) then
    raise exception 'completion row catalog does not match request'
      using errcode = '22023';
  end if;

  insert into public.user_question_progress (
    user_id,
    catalog_version,
    question_ordinal,
    completed_at
  )
  select
    expected_user_id,
    item.catalog_version,
    item.question_ordinal,
    item.completed_at
  from jsonb_to_recordset(completion_rows) as item(
    catalog_version text,
    question_ordinal integer,
    completed_at timestamptz
  )
  on conflict on constraint user_question_progress_pkey do nothing;

  return query
  select
    progress.catalog_version,
    progress.question_ordinal,
    progress.completed_at
  from public.user_question_progress as progress
  where progress.user_id = expected_user_id
    and progress.catalog_version = requested_catalog_version
  order by progress.question_ordinal;
end;
$$;

revoke all on function public.sync_account_progress(uuid, text, jsonb) from public;
grant execute on function public.sync_account_progress(uuid, text, jsonb) to authenticated;

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
  progress_rows jsonb;
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed during export'
      using errcode = '42501';
  end if;

  select users.email, profiles.created_at
    into account_email, profile_created_at
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
    'schema_version', 1,
    'exported_at', now(),
    'account', jsonb_build_object(
      'user_id', expected_user_id,
      'email', account_email,
      'created_at', profile_created_at
    ),
    'synced_progress', progress_rows
  );
end;
$$;

revoke all on function public.export_account_data(uuid) from public;
grant execute on function public.export_account_data(uuid) to authenticated;

create or replace function public.delete_own_account(
  expected_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is distinct from expected_user_id then
    raise exception 'account identity changed during deletion'
      using errcode = '42501';
  end if;

  delete from auth.users where id = expected_user_id;
  if not found then
    raise exception 'account is unavailable'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_own_account(uuid) from public;
grant execute on function public.delete_own_account(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
