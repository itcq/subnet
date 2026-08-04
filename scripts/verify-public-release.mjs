import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import artifactPolicy from './release-artifact-policy.cjs';

const { isHtmlDocument } = artifactPolicy;
const artifactRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const html = readFileSync(join(artifactRoot, 'index.html'), 'utf8');
const robots = readFileSync(join(artifactRoot, 'robots.txt'), 'utf8');

function collectFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? collectFiles(path) : [relative(artifactRoot, path)];
  });
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const titleMatches = [...html.matchAll(/<title[^>]*>(.*?)<\/title>/gis)].map((match) => match[1]);
const files = collectFiles(artifactRoot);
const htmlFiles = files.filter(isHtmlDocument);

requireCondition(existsSync(join(artifactRoot, '.nojekyll')), 'dist/.nojekyll is missing');
requireCondition(titleMatches.length === 1, `expected one title, found ${titleMatches.length}`);
requireCondition(titleMatches[0] === 'Subnet Game', `unexpected title: ${titleMatches[0]}`);
requireCondition(html.includes('Practice IPv4 subnetting'), 'search description is missing');
requireCondition(html.includes('https://itcq.github.io/subnet/'), 'canonical production URL is missing');
requireCondition(!/noindex|nofollow|noarchive/i.test(html), 'crawler-blocking metadata is present');
requireCondition(!/Subnet Game Alpha/i.test(html), 'alpha title is present');
requireCondition(robots === 'User-agent: *\nAllow: /\n', 'robots.txt does not allow public crawling');
requireCondition(!files.some((file) => file.endsWith('.map')), 'source maps are present');
requireCondition(!files.some((file) => file.toLowerCase().includes('explore')), '/explore artifact is present');
requireCondition(
  htmlFiles.length === 1 && htmlFiles[0] === 'index.html',
  `unexpected public HTML routes: ${htmlFiles.join(', ')}`,
);

console.log(`Public release artifact verified: ${files.length} files`);
