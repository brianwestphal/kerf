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

const source = resolve(root, 'ui/ai/component-catalog-v2.schema.json');
const target = resolve(
  root,
  'create-kerf-component/component-catalog-v2.schema.json',
);
const canonical = await readFile(source, 'utf8');

if (mode === '--check') {
  const scaffold = await readFile(target, 'utf8');
  if (scaffold !== canonical) {
    console.error(
      '[sync-scaffold-catalog-schema] create-kerf-component schema is stale; run npm run sync:scaffold-catalog-schema.',
    );
    process.exitCode = 1;
  } else {
    console.log(
      '[sync-scaffold-catalog-schema] create-kerf-component schema matches the canonical UI catalog contract.',
    );
  }
} else {
  await writeFile(target, canonical);
  console.log(
    '[sync-scaffold-catalog-schema] copied the canonical UI catalog schema into create-kerf-component.',
  );
}
