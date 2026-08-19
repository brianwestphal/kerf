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
import { existsSync, readFileSync } from 'node:fs';
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
    name: 'actions',
    budgetKb: 1.2,
    description: 'the delegated action-table subpath (action + delegateActions)',
    entry: `
      import { action, delegateActions } from '${DIST}/actions.js';
      globalThis.__k = [action, delegateActions];
    `,
  },
  {
    // ISOLATED size — includes the shared core, because overlay OWNS its
    // content's mount() (so close() disposes it), and mount pulls in the
    // render/morph machinery. This is NOT the marginal cost: any app using
    // kerfjs/overlay also imports the core barrel, and `splitting: true` puts
    // mount in one shared chunk, so overlay adds only ~2 KB over an app that
    // already uses kerf. The budget still guards overlay's OWN growth.
    name: 'overlay',
    budgetKb: 15.4,
    description: 'the overlay/modal subpath (overlay + confirm + prompt + form + popover + toast) — includes shared core',
    entry: `
      import { overlay, confirm, prompt, form, popover, toast } from '${DIST}/overlay.js';
      globalThis.__k = [overlay, confirm, prompt, form, popover, toast];
    `,
  },
  {
    // ISOLATED size — the scope convenience wrappers (scope.mount/effect/
    // delegate) pull in the core, same as `overlay`. Marginal cost for an app
    // already using kerf is ~1 KB via code-splitting; this guards scope's own
    // growth.
    name: 'scope',
    budgetKb: 10.9,
    description: 'the dispose-scope subpath (disposeScope + disposeSubtree + observeRemovals) — includes shared core',
    entry: `
      import { disposeScope, disposeSubtree, observeRemovals } from '${DIST}/scope.js';
      globalThis.__k = [disposeScope, disposeSubtree, observeRemovals];
    `,
  },
  {
    name: 'async',
    budgetKb: 2.0,
    description: 'the async-state subpath (resource) — signals only, no render core',
    entry: `
      import { resource } from '${DIST}/async.js';
      globalThis.__k = resource;
    `,
  },
  {
    // ISOLATED size — bindList mounts each row, so it pulls in the render core;
    // marginal cost for an app already using kerf is ~1.5 KB via code-splitting.
    name: 'list',
    budgetKb: 11.5,
    description: 'the bindList subpath (keyed per-row mount + virtualization) — includes shared core',
    entry: `
      import { bindList } from '${DIST}/list.js';
      globalThis.__k = bindList;
    `,
  },
  {
    // ISOLATED size — debounce/throttle are dependency-free; debouncedSignal
    // pulls in signals only (no render core), so the whole subpath is tiny.
    name: 'timing',
    budgetKb: 2.0,
    description: 'the timing subpath (debounce + throttle + debouncedSignal) — signals only, no render core',
    entry: `
      import { debounce, throttle, debouncedSignal } from '${DIST}/timing.js';
      globalThis.__k = [debounce, throttle, debouncedSignal];
    `,
  },
  {
    // ISOLATED size — remountOn mounts each fresh subtree, so it pulls in the
    // render core; marginal cost for an app already using kerf is ~1 KB.
    name: 'remount',
    budgetKb: 10.4,
    description: 'the remount subpath (remountOn — keyed subtree replacement) — includes shared core',
    entry: `
      import { remountOn } from '${DIST}/remount.js';
      globalThis.__k = remountOn;
    `,
  },
  {
    // ISOLATED size — imperative() is pure DOM (a MutationObserver), no signals
    // and no render core, so it's the smallest subpath.
    name: 'imperative',
    budgetKb: 0.4,
    description: 'the imperative subpath (imperative — node-lifecycle adapter) — DOM only, no core',
    entry: `
      import { imperative } from '${DIST}/imperative.js';
      globalThis.__k = imperative;
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

/**
 * The two figures the docs advertise. Measured, never budgeted — a budget
 * would ratchet these and they exist only to be compared against prose.
 *
 * `withArraySignal` is the `main` shape plus the optional subpath, which is
 * what "~N KB with `arraySignal`" means everywhere it appears.
 */
const ADVERTISED = {
  main: BUDGETS.find((b) => b.name === 'main').entry,
  withArraySignal: `
    import { signal, computed, effect, batch, mount, each, delegate } from '${DIST}/index.js';
    import { arraySignal } from '${DIST}/array-signal.js';
    globalThis.__k = { signal, computed, effect, batch, mount, each, delegate, arraySignal };
  `,
};

/** How far a rounded prose claim may sit from the measured value. */
const CLAIM_TOLERANCE_KB = 0.55;

/**
 * Where kerf's own size is advertised, and the pattern that finds it.
 *
 * This is an allow-list on purpose. These files are full of OTHER kilobyte
 * figures — the ~4.7 KB the dev chunk sheds, the ~1 KB `arraySignal` subpath,
 * every competitor's runtime on the migration pages — so a blanket "check
 * every `~N KB`" would be noise. Each entry names one claim and which figure
 * it must match.
 *
 * A pattern that stops matching is a FAILURE, not a skip. Prose gets reworded;
 * a check that silently stops checking is worse than no check, because it
 * still reads green.
 *
 * Not listed, because they are generated from entries that are: `ai/skill.md`
 * and `ai/cursorrules` (from the root files, gated by check-ai-bundle) and
 * `site/public/llms.txt` (from `llms.txt`, via site/scripts/gen-llms-txt.mjs).
 */
const MIGRATION_PAGES = ['vue', 'alpine', 'solid', 'preact', 'lit', 'react', 'jquery', 'vanjs', 'svelte']
  .map((name) => ({
    file: `site/src/content/docs/migrating/${name}.md`,
    // The kerf row of each page's bundle-delta table.
    pattern: /\|\s*`kerfjs` \(incl\. signals\)\s*\|\s*~([\d.]+) KB\s*\|/,
    figure: 'main',
  }));

const DOC_CLAIMS = [
  { file: 'README.md', pattern: /^> ~([\d.]+) KB\. No virtual DOM\./m, figure: 'main' },
  { file: 'README.md', pattern: /\*\*Small bundle\.\*\* ~([\d.]+) KB minified \+ gzipped/, figure: 'main' },
  { file: 'README.md', pattern: /minified \+ gzipped including `@preact\/signals-core` \(~([\d.]+) KB with `arraySignal`\)/, figure: 'withArraySignal' },
  { file: 'README.md', pattern: /grows the core runtime past ~([\d.]+) KB/, figure: 'main' },
  { file: 'CLAUDE.md', pattern: /roughly ([\d.]+) KB minified \+ gzipped without `arraySignal`/, figure: 'main' },
  { file: 'CLAUDE.md', pattern: /without `arraySignal`, ([\d.]+) KB with it/, figure: 'withArraySignal' },
  { file: 'llms.txt', pattern: /A tiny \(~([\d.]+) KB minified \+ gzipped/, figure: 'main' },
  { file: 'llms.txt', pattern: /~([\d.]+) KB with `arraySignal`\)/, figure: 'withArraySignal' },
  { file: 'docs/1-overview.md', pattern: /Roughly ([\d.]+) KB minified \+ gzipped/, figure: 'main' },
  { file: 'docs/1-overview.md', pattern: /~([\d.]+) KB if you also import `arraySignal`/, figure: 'withArraySignal' },
  { file: 'docs/ai/usage-guide.md', pattern: /An ~([\d.]+) KB reactive UI framework/, figure: 'main' },
  { file: 'docs/ai/usage-guide.md', pattern: /switching cost outweighs the bundle size gain \(~([\d.]+) KB\)/, figure: 'main' },
  { file: 'docs/ai/requirements-summary.md', pattern: /tiny reactive UI framework, ~([\d.]+) KB/, figure: 'main' },
  { file: 'docs/ai/code-summary.md', pattern: /~([\d.]+) KB min\+gz including `@preact\/signals-core`/, figure: 'main' },
  { file: 'kerf.claude-skill.md', pattern: /kerf is a ~([\d.]+) KB reactive UI framework/, figure: 'main' },
  { file: 'kerf.cursorrules', pattern: /a ~([\d.]+) KB reactive framework/, figure: 'main' },
  { file: 'site/src/content/docs/why-kerf.md', pattern: /\*\*~([\d.]+) KB minified \+ gzipped, signals included\.\*\*/, figure: 'main' },
  { file: 'site/src/content/docs/use-cases.md', pattern: /Adding ~([\d.]+) KB is reasonable/, figure: 'main' },
  { file: 'site/src/content/docs/migrating/astro.md', pattern: /\| Per-island runtime cost \|[^|]*\| ~([\d.]+) KB \|/, figure: 'main' },
  { file: 'site/src/content/docs/migrating/angular.md', pattern: /\*\*Kerf\*\* is a ~([\d.]+) KB reactive runtime/, figure: 'main' },
  { file: 'site/src/content/docs/migrating/lit.md', pattern: /is lighter than kerf \(~([\d.]+) KB\)/, figure: 'main' },
  { file: 'site/src/content/docs/migrating/svelte.md', pattern: /land well below kerf's ~([\d.]+) KB/, figure: 'main' },
  ...MIGRATION_PAGES,
];

/**
 * Migration pages whose bundle-delta table states a NUMERIC delta, and which
 * therefore has to stay consistent with the two rows it is derived from.
 *
 * Checking this needs no opinion about whether the competitor figures are
 * right — only that the page's own arithmetic holds. That is the failure this
 * catches: updating kerf's row and forgetting the Delta row leaves the page
 * confidently stating a subtraction that no longer works. It happened to two
 * pages the same afternoon the kerf figure moved (jquery said 19 when 30 - 12
 * is 18; vanjs said 9 when 12 - 1.6 is 10), which is precisely how much
 * attention a row like that gets by hand.
 *
 * `svelte` is deliberately absent: its delta is qualitative ("kerf is heavier",
 * because Svelte's compiled output varies per app), so there is nothing to
 * check. `astro` states a per-island cost rather than a delta.
 */
const DELTA_PAGES = ['alpine', 'jquery', 'lit', 'preact', 'react', 'solid', 'vanjs', 'vue'];

/** Rounding slack — a stated delta is rounded, and both operands are too. */
const DELTA_TOLERANCE_KB = 0.6;

/**
 * Verify each migration page's stated delta equals the gap between kerf's row
 * and one of the other rows in the same table.
 *
 * "One of" rather than "the row above" because `preact` lists two baselines
 * (bare Preact, and Preact + signals) and its delta is explicitly against the
 * second. Matching any row keeps the check honest without encoding which one
 * each page happens to mean.
 */
function checkMigrationDeltas() {
  const problems = [];
  for (const name of DELTA_PAGES) {
    const file = `site/src/content/docs/migrating/${name}.md`;
    const text = readFileSync(resolve(ROOT, file), 'utf8');

    const deltaRow = /\|\s*\*\*Delta[^|]*\*\*\s*\|([^|]*)\|/.exec(text);
    if (deltaRow === null) {
      problems.push(`${file}: no **Delta** row found — update DELTA_PAGES if the table was restructured.`);
      continue;
    }
    const stated = /~([\d.]+) KB/.exec(deltaRow[1]);
    if (stated === null) {
      problems.push(
        `${file}: the Delta row states no number (${deltaRow[1].trim()}).\n`
        + '      If it became qualitative on purpose, drop this page from DELTA_PAGES.',
      );
      continue;
    }

    const rows = [...text.matchAll(/\|\s*([^|]*?)\s*\|\s*~([\d.]+) KB\s*\|/g)]
      .map((m) => ({ label: m[1], kb: Number(m[2]) }))
      .filter((r) => !/\*\*Delta/.test(r.label));
    const kerfRow = rows.find((r) => r.label.includes('kerfjs'));
    const others = rows.filter((r) => r !== kerfRow);
    if (kerfRow === undefined || others.length === 0) {
      problems.push(`${file}: could not read both a kerf row and a comparison row from the bundle table.`);
      continue;
    }

    const statedKb = Number(stated[1]);
    const matches = others.some((o) => Math.abs(Math.abs(o.kb - kerfRow.kb) - statedKb) <= DELTA_TOLERANCE_KB);
    if (!matches) {
      const options = others.map((o) => `${o.label.trim()} ${o.kb} KB -> ${Math.abs(o.kb - kerfRow.kb).toFixed(1)}`).join('; ');
      problems.push(
        `${file}: states a delta of ~${statedKb} KB, which matches no row against kerf's ${kerfRow.kb} KB.\n`
        + `      candidates: ${options}`,
      );
    }
  }
  return problems;
}

/**
 * Compare every advertised size claim against what the bundle actually weighs.
 *
 * This file's own header records the regression that motivated the budget
 * gate: a realistic import grew to 16.9 KB "while the docs still advertised
 * ~12 KB". The budget half of that was fixed; the docs half was not, and drift
 * reappeared in the other direction — the prose said ~11 KB against a measured
 * 12.29, and one file said ~6.1 KB. Understating is the worse direction: a
 * reader who measures stops trusting every other number on the page.
 */
async function checkDocClaims(measured) {
  const problems = [];
  for (const claim of DOC_CLAIMS) {
    const path = resolve(ROOT, claim.file);
    if (!existsSync(path)) {
      problems.push(`${claim.file}: file not found — update DOC_CLAIMS in ${'scripts/check-bundle-size.mjs'}.`);
      continue;
    }
    const match = claim.pattern.exec(readFileSync(path, 'utf8'));
    if (match === null) {
      problems.push(
        `${claim.file}: no size claim matched ${claim.pattern}.\n`
        + '      The prose was reworded, or the claim was removed. Update the pattern in DOC_CLAIMS — '
        + 'a claim that stops being checked is how this drifted in the first place.',
      );
      continue;
    }
    const claimed = Number(match[1]);
    const actual = measured[claim.figure];
    if (Math.abs(claimed - actual) > CLAIM_TOLERANCE_KB) {
      problems.push(
        `${claim.file}: advertises ~${claimed} KB, but ${claim.figure} measures ${actual.toFixed(2)} KB.\n`
        + `      ${match[0].trim()}`,
      );
    }
  }
  return problems;
}

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

  // The advertised numbers, measured the same way as the budgets above.
  const advertised = {
    main: (await measure({ entry: ADVERTISED.main })).gzipKb,
    withArraySignal: (await measure({ entry: ADVERTISED.withArraySignal })).gzipKb,
  };
  console.log(
    `\n[check-bundle-size] advertised figures: main ${advertised.main.toFixed(2)} KB, `
    + `with arraySignal ${advertised.withArraySignal.toFixed(2)} KB`,
  );

  if (reportOnly) return;

  const claimProblems = [...(await checkDocClaims(advertised)), ...checkMigrationDeltas()];
  if (claimProblems.length > 0) {
    console.error('\n[check-bundle-size] docs advertise a size the bundle does not weigh:\n');
    for (const p of claimProblems) console.error(`  - ${p}`);
    console.error(
      `\nRound to the nearest KB, and round UP rather than down — understating is the worse\n`
      + 'direction to be wrong in. Then update every surface: `grep -rn "KB" README.md CLAUDE.md\n'
      + 'llms.txt docs/ site/src/content/docs/`. The migration pages also carry a Delta row\n'
      + "computed against kerf's size, which needs recalculating by hand.\n",
    );
    process.exit(1);
  }

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

  console.log(
    `\n[check-bundle-size] OK — every entry within budget, and ${DOC_CLAIMS.length} advertised `
    + `size claims match what the bundle weighs, and ${DELTA_PAGES.length} migration deltas add up.`,
  );
}

await main();
