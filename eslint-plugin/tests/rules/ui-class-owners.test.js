import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { uiSettings } from '../helpers/ui-contract-fixture.js';

import { loadUiContract } from '../../lib/ui-contract.js';

const uiAi = join(import.meta.dirname, '../../../ui/ai');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const shippedSettings = uiSettings({
  catalog: undefined,
  selectionCatalog: undefined,
  catalogPath: join(uiAi, 'component-composition.json'),
  selectionCatalogPath: join(uiAi, 'component-catalog.json'),
});
const contextFor = (settings, filename = 'shipped-owners.tsx') => ({
  settings,
  cwd: process.cwd(),
  filename: join(process.cwd(), filename),
});

// The KUI-L103 facts a generated ai/components/<id>.md page states: every
// "Never put `a`, `b` on an element you write; render `X` instead" line and
// the "A plain `<div>` carrying them is exactly what `X` renders" line.
function documentedOwners(markdown, placeableClasses) {
  const owners = new Map();
  const names = (list) => [...list.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  for (const [, classes, renderers] of markdown.matchAll(
    /^Never put (.+) on an element you write; render (.+) instead \(`KUI-L103`\)\.$/gm,
  ))
    for (const className of names(classes))
      owners.set(className, { render: names(renderers) });
  const root = markdown.match(
    /^A plain `<([a-z][\w-]*)>` carrying them is exactly what .+ renders: render (.+) instead \(`KUI-L103`\)/m,
  );
  if (root)
    for (const className of placeableClasses)
      owners.set(className, { render: names(root[2]), element: root[1] });
  return owners;
}

test('the lint and the generated component reference name the same renderer for every shipped class', () => {
  const contract = loadUiContract(contextFor(shippedSettings));
  assert.equal(contract.error, undefined);
  const composition = readJson(join(uiAi, 'component-composition.json'));
  const selection = readJson(join(uiAi, 'component-catalog.json'));
  const sources = new Map(
    selection.entries.map((entry) => [entry.id, entry.source]),
  );
  const fromLint = new Map();
  for (const [className, owner] of contract.componentClasses)
    fromLint.set(className, {
      render: owner.render,
      ...(owner.element ? { element: owner.element } : {}),
    });
  const fromDocs = new Map();
  for (const entry of composition.entries) {
    const page = readFileSync(
      join(uiAi, 'components', `${entry.id}.md`),
      'utf8',
    );
    const owners = documentedOwners(
      page,
      entry.boundaries.placeableClasses ?? [],
    );
    // Only Kerf UI pages carry the anatomy lines; a Web Awesome entry must
    // not own classes the lint would report without its page saying so.
    if (sources.get(entry.id) !== 'kerf') assert.equal(owners.size, 0);
    for (const [className, owner] of owners) fromDocs.set(className, owner);
  }
  assert.ok(fromLint.size > 50, 'the shipped catalog owns anatomy classes');
  assert.deepEqual(
    [...fromDocs].sort(([a], [b]) => a.localeCompare(b)),
    [...fromLint].sort(([a], [b]) => a.localeCompare(b)),
  );
});

test('the class ownership rule is loaded from the @kerfjs/ui beside its profile contract', () => {
  const directory = mkdtempSync(join(tmpdir(), 'kerf-class-owners-'));
  try {
    const profileContractPath = join(
      directory,
      'application-ui-profile-sync.cjs',
    );
    writeFileSync(
      profileContractPath,
      readFileSync(join(uiAi, 'application-ui-profile-sync.cjs'), 'utf8'),
    );
    writeFileSync(
      join(directory, 'application-ui-diagnostic-ids-v1.json'),
      readFileSync(join(uiAi, 'application-ui-diagnostic-ids-v1.json'), 'utf8'),
    );
    const settings = uiSettings({ profileContractPath });
    const missing = loadUiContract(contextFor(settings, 'missing-owners.tsx'));
    assert.match(missing.error, /component-class-owners\.cjs/);
    assert.match(missing.error, /matches eslint-plugin-kerfjs/);

    writeFileSync(
      join(directory, 'component-class-owners.cjs'),
      'module.exports = {};\n',
    );
    const invalid = loadUiContract(contextFor(settings, 'invalid-owners.tsx'));
    assert.match(invalid.error, /does not export componentClassOwnership/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
