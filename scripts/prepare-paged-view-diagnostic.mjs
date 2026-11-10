// KF-SAYTM1: add observability to an ephemeral exact-source checkout, never
// replace the native gesture or its assertions with a diagnostic imitation.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const harness = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spec = 'ui/tests/browser/paged-view.spec.ts';
const originalImport =
  "import { expect, type Locator, type Page, test } from '@playwright/test';";
const instrumentedImport =
  "import { expect, type Locator, type Page, test } from './paged-view-diagnostic-fixture.js';";
const fixture = 'ui/tests/browser/diagnostics/paged-view-fixture.ts';
const hash = (text) => createHash('sha256').update(text).digest('hex');
const git = (target, args) =>
  execFileSync('git', ['-C', target, ...args], { encoding: 'utf8' }).trim();

export function instrumentPagedViewTest(source) {
  assert.equal(
    source.split(originalImport).length,
    2,
    'Expected one canonical test import',
  );
  const result = source.replace(originalImport, instrumentedImport);
  assert.equal(result.replace(instrumentedImport, originalImport), source);
  return result;
}

export function preparePagedViewDiagnostic(target, evidence) {
  target = resolve(target);
  evidence = resolve(evidence);
  const source = readFileSync(join(target, spec), 'utf8');
  const patched = instrumentPagedViewTest(source);
  assert.equal(
    git(target, ['diff', '--', spec]),
    '',
    'Target test must be clean',
  );
  const sourceSha = git(target, ['rev-parse', 'HEAD']);
  const revisions = [
    ['target', sourceSha],
    ['prior-green', 'e77e5d9a6c91ce44d44d210af1f0f50e22fcc780'],
    ['harness', git(harness, ['rev-parse', 'HEAD'])],
  ];
  const paths = [
    spec,
    'ui/src/components/navigation/paged-view/paged-view.tsx',
    'ui/src/components/navigation/paged-view/paged-view.css',
    'ui/src/components/navigation/paged-view/wiring/wire-paged-views.ts',
    'ui/ux-demo/demos/paged-view.tsx',
    'ui/package-lock.json',
    'src',
  ];
  const sources = revisions.map(([label, revision]) => ({
    label,
    revision,
    hashes: Object.fromEntries(
      paths.map((path) => {
        const tree = git(target, ['ls-tree', '-r', revision, '--', path]);
        assert(tree, `Missing provenance input ${revision}:${path}`);
        return [path, hash(tree)];
      }),
    ),
  }));
  mkdirSync(evidence, { recursive: true });
  writeFileSync(join(evidence, 'paged-view-original.ts'), source);
  writeFileSync(
    join(evidence, 'source-provenance.json'),
    JSON.stringify(
      {
        sources,
        originalTestSha256: hash(source),
        patchedTestSha256: hash(patched),
        fixtureSha256: hash(readFileSync(join(harness, fixture))),
        change:
          'Only the test import changes; native gesture, pacing, assertions and retry policy are byte-preserved.',
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(target, 'ui/tests/browser/paged-view-diagnostic-fixture.ts'),
    readFileSync(join(harness, fixture)),
  );
  writeFileSync(join(target, spec), patched);
  writeFileSync(
    join(evidence, 'instrumentation.diff'),
    git(target, ['diff', '--', spec]),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [target, evidence] = process.argv.slice(2);
  assert(
    target && evidence,
    'Usage: node scripts/prepare-paged-view-diagnostic.mjs <target-checkout> <evidence-directory>',
  );
  preparePagedViewDiagnostic(target, evidence);
}
