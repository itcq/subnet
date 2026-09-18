/* global describe, expect, it */

const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

function readProjectFile(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function readWorkflow(path) {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      "const fs=require('fs'); const {parse}=require('yaml'); process.stdout.write(JSON.stringify(parse(fs.readFileSync(process.argv[1], 'utf8'))));",
      path,
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Unable to parse workflow YAML');
  }
  return JSON.parse(result.stdout);
}

function validatePublicConfig(overrides = {}) {
  return spawnSync(process.execPath, ['scripts/validate-public-account-config.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      EXPO_PUBLIC_SUPABASE_URL: 'https://example-project.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${'a'.repeat(32)}`,
      EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: 'https://example.com/subnet/privacy',
      ...overrides,
    },
  });
}

describe('production GitHub Pages deployment', () => {
  it('builds only main at /subnet with every required public account value', () => {
    const workflowPath = join(process.cwd(), '.github/workflows/production.yml');
    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readProjectFile('.github/workflows/production.yml');
    const parsed = readWorkflow('.github/workflows/production.yml');
    expect(parsed.on.push.branches).toEqual(['main']);
    expect(parsed.on.push.paths).toBeUndefined();
    expect(parsed.jobs.build.if).toBe("github.ref == 'refs/heads/main'");
    expect(parsed.jobs.publish.if).toBe("github.ref == 'refs/heads/main'");
    expect(workflow).toContain('EXPO_PUBLIC_DEPLOY_BASE_URL: /subnet');
    expect(workflow).toContain('EXPO_PUBLIC_SUPABASE_URL: ${{ vars.EXPO_PUBLIC_SUPABASE_URL }}');
    expect(workflow).toContain(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ vars.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}',
    );
    expect(workflow).toContain(
      'EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: ${{ vars.EXPO_PUBLIC_ACCOUNT_PRIVACY_URL }}',
    );
    expect(workflow).toContain('node scripts/validate-public-account-config.mjs');
    expect(workflow).not.toContain('SERVICE_ROLE');
    expect(workflow).not.toContain('SECRET_KEY');
  });

  it('accepts only structurally valid browser-public production configuration', () => {
    expect(validatePublicConfig().status).toBe(0);

    const invalidConfigurations = [
      { EXPO_PUBLIC_SUPABASE_URL: 'https://.supabase.co' },
      { EXPO_PUBLIC_SUPABASE_URL: 'http://example-project.supabase.co' },
      { EXPO_PUBLIC_SUPABASE_URL: 'https://example-project.supabase.co/extra' },
      { EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_' },
      { EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_secret_${'a'.repeat(32)}` },
      { EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: 'https://' },
      { EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: 'http://example.com/privacy' },
      { EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: 'https://user:password@example.com/privacy' },
      { EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: 'https://127.0.0.1/privacy' },
      { EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: 'https://10.0.0.1/privacy' },
      { EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: 'https://169.254.10.20/privacy' },
      { EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: 'https://foo.local/privacy' },
    ];

    for (const invalid of invalidConfigurations) {
      const result = validatePublicConfig(invalid);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).not.toContain(Object.values(invalid)[0]);
    }
  });

  it('keeps build dependencies read-only and gives write access only to the publisher', () => {
    const workflow = readProjectFile('.github/workflows/production.yml');

    expect(workflow).toContain('group: pages-publish');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('permissions:\n      contents: read');
    expect(workflow).toContain('publish:\n    name: Publish production');
    expect(workflow).toContain('needs: build');
    expect(workflow).toContain('permissions:\n      contents: write');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('actions/download-artifact@v4');
  });

  it('publishes a public root artifact while preserving the account QA rollback subtree', () => {
    const workflow = readProjectFile('.github/workflows/production.yml');

    expect(workflow).toContain("grep -Fq '/subnet/_expo/' dist/index.html");
    expect(workflow).toContain("! grep -Fq 'noindex,nofollow,noarchive' dist/index.html");
    expect(workflow).toContain("find dist -type f -iname '*.map'");
    expect(workflow).toContain("preserve_names = {'.git', 'account-qa'}");
    expect(workflow).toContain('test -f gh-pages/account-qa/index.html');
    expect(workflow).toContain("grep -q '^account-qa/'");
    expect(workflow).toContain('git diff --cached --quiet');
    expect(workflow).not.toContain('git checkout --orphan');
    expect(workflow).not.toContain('git push --force');
  });

  it('serializes QA and production writes through the same Pages concurrency group', () => {
    const production = readProjectFile('.github/workflows/production.yml');
    const accountQa = readProjectFile('.github/workflows/account-qa.yml');

    expect(production).toContain('group: pages-publish');
    expect(accountQa).toContain('group: pages-publish');
  });

  it('rebuilds account QA for every feature-branch change instead of using an incomplete path list', () => {
    const accountQa = readWorkflow('.github/workflows/account-qa.yml');

    expect(accountQa.on.push.branches).toEqual(['feature/public-registration-progress']);
    expect(accountQa.on.push.paths).toBeUndefined();
  });
});
