#!/usr/bin/env node
/**
 * Bundle-size budget gate.
 *
 * kerf's whole pitch is "the fastest framework that needs no build step beyond
 * your existing one", and the size number is part of that claim. Nothing
 * enforced it, so the dev-warning family grew **+4.2 KB min+gzip (+33%)**
 * across a release without anyone noticing — a realistic import went from
 * 12.7 KB to 16.9 KB while the docs still advertised ~12 KB.
 *
 * This script bundles a handful of representative consumer entry points the
 * way a real consumer's bundler would (esbuild, `--bundle --minify`, prod
 * `NODE_ENV` define, signals-core inlined), gzips the result, and fails when
 * any of them exceeds its budget.
 *
 * ## What it measures
 *
 * `dist/`, not `src/` — the published bytes are what a consumer pays for, and
 * chunking/`sideEffects` only exist in the built output. Requires a build
 * first (`npm run check` runs this right after `npm run build`).
 *
 * ## Reading a failure
 *
 * Over budget: find what got pulled in. The usual cause is a core module
 * gaining an import that reaches code most consumers never call — the
 * dev-warning regression happened exactly that way, via `mount.ts`/`each.ts`
 * importing warners that were then gated at runtime rather than at the call
 * site. `node scripts/check-bundle-size.mjs --why <entry>` prints esbuild's
 * module breakdown so the new weight is attributable.
 *
 * Under budget by more than the slack allowance: that is a WIN, and the gate
 * asks you to lower the budget so the win can't silently erode. Budgets only
 * ratchet down.
 *
 * ## Changing a budget
 *
 * Edit `BUDGETS` below, in the same commit as the change that moves the
 * number, and say why in the commit message. A deliberate, reviewed bump is
 * the point; an unnoticed drift is what this prevents.
 *
 * Run via:
 *   node scripts/check-bundle-size.mjs            # check budgets
 *   node scripts/check-bundle-size.mjs --report   # print sizes, never fail
 *   node scripts/check-bundle-size.mjs --why main # explain one entry's weight
 *
 * Wired into `npm run check` (after the build step).
 */
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const DIST = resolve(ROOT, 'dist');

/**
 * Budgets in KB min+gzip. Keep the entries ordered from most to least
 * representative of what real consumers import.
 *
 * `slack` is how far UNDER budget an entry may sit before the gate asks you to
 * ratchet the budget down. Wide enough to absorb ordinary churn, tight enough
 * that a 1 KB win can't quietly be spent again later.
 */
const SLACK_KB = 0.35;

const BUDGETS = [
  {
    name: 'main',
    budgetKb: 12.6,
    description: 'realistic app import — the number the docs advertise',
    entry: `
      import { signal, computed, effect, batch, mount, each, delegate } from '${DIST}/index.js';
      globalThis.__k = { signal, computed, effect, batch, mount, each, delegate };
    `,
  },
  {
    name: 'barrel',
    budgetKb: 14.3,
    description: 'the whole public barrel — worst case for a consumer',
    entry: `
      import * as kerf from '${DIST}/index.js';
      globalThis.__k = kerf;
    `,
  },
  {
    name: 'array-signal',
    budgetKb: 2.3,
    description: 'the optional granular-collection subpath on its own',
    entry: `
      import { arraySignal } from '${DIST}/array-signal.js';
      globalThis.__k = arraySignal;
    `,
  },
  {
    name: 'html',
    budgetKb: 5.2,
    description: 'the no-build authoring path (html tagged template)',
    entry: `
      import { html } from '${DIST}/html.js';
      globalThis.__k = html;
    `,
  },
  {
    // Guards the KF-429 invariant directly: with the dev entry absent, NO
    // dev-warning code may appear in a production bundle. The size budget
    // above would catch a large regression; this catches any at all.
    name: 'main-no-dev-code',
    budgetKb: 12.6,
    description: 'same as `main`, and asserts zero dev-diagnostic code leaked in',
    forbid: ['KERF_DEV_WARN', 'devReadonlyProxy', 'MutationObserver', 'data-key` attribute'],
    entry: `
      import { signal, computed, effect, batch, mount, each, delegate } from '${DIST}/index.js';
      globalThis.__k = { signal, computed, effect, batch, mount, each, delegate };
    `,
  },
];

async function measure(spec, { metafile = false } = {}) {
  const result = await build({
    stdin: { contents: spec.entry, resolveDir: ROOT, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    metafile,
    logLevel: 'silent',
    // A consumer's production build substitutes this; matching it here keeps
    // the measurement honest rather than optimistic.
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const code = result.outputFiles[0].text;
  return { code, gzipKb: gzipSync(Buffer.from(code)).length / 1024, metafile: result.metafile };
}

async function main() {
  const args = process.argv.slice(2);
  const reportOnly = args.includes('--report');
  const whyIndex = args.indexOf('--why');

  if (!existsSync(resolve(DIST, 'index.js'))) {
    console.error('[check-bundle-size] dist/ not found — run `npm run build` first.');
    process.exit(1);
  }

  if (whyIndex !== -1) {
    const name = args[whyIndex + 1];
    const spec = BUDGETS.find((b) => b.name === name);
    if (!spec) {
      console.error(`[check-bundle-size] unknown entry "${name}". Known: ${BUDGETS.map((b) => b.name).join(', ')}`);
      process.exit(1);
    }
    const { metafile } = await measure(spec, { metafile: true });
    const inputs = Object.entries(metafile.outputs)[0][1].inputs;
    const rows = Object.entries(inputs)
      .map(([file, info]) => [file, info.bytesInOutput])
      .filter(([, bytes]) => bytes > 0)
      .sort((a, b) => b[1] - a[1]);
    console.log(`[check-bundle-size] "${name}" weight by module (bytes in output, pre-gzip):\n`);
    for (const [file, bytes] of rows) {
      console.log(`  ${String(bytes).padStart(7)}  ${file}`);
    }
    return;
  }

  const failures = [];
  const wins = [];
  console.log('[check-bundle-size] min+gzip against dist/\n');

  for (const spec of BUDGETS) {
    const { code, gzipKb } = await measure(spec);
    const delta = gzipKb - spec.budgetKb;
    const status = delta > 0 ? 'OVER' : 'ok';
    console.log(
      `  ${spec.name.padEnd(18)} ${gzipKb.toFixed(2).padStart(6)} KB  / ${String(spec.budgetKb).padStart(5)} KB budget  ${status}`
      + `   ${spec.description}`,
    );

    if (delta > 0) {
      failures.push(
        `${spec.name}: ${gzipKb.toFixed(2)} KB exceeds its ${spec.budgetKb} KB budget by ${delta.toFixed(2)} KB.`,
      );
    } else if (-delta > SLACK_KB) {
      wins.push(
        `${spec.name}: ${gzipKb.toFixed(2)} KB is ${(-delta).toFixed(2)} KB under its ${spec.budgetKb} KB budget `
        + `— lower the budget to ~${(gzipKb + 0.1).toFixed(1)} so the win can't erode.`,
      );
    }

    for (const needle of spec.forbid ?? []) {
      if (code.includes(needle)) {
        failures.push(
          `${spec.name}: production bundle contains ${JSON.stringify(needle)} — dev-only code leaked into the main entry. `
          + 'Core must reach diagnostics through a `devHooks` slot, never by importing a `dev-*` module.',
        );
      }
    }
  }

  if (reportOnly) return;

  if (wins.length > 0) {
    console.log('\n[check-bundle-size] budgets are now too loose:\n');
    for (const w of wins) console.log(`  - ${w}`);
  }
  if (failures.length > 0) {
    console.error('\n[check-bundle-size] FAILED:\n');
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      '\nIf the growth is intentional, raise the budget in scripts/check-bundle-size.mjs in the SAME commit '
      + 'and say why in the message. Otherwise run `node scripts/check-bundle-size.mjs --why <entry>` to see '
      + 'which modules got pulled in.',
    );
    process.exit(1);
  }
  if (wins.length > 0) process.exit(1);

  console.log('\n[check-bundle-size] OK — every entry within budget.');
}

await main();
