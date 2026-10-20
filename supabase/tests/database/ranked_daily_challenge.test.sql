begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'rank-one@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'rank-two@example.test'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'rank-three@example.test');

select matches(
  (select competition_alias from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  '^Subnetter-[A-F0-9]{8}$',
  'competition aliases are anonymous generated handles'
);

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select throws_ok(
  'select count(*) from public.ranked_timed_challenges',
  '42501',
  'permission denied for table ranked_timed_challenges',
  'clients cannot read the private ranked challenge catalog'
);

select throws_ok(
  'select count(*) from public.ranked_daily_rounds',
  '42501',
  'permission denied for table ranked_daily_rounds',
  'clients cannot read private daily challenge assignments'
);

select throws_ok(
  'select count(*) from public.ranked_timed_attempts',
  '42501',
  'permission denied for table ranked_timed_attempts',
  'clients cannot read ranked attempts directly'
);

select throws_ok(
  $$select * from public.start_ranked_timed_attempt('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501',
  'account identity changed during ranked attempt',
  'an account cannot start another account ranked attempt'
);

create temporary table first_start as
select * from public.start_ranked_timed_attempt('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

select is(
  (select count(*) from first_start),
  1::bigint,
  'an authenticated learner can start one daily ranked attempt'
);

select is(
  (select attempt_id from public.start_ranked_timed_attempt('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),
  (select attempt_id from first_start),
  'repeated starts resume the same daily attempt'
);

reset role;

select is(
  (select count(*) from public.ranked_timed_attempts where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1::bigint,
  'duplicate starts create only one server attempt'
);

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

create temporary table incorrect_result as
select * from public.submit_ranked_timed_answer(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select attempt_id from first_start),
  '255.255.255.255'
);

select is(
  (select status from incorrect_result),
  'active',
  'incorrect answers never complete or score an attempt'
);

select is(
  (select failure_count from incorrect_result),
  1,
  'the server counts an incorrect ranked answer'
);

select throws_ok(
  $$select * from public.submit_ranked_timed_answer(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      (select attempt_id from first_start),
      '10.0.0.0'
    )$$,
  '42501',
  'account identity changed during ranked answer',
  'an account cannot submit another account ranked answer'
);

select throws_ok(
  $$select * from public.submit_ranked_timed_answer(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      (select attempt_id from first_start),
      '999.999.999.999'
    )$$,
  '22023',
  'ranked answer must be an IPv4 address',
  'malformed IPv4 answers are rejected before scoring'
);

reset role;
update public.ranked_timed_attempts
set started_at = statement_timestamp() - interval '10 seconds',
    expires_at = statement_timestamp() + interval '110 seconds'
where id = (select attempt_id from first_start);
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

create temporary table correct_result as
select * from public.submit_ranked_timed_answer(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select attempt_id from first_start),
  host(network(set_masklen(
    (select target_ip from first_start)::inet,
    (select prefix from first_start)
  )))
);

select is(
  (select status from correct_result),
  'correct',
  'a canonical network address completes the ranked attempt'
);

select ok(
  (select score between 840 and 850 from correct_result),
  'the server computes a correct ranked score'
);

select is(
  (select count(*) from public.get_ranked_timed_leaderboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),
  1::bigint,
  'the daily leaderboard includes completed attempts only'
);

select is(
  (select competition_alias from public.get_ranked_timed_leaderboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')),
  (select competition_alias from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'leaderboard rows use the learner anonymous alias'
);

select ok(
  not ((select to_jsonb(entry) from public.get_ranked_timed_leaderboard('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') as entry) ? 'email'),
  'leaderboard rows never expose account email'
);

select throws_ok(
  $$select * from public.get_ranked_timed_leaderboard('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '42501',
  'account identity changed during ranked leaderboard request',
  'an account cannot request a leaderboard under another identity'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
create temporary table second_start as
select * from public.start_ranked_timed_attempt('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

select is(
  (select count(*) from public.get_ranked_timed_leaderboard('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  1::bigint,
  'an active unfinished attempt is not ranked'
);

reset role;
update public.ranked_timed_attempts
set started_at = statement_timestamp() - interval '121 seconds',
    expires_at = statement_timestamp() - interval '1 second'
where id = (select attempt_id from second_start);
set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select is(
  (select status from public.submit_ranked_timed_answer(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    (select attempt_id from second_start),
    host(network(set_masklen(
      (select target_ip from second_start)::inet,
      (select prefix from second_start)
    )))
  )),
  'expired',
  'answers submitted after the server deadline cannot score'
);

select lives_ok(
  $$select public.delete_own_account('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  'an owner can delete an account with ranked history'
);

reset role;

select is(
  (select count(*) from public.ranked_timed_attempts where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0::bigint,
  'account deletion cascades through ranked attempts'
);

set local role anon;

select throws_ok(
  $$select * from public.start_ranked_timed_attempt('cccccccc-cccc-4ccc-8ccc-cccccccccccc')$$,
  '42501',
  'permission denied for function start_ranked_timed_attempt',
  'anonymous sessions cannot start ranked attempts'
);

select throws_ok(
  $$select * from public.submit_ranked_timed_answer(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      gen_random_uuid(),
      '10.0.0.0'
    )$$,
  '42501',
  'permission denied for function submit_ranked_timed_answer',
  'anonymous sessions cannot submit ranked answers'
);

select throws_ok(
  $$select * from public.get_ranked_timed_leaderboard('cccccccc-cccc-4ccc-8ccc-cccccccccccc')$$,
  '42501',
  'permission denied for function get_ranked_timed_leaderboard',
  'anonymous sessions cannot read the ranked leaderboard'
);

reset role;
select * from finish();
rollback;
