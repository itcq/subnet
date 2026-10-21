const fs = require('node:fs');
const path = require('node:path');
const { describe, expect, it } = require('@jest/globals');

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261020000002_ranked_daily_challenge.sql',
);
const conflictFixMigrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20261021000003_fix_ranked_daily_round_conflict.sql',
);
const pgTapPath = path.resolve(
  process.cwd(),
  'supabase/tests/database/ranked_daily_challenge.test.sql',
);

function readRequired(filePath) {
  expect(fs.existsSync(filePath)).toBe(true);
  return fs.readFileSync(filePath, 'utf8').toLowerCase();
}

describe('ranked daily challenge database contract', () => {
  it('stores private server-owned challenge and attempt records with account deletion cascades', () => {
    const sql = readRequired(migrationPath);

    expect(sql).toContain('create table public.ranked_timed_challenges');
    expect(sql).toContain('create table public.ranked_daily_rounds');
    expect(sql).toContain('create table public.ranked_timed_attempts');
    expect(sql).toContain('references auth.users (id) on delete cascade');
    expect(sql).toContain('unique (user_id, challenge_date)');
    expect(sql).toContain('check (time_limit_seconds = 120)');
    expect(sql).toContain('alter table public.ranked_timed_challenges force row level security');
    expect(sql).toContain('alter table public.ranked_timed_attempts force row level security');
    expect(sql).toContain('revoke all on table public.ranked_timed_challenges from authenticated');
    expect(sql).toContain('revoke all on table public.ranked_timed_attempts from authenticated');
  });

  it('uses identity-bound RPCs and server time instead of trusting client scores or elapsed time', () => {
    const sql = readRequired(migrationPath);

    expect(sql).toContain('function public.start_ranked_timed_attempt(expected_user_id uuid)');
    expect(sql).toContain('function public.submit_ranked_timed_answer(');
    expect(sql).toContain('function public.get_ranked_timed_leaderboard(expected_user_id uuid)');
    expect(sql.match(/if auth\.uid\(\) is distinct from expected_user_id then/g)?.length).toBeGreaterThanOrEqual(3);
    expect(sql.match(/security definer/g)?.length).toBeGreaterThanOrEqual(3);
    expect(sql.match(/set search_path = ''/g)?.length).toBeGreaterThanOrEqual(3);
    expect(sql).toContain('clock_timestamp()');
    expect(sql).toContain("at time zone 'utc'");
    expect(sql).toContain('host(network(set_masklen(');
    expect(sql).toContain('order by random()');
    expect(sql).toContain("selected_attempt.failure_count >= 9");
    expect(sql).not.toMatch(/client_score|client_elapsed|reported_score|reported_elapsed/);
  });

  it('publishes only anonymous aliases and completed daily results through a bounded leaderboard', () => {
    const sql = readRequired(migrationPath);

    expect(sql).toContain('competition_alias');
    expect(sql).toContain('is_current_user');
    expect(sql).toContain("where attempt.status = 'correct'");
    expect(sql).toContain('limit 50');
    const leaderboardFunction = sql.slice(
      sql.indexOf('create or replace function public.get_ranked_timed_leaderboard'),
      sql.indexOf('revoke all on function public.start_ranked_timed_attempt'),
    );
    expect(leaderboardFunction).not.toContain('email');
    expect(sql).toContain('grant execute on function public.start_ranked_timed_attempt(uuid) to authenticated');
    expect(sql).toContain('grant execute on function public.submit_ranked_timed_answer(uuid, uuid, text) to authenticated');
    expect(sql).toContain('grant execute on function public.get_ranked_timed_leaderboard(uuid) to authenticated');
    expect(sql).not.toContain('to anon');
  });

  it('uses the named daily-round constraint to avoid PL/pgSQL output-column ambiguity', () => {
    const sql = readRequired(conflictFixMigrationPath);

    expect(sql).toContain('create or replace function public.start_ranked_timed_attempt(expected_user_id uuid)');
    expect(sql).toContain('on conflict on constraint ranked_daily_rounds_pkey do nothing');
    expect(sql).not.toContain('on conflict (challenge_date)');
  });

  it('covers ownership, anonymity, duplicate starts, server scoring, and cascade deletion in pgTAP', () => {
    const sql = readRequired(pgTapPath);

    expect(sql).toContain('anonymous sessions cannot start ranked attempts');
    expect(sql).toContain('an account cannot start another account ranked attempt');
    expect(sql).toContain('repeated starts resume the same daily attempt');
    expect(sql).toContain('incorrect answers never complete or score an attempt');
    expect(sql).toContain('the server computes a correct ranked score');
    expect(sql).toContain('leaderboard rows never expose account email');
    expect(sql).toContain('account deletion cascades through ranked attempts');
  });
});
