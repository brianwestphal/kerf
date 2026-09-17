// Offline sync check for the SVG design templates (docs/design/templates/).
//
// Verifies every component + variant in the build manifest has its committed
// output: a light and dark SVG per variant, plus the two per-component library
// files. It does NOT re-render (that needs domotion + a browser), so it catches
// a manifest entry whose templates were never generated, a half-regenerated set
// (missing the dark capture or a library file), and a stale leftover directory —
// the common "forgot to run design-templates:build" failure modes. Deep visual
// drift (a component changed but its template was not regenerated) is a heavier,
// browser-driven check tracked separately.
//
// Imports the manifest from build-design-templates.mjs, which is guarded so the
// import does not launch domotion.

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COMPONENTS, THEMES } from './build-design-templates.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = resolve(root, 'docs/design/templates');
const rel = (p) => p.slice(root.length + 1);

const missing = [];
const expected = new Set();

for (const [name, spec] of Object.entries(COMPONENTS)) {
  for (const theme of THEMES) {
    const library = resolve(outRoot, `${name}${theme.suffix}.svg`);
    expected.add(library);
    if (!existsSync(library)) missing.push(rel(library));
    for (const variant of spec.variants) {
      const svg = resolve(outRoot, name, `${variant.id}${theme.suffix}.svg`);
      expected.add(svg);
      if (!existsSync(svg)) missing.push(rel(svg));
    }
  }
}

// Flag committed output that no manifest entry accounts for (a renamed/removed
// component whose files were left behind).
const stray = [];
if (existsSync(outRoot)) {
  for (const entry of readdirSync(outRoot)) {
    const full = resolve(outRoot, entry);
    if (statSync(full).isDirectory()) {
      if (!COMPONENTS[entry]) stray.push(rel(full) + '/');
      else for (const file of readdirSync(full)) if (!expected.has(resolve(full, file))) stray.push(rel(resolve(full, file)));
    } else if (entry.endsWith('.svg') && !expected.has(full)) {
      stray.push(rel(full));
    }
  }
}

if (missing.length || stray.length) {
  if (missing.length) {
    console.error(`[check-design-templates] ${missing.length} expected template file(s) missing:`);
    for (const m of missing) console.error(`  - ${m}`);
  }
  if (stray.length) {
    console.error(`[check-design-templates] ${stray.length} committed file(s) not accounted for by the manifest:`);
    for (const s of stray) console.error(`  - ${s}`);
  }
  console.error('Run `npm run design-templates:build` (needs domotion-svg) and commit the result.');
  process.exit(1);
}

const variantCount = Object.values(COMPONENTS).reduce((n, s) => n + s.variants.length, 0);
console.log(`[check-design-templates] OK — ${Object.keys(COMPONENTS).length} components, ${variantCount} variants, light + dark each, libraries present.`);
