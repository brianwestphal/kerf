#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
let mode = '--write';
let root = resolve(import.meta.dirname, '..');

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--check' || arg === '--write') {
    mode = arg;
    continue;
  }
  if (arg === '--root') {
    const value = args[index + 1];
    if (!value) throw new Error('--root requires a path');
    root = resolve(value);
    index += 1;
    continue;
  }
  throw new Error(`Unknown argument: ${arg}`);
}

// The scaffold bundles both canonical UI catalog schemas: the composition
// schema its generated component-composition.json conforms to, and the
// selection (component-catalog extension) schema its optional selection
// output conforms to.
const SCHEMAS = [
  'component-composition.schema.json',
  'component-catalog-extension.schema.json',
];

const stale = [];
for (const name of SCHEMAS) {
  const source = resolve(root, 'ui/ai', name);
  const target = resolve(root, 'create-kerf-component', name);
  const canonical = await readFile(source, 'utf8');
  if (mode === '--check') {
    const scaffold = await readFile(target, 'utf8').catch(() => null);
    if (scaffold !== canonical) stale.push(name);
  } else {
    await writeFile(target, canonical);
  }
}

if (mode === '--check') {
  if (stale.length) {
    console.error(
      `[sync-scaffold-catalog-schema] create-kerf-component schema is stale (${stale.join(', ')}); run npm run sync:scaffold-catalog-schema.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      '[sync-scaffold-catalog-schema] create-kerf-component schemas match the canonical UI catalog contracts.',
    );
  }
} else {
  console.log(
    '[sync-scaffold-catalog-schema] copied the canonical UI catalog schemas into create-kerf-component.',
  );
}
