/* global describe, expect, it */

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { isHtmlDocument } = require(join(process.cwd(), 'scripts/release-artifact-policy.cjs'));

function readProjectFile(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('public release metadata', () => {
  it('publishes a production title and useful search description', () => {
    const layout = readProjectFile('src/app/_layout.tsx');

    expect(layout).toContain('<title>Subnet Game</title>');
    expect(layout).toContain('Practice IPv4 subnetting');
    expect(layout).not.toMatch(/Subnet Game Alpha/i);
  });

  it('allows public indexing instead of retaining limited-discovery controls', () => {
    const html = readProjectFile('src/app/+html.tsx');
    const robots = readProjectFile('public/robots.txt');

    expect(html).not.toMatch(/noindex|nofollow|noarchive/i);
    expect(robots).toBe('User-agent: *\nAllow: /\n');
  });

  it('removes alpha terminology from user-facing production surfaces', () => {
    const surfaces = [
      'src/app/_layout.tsx',
      'src/features/timed/TimedModeSetup.tsx',
      'src/features/timed/TimedChallenge.tsx',
      'src/features/achievements/LocalAchievements.tsx',
      'src/domain/achievements/achievements.ts',
    ];

    for (const surface of surfaces) {
      expect(readProjectFile(surface)).not.toMatch(/\balpha\b/i);
    }
  });

  it('classifies HTML route extensions without case-sensitive bypasses', () => {
    expect(['index.html', 'unexpected.HTML', 'legacy.htm', 'legacy.HTM'].every(isHtmlDocument)).toBe(
      true,
    );
    expect(isHtmlDocument('entry.js')).toBe(false);
  });

  it('records the verified public release consistently', () => {
    const changelog = readProjectFile('CHANGELOG.md');
    const alphaGuide = readProjectFile('docs/ALPHA_TESTER_GUIDE.md');
    const projectOverview = readProjectFile('docs/PROJECT_OVERVIEW.md');
    const projectStatus = readProjectFile('docs/PROJECT_STATUS.md');

    expect(changelog).toContain('## 1.0.0 — 2026-08-04');
    expect(changelog).toContain('Published the responsive web product');
    expect(alphaGuide).toContain('responsive web product is now publicly released');
    expect(projectOverview).toContain('**Stage:** Public production web release');
    expect(projectStatus).toContain('Released:');
    expect(projectStatus).toContain('https://itcq.github.io/subnet/');
  });

  it('clears persistent bundler state for canonical production exports', () => {
    const packageJson = JSON.parse(readProjectFile('package.json'));

    expect(packageJson.scripts['export:web']).toContain('expo export --clear --platform web');
  });
});