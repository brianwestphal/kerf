#!/usr/bin/env node
// Build each complete example app with a per-app absolute base into a single
// shared serve root, so one static file server can host them all at
// `http://host/<name>/` and domotion-svg can capture the animated demo SVGs
// in site/public/demos/ from them. Not part of the regular build — invoked by
// site/scripts/demo-captures/capture-demos.sh when regenerating the demos.

import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCompleteApp, COMPLETE_APPS } from './lib/complete-apps.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');

// capture-demos.sh always passes its own temp serve root; the fallback is for
// a manual run.
const outRoot = process.argv[2] || resolve(tmpdir(), 'kerf-demos');

async function main() {
  mkdirSync(outRoot, { recursive: true });
  for (const name of COMPLETE_APPS) {
    const outDir = resolve(outRoot, name);
    await buildCompleteApp(name, {
      base: `/${name}/`,
      outDir,
      cacheDir: resolve(siteRoot, `node_modules/.vite-demos/${name}`),
    });
    console.log(`[demos] built ${name} → ${outDir}`);
  }
  console.log(`[demos] built ${COMPLETE_APPS.length} apps → ${outRoot}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
