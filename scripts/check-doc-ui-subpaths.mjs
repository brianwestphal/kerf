#!/usr/bin/env node
/** Keep the AI code summary's UI subpath index aligned with the published export map. */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(resolve(root, 'ui/package.json'), 'utf8'));
const doc = readFileSync(resolve(root, 'docs/ai/code-summary.md'), 'utf8');
const start = doc.indexOf('### `@kerfjs/ui` published subpath map');
const end = doc.indexOf('\n## ', start);
if (start < 0 || end < 0) {
  console.error('[check-doc-ui-subpaths] Missing bounded UI subpath map.');
  process.exit(1);
}
const section = doc.slice(start, end);
const expected = Object.keys(pkg.exports).map((key) =>
  key === '.' ? '@kerfjs/ui' : `@kerfjs/ui${key.slice(1)}`,
);
const entries = section
  .split('\n')
  .filter(
    (line) =>
      line.startsWith('| `@kerfjs/ui') || line.startsWith('- `@kerfjs/ui'),
  )
  .join('\n');
const listed = [...entries.matchAll(/`(@kerfjs\/ui(?:\/[\w.*-]+)*)`/g)].map(
  (match) => match[1],
);
const missing = expected.filter((name) => !listed.includes(name));
const stale = listed.filter((name) => !expected.includes(name));
const duplicate = listed.filter(
  (name, index) => listed.indexOf(name) !== index,
);
if (missing.length || stale.length || duplicate.length) {
  for (const [label, names] of [
    ['missing', missing],
    ['stale', stale],
    ['duplicate', duplicate],
  ])
    for (const name of names)
      console.error(`[check-doc-ui-subpaths] ${label}: ${name}`);
  process.exit(1);
}
console.log(
  `[check-doc-ui-subpaths] OK — ${expected.length} published UI paths indexed.`,
);
