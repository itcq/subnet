# Contributing

## Before starting

1. Read `docs/PROJECT_OVERVIEW.md`, `docs/ARCHITECTURE.md`, and `docs/DECISIONS.md`.
2. Check `docs/PROJECT_STATUS.md` and `ROADMAP.md` so planned work is not mistaken for implemented capability.
3. For Expo changes, use the exact SDK 57 documentation: https://docs.expo.dev/versions/v57.0.0/
4. Never add real user data or secrets to fixtures, screenshots, issues, commits, or documentation.

## Branch workflow

Use a short-lived branch from `main`:

```text
feature/passwordless-auth
feature/progress-outbox
fix/challenge-reset
security/rls-cross-user-tests
docs/backend-setup
```

Keep commits focused and written in imperative form. Do not mix unrelated refactors with behavior changes.

## Test-driven development

For each behavior or bug fix:

1. Add the smallest failing test.
2. Run it and confirm the expected failure.
3. Implement the minimum change.
4. Rerun the focused test.
5. Refactor without changing behavior.
6. Run the full quality gate.

Required before review:

```bash
npm run check
npm run export:web
git diff --check
```

Backend changes additionally require:

```bash
npm run backend:reset
npm run backend:test
```

Do not merge backend authorization changes when the database tests could not run.

## Architecture boundaries

- `src/domain/` contains pure framework-independent business logic.
- UI components may call domain functions but must not duplicate subnet answers.
- Session secrets use Expo SecureStore.
- Web Journey completion uses the versioned browser repository.
- Native SQLite remains dormant future infrastructure.
- Supabase service-role and email-provider credentials are server-only.
- The client cannot assign roles, authoritative progress, or permanent badges.
- RLS policies require explicit owner and cross-user tests.

## Pull-request checklist

- [ ] Behavior is covered by tests
- [ ] `npm run check` passes
- [ ] Production web export passes and includes `.nojekyll`
- [ ] Backend tests pass when schema/RLS changed
- [ ] No secrets or personal data added
- [ ] Documentation matches behavior
- [ ] Accessibility labels and states are preserved
- [ ] Offline behavior remains safe
- [ ] `CHANGELOG.md` updated for user-visible changes
- [ ] Migration/rollback notes included when needed

## Documentation standard

State whether a capability is:

- Implemented and verified
- Implemented but blocked from verification
- In progress
- Recommended/planned
- Explicitly out of scope

Never describe a planned backend, build, or release as operational.
