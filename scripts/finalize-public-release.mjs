import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const artifactRoot = fileURLToPath(new URL('../dist/', import.meta.url));

mkdirSync(artifactRoot, { recursive: true });
for (const diagnosticRoute of ['+not-found.html', '_sitemap.html']) {
  rmSync(join(artifactRoot, diagnosticRoute), { force: true });
}
writeFileSync(join(artifactRoot, '.nojekyll'), '');

console.log('Public release artifact finalized');
