begin;

create extension if not exists pgtap with schema extensions;
select plan(37);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'user-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'user-two@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'user-three@example.test');

insert into public.user_question_progress
  (user_id, catalog_version, question_ordinal, completed_at)
values
  ('11111111-1111-4111-8111-111111111111', '17dd300a', 1, '2026-01-01T00:00:00Z'),
  ('22222222-2222-4222-8222-222222222222', '17dd300a', 2, '2026-01-01T00:00:00Z');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  'select count(*) from public.profiles',
  array[1::bigint],
  'a user can read only their own profile'
);

select throws_ok(
  'select question_ordinal from public.user_question_progress order by question_ordinal',
  '42501',
  'permission denied for table user_question_progress',
  'clients cannot bypass atomic synchronization with direct progress reads'
);

select throws_ok(
  $$insert into public.user_question_progress
      (catalog_version, question_ordinal, completed_at)
    values ('17dd300a', 3, '2026-01-01T00:00:00Z')$$,
  '42501',
  'permission denied for table user_question_progress',
  'clients cannot bypass atomic synchronization with direct progress inserts'
);

select results_eq(
  $$select question_ordinal
    from public.sync_account_progress(
      '11111111-1111-4111-8111-111111111111',
      '17dd300a',
      '[{"catalog_version":"17dd300a","question_ordinal":3,"completed_at":"2026-01-01T00:00:00Z"}]'::jsonb
    )
    order by question_ordinal$$,
  array[1, 3],
  'an owner can atomically sync their own progress'
);

select is(
  (public.export_account_data('11111111-1111-4111-8111-111111111111')->>'schema_version')::integer,
  2,
  'an owner can export a versioned account-data document'
);

select results_eq(
  $$select (item->>'question_ordinal')::integer
    from jsonb_array_elements(
      public.export_account_data('11111111-1111-4111-8111-111111111111')->'synced_progress'
    ) as item
    order by 1$$,
  array[1, 3],
  'an account export contains only the owner synced progress'
);

select is(
  (select leaderboard_opt_in from public.profiles
   where id = '11111111-1111-4111-8111-111111111111'),
  false,
  'scoreboard participation defaults to disabled'
);

select lives_ok(
  $$select * from public.update_leaderboard_profile(
      '11111111-1111-4111-8111-111111111111',
      'Alpha Learner',
      true
    )$$,
  'an authenticated owner can opt into the scoreboard'
);

select results_eq(
  $$select public_name || ':' || leaderboard_opt_in::text
    from public.get_my_leaderboard_profile(
      '11111111-1111-4111-8111-111111111111'
    )$$,
  array['Alpha Learner:true'],
  'an owner can read their own scoreboard settings'
);

select is(
  public.export_account_data('11111111-1111-4111-8111-111111111111')
    ->'scoreboard'->>'public_name',
  'Alpha Learner',
  'an account export includes the owner public scoreboard name'
);

select is(
  (public.export_account_data('11111111-1111-4111-8111-111111111111')
    ->'scoreboard'->>'leaderboard_opt_in')::boolean,
  true,
  'an account export includes the owner scoreboard visibility choice'
);

select throws_ok(
  $$select * from public.update_leaderboard_profile(
      '22222222-2222-4222-8222-222222222222',
      'Stolen Name',
      true
    )$$,
  '42501',
  'account identity changed while updating scoreboard settings',
  'an account cannot change another account scoreboard settings'
);

select throws_ok(
  $$select * from public.update_leaderboard_profile(
      '11111111-1111-4111-8111-111111111111',
      'learner@example.test',
      true
    )$$,
  '22023',
  'public name must be 3 to 24 approved characters',
  'email addresses cannot be used as public scoreboard names'
);

select throws_ok(
  $$select public.export_account_data('22222222-2222-4222-8222-222222222222')$$,
  '42501',
  'account identity changed during export',
  'an account cannot export another account data'
);

select throws_ok(
  $$select public.delete_own_account('33333333-3333-4333-8333-333333333333')$$,
  '42501',
  'account identity changed during deletion',
  'an account cannot delete another account'
);

select throws_ok(
  $$select *
    from public.sync_account_progress(
      '22222222-2222-4222-8222-222222222222',
      '17dd300a',
      '[{"catalog_version":"17dd300a","question_ordinal":5,"completed_at":"2026-01-01T00:00:00Z"}]'::jsonb
    )$$,
  '42501',
  'account identity changed during synchronization',
  'an account switch cannot write the prior account progress'
);

select throws_ok(
  $$insert into public.user_question_progress
      (user_id, catalog_version, question_ordinal, completed_at)
    values (
      '22222222-2222-4222-8222-222222222222',
      '17dd300a',
      4,
      '2026-01-01T00:00:00Z'
    )$$,
  '42501',
  'permission denied for table user_question_progress',
  'a user cannot set the ownership column'
);

select throws_ok(
  $$insert into public.user_question_progress
      (user_id, catalog_version, question_ordinal, completed_at)
    values (
      '11111111-1111-4111-8111-111111111111',
      '17dd300a',
      5,
      '2026-01-01T00:00:00Z'
    )$$,
  '42501',
  'permission denied for table user_question_progress',
  'a user cannot set the ownership column to their own id'
);

select throws_ok(
  $$select * from public.sync_account_progress(
      '11111111-1111-4111-8111-111111111111',
      'unsupported',
      '[]'::jsonb
    )$$,
  '22023',
  'unsupported progress catalog',
  'a user cannot create rows outside the supported catalog'
);

select throws_like(
  $$select * from public.sync_account_progress(
      '11111111-1111-4111-8111-111111111111',
      '17dd300a',
      '[{"catalog_version":"17dd300a","question_ordinal":0,"completed_at":"2026-01-01T00:00:00Z"}]'::jsonb
    )$$,
  '%violates check constraint%',
  'question ordinals must not be below the supported catalog range'
);

select throws_like(
  $$select * from public.sync_account_progress(
      '11111111-1111-4111-8111-111111111111',
      '17dd300a',
      '[{"catalog_version":"17dd300a","question_ordinal":501,"completed_at":"2026-01-01T00:00:00Z"}]'::jsonb
    )$$,
  '%violates check constraint%',
  'question ordinals must not exceed the supported catalog range'
);

select throws_ok(
  $$update public.user_question_progress
      set completed_at = '2026-02-01T00:00:00Z'
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  'permission denied for table user_question_progress',
  'progress rows are append-only and cannot be updated by clients'
);

select throws_ok(
  $$update public.user_question_progress
      set completed_at = '2026-02-01T00:00:00Z'
    where user_id = '22222222-2222-4222-8222-222222222222'$$,
  '42501',
  'permission denied for table user_question_progress',
  $$a user cannot update another user's progress$$
);

select throws_ok(
  $$delete from public.user_question_progress
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501',
  'permission denied for table user_question_progress',
  'progress rows cannot be deleted directly by clients'
);

select throws_ok(
  $$delete from public.user_question_progress
    where user_id = '22222222-2222-4222-8222-222222222222'$$,
  '42501',
  'permission denied for table user_question_progress',
  $$a user cannot delete another user's progress$$
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

select lives_ok(
  $$select * from public.update_leaderboard_profile(
      '22222222-2222-4222-8222-222222222222',
      'Beta Learner',
      true
    )$$,
  'a second authenticated owner can opt into the scoreboard'
);

reset role;
set local role anon;

select results_eq(
  $$select public_name || ':' || rank_position::text || ':' || completed_count::text
    from public.list_global_scoreboard('17dd300a')
    order by rank_position, public_name$$,
  array['Alpha Learner:1:2', 'Beta Learner:2:1'],
  'anonymous viewers see only opted-in public names and verified completion totals'
);

select throws_ok(
  $$select * from public.get_my_leaderboard_profile(
      '11111111-1111-4111-8111-111111111111'
    )$$,
  '42501',
  'permission denied for function get_my_leaderboard_profile',
  'anonymous sessions cannot read private scoreboard settings'
);

select throws_ok(
  $$select * from public.update_leaderboard_profile(
      '11111111-1111-4111-8111-111111111111',
      'Anonymous Change',
      true
    )$$,
  '42501',
  'permission denied for function update_leaderboard_profile',
  'anonymous sessions cannot change scoreboard settings'
);

select throws_ok(
  $$select * from public.list_global_scoreboard('unsupported')$$,
  '22023',
  'unsupported progress catalog',
  'public scoreboard requests are restricted to the current catalog'
);

select throws_ok(
  'select count(*) from public.user_question_progress',
  '42501',
  'permission denied for table user_question_progress',
  'anonymous sessions cannot read progress'
);

select throws_ok(
  $$select *
    from public.sync_account_progress(
      '11111111-1111-4111-8111-111111111111',
      '17dd300a',
      '[]'::jsonb
    )$$,
  '42501',
  'permission denied for function sync_account_progress',
  'anonymous sessions cannot execute account synchronization'
);

select throws_ok(
  $$select public.export_account_data('11111111-1111-4111-8111-111111111111')$$,
  '42501',
  'permission denied for function export_account_data',
  'anonymous sessions cannot export account data'
);

select throws_ok(
  $$select public.delete_own_account('11111111-1111-4111-8111-111111111111')$$,
  '42501',
  'permission denied for function delete_own_account',
  'anonymous sessions cannot delete accounts'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select lives_ok(
  $$select public.delete_own_account('33333333-3333-4333-8333-333333333333')$$,
  'an authenticated owner can delete their own account'
);

reset role;

select is(
  (select count(*) from public.profiles
   where id = '33333333-3333-4333-8333-333333333333')
  +
  (select count(*) from public.user_question_progress
   where user_id = '33333333-3333-4333-8333-333333333333'),
  0::bigint,
  'self-service deletion cascades through profile and progress data'
);

delete from auth.users where id = '11111111-1111-4111-8111-111111111111';

select is(
  (select count(*) from public.profiles
   where id = '11111111-1111-4111-8111-111111111111')
  +
  (select count(*) from public.user_question_progress
   where user_id = '11111111-1111-4111-8111-111111111111'),
  0::bigint,
  'deleting an auth account cascades to its profile and progress'
);

select * from finish();
rollback;
