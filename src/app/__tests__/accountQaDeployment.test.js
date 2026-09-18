/* global describe, expect, it */

const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

function readProjectFile(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('account QA deployment', () => {
  it('supports a reviewed QA-only base path without changing the production default', () => {
    expect(existsSync(join(process.cwd(), 'app.config.js'))).toBe(true);

    const config = readProjectFile('app.config.js');
    expect(config).toContain('module.exports = ({ config }) =>');
    expect(config).toContain("process.env.EXPO_PUBLIC_DEPLOY_BASE_URL ?? '/subnet'");
    expect(config).toContain('...config');
    expect(config).toContain("baseUrl: deployBaseUrl");
  });

  it('builds account QA with the required public values and never a privileged key', () => {
    const workflow = readProjectFile('.github/workflows/account-qa.yml');

    expect(workflow).toContain('EXPO_PUBLIC_DEPLOY_BASE_URL: /subnet/account-qa');
    expect(workflow).toContain('EXPO_PUBLIC_SUPABASE_URL: ${{ vars.EXPO_PUBLIC_SUPABASE_URL }}');
    expect(workflow).toContain(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ vars.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}',
    );
    expect(workflow).toContain(
      'EXPO_PUBLIC_ACCOUNT_PRIVACY_URL: ${{ vars.EXPO_PUBLIC_ACCOUNT_PRIVACY_URL }}',
    );
    expect(workflow).not.toContain('EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).not.toContain('EXPO_PUBLIC_SUPABASE_SECRET_KEY');
  });

  it('builds without write credentials and publishes in a separate serialized job', () => {
    const workflow = readProjectFile('.github/workflows/account-qa.yml');

    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('permissions:\n      contents: read');
    expect(workflow).toContain('publish:\n    name: Publish unlisted account QA');
    expect(workflow).toContain('needs: build');
    expect(workflow).toContain('permissions:\n      contents: write');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('actions/download-artifact@v4');
  });

  it('publishes only an unlisted QA subdirectory while preserving production', () => {
    const workflow = readProjectFile('.github/workflows/account-qa.yml');

    expect(workflow).toContain('account-qa');
    expect(workflow).toContain('noindex,nofollow,noarchive');
    expect(workflow).toContain('npm run verify:release');
    expect(workflow).toContain("find dist -type f -iname '*.map'");
    expect(workflow).toContain("Disallow: /subnet/account-qa/");
    expect(workflow).toContain("target = root / 'account-qa'");
    expect(workflow).toContain('git diff --cached --quiet');
    expect(workflow).not.toContain('git checkout --orphan');
    expect(workflow).not.toContain('git push --force');
  });
});
