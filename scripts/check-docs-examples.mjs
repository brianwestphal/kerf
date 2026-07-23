#!/usr/bin/env node
/**
 * Doc/example consistency gate.
 *
 * Three checks:
 *
 * 1. **Run-live links resolve** (migrating/) — every `/kerf/run/<name>/` link in
 *    a migration page must point at an example app that is (a) registered in
 *    `site/scripts/build-examples.mjs` COMPLETE_APPS so it ships with the
 *    site build, and (b) covered by a `test.describe('<name>')` block in
 *    `tests/browser/example-apps.spec.ts` so it has an E2E smoke test.
 *
 * 2. **Self-contained kerf code blocks compile** (migrating/) — every fenced
 *    ```tsx / ```ts code block whose first line starts with
 *    `import ... from 'kerfjs'` is written to a scratch dir and run through
 *    `tsc --noEmit` against the built `dist/` types. Blocks that aren't
 *    self-contained (no kerf import, or contain `// ...` / `/* ... *\/`
 *    placeholders) are skipped — they are pedagogical fragments, not runnable
 *    units.
 *
 * 3. **Example doc excerpts mirror their source's kerfjs imports**
 *    (examples/complete/) — for every paired
 *    `site/src/content/docs/examples/complete/<name>.md` ↔
 *    `site/src/examples/complete/<name>/main.tsx`, every named import the
 *    source pulls from `'kerfjs'` (or any `'kerfjs/*'` subpath) must also
 *    appear in at least one kerf-import statement somewhere in the doc page.
 *    Catches "release introduced a new public API (`attr()`, …) and updated
 *    the source, but the doc excerpt still uses the pre-release pattern" —
 *    the v0.11.0 release missed this and shipped doc/source drift.
 *
 * Surfaces the kerf-of-the-shape "doc snippet violates a runtime contract"
 * bug that let the partial-set TodoMVC regression ship plus the "source
 * moved to attr() but doc excerpts didn't" drift caught after v0.11.0.
 * Wired into `npm run check`.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const migratingDir = resolve(repoRoot, 'site/src/content/docs/migrating');
const exampleDocsDir = resolve(repoRoot, 'site/src/content/docs/examples/complete');
const exampleSrcDir = resolve(repoRoot, 'site/src/examples/complete');
const buildExamplesPath = resolve(repoRoot, 'site/scripts/build-examples.mjs');
const browserSpecPath = resolve(repoRoot, 'tests/browser/example-apps.spec.ts');
const distTypingTsconfig = resolve(repoRoot, 'tests/dist/jsx-typing/tsconfig.json');

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(`[check-docs-examples] ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  // eslint-disable-next-line no-console
  console.log(`[check-docs-examples] ${msg}`);
}

// --- Discover the known-good sets ---------------------------------------

const buildExamplesSrc = readFileSync(buildExamplesPath, 'utf8');
const completeAppsMatch = buildExamplesSrc.match(/const COMPLETE_APPS = \[([\s\S]*?)\];/);
if (!completeAppsMatch) {
  fail(`could not find COMPLETE_APPS in ${buildExamplesPath}`);
  process.exit(1);
}
const completeApps = new Set(
  completeAppsMatch[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean),
);

const browserSpecSrc = readFileSync(browserSpecPath, 'utf8');
const describedApps = new Set(
  [...browserSpecSrc.matchAll(/test\.describe\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
);

// --- Walk migration pages -----------------------------------------------

const docFiles = readdirSync(migratingDir)
  .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
  .map((f) => resolve(migratingDir, f));

const linkRe = /\/kerf\/run\/([a-z0-9-]+)\/?/g;
const codeBlockRe = /```(tsx|ts)\n([\s\S]*?)```/g;

const scratchDir = resolve(repoRoot, 'tests/.docs-examples-scratch');
if (existsSync(scratchDir)) rmSync(scratchDir, { recursive: true, force: true });
mkdirSync(scratchDir, { recursive: true });

let totalLinks = 0;
let totalCompiledBlocks = 0;
let totalSkippedBlocks = 0;

const blocksToCompile = []; // { srcFile, idx, body, lang }

for (const docFile of docFiles) {
  const src = readFileSync(docFile, 'utf8');
  const docName = docFile.split('/').pop();

  // Check 1: every /kerf/run/<name>/ link resolves to a built+tested example.
  for (const match of src.matchAll(linkRe)) {
    const name = match[1];
    totalLinks++;
    if (!completeApps.has(name)) {
      fail(
        `${docName}: /kerf/run/${name}/ link references an example NOT in COMPLETE_APPS at ${buildExamplesPath}`,
      );
    }
    if (!describedApps.has(name)) {
      fail(
        `${docName}: /kerf/run/${name}/ link references an example with NO test.describe('${name}') block in ${browserSpecPath}`,
      );
    }
  }

  // Check 2: extract self-contained kerf code blocks.
  let m;
  let blockIdx = 0;
  while ((m = codeBlockRe.exec(src)) !== null) {
    const lang = m[1];
    const body = m[2];
    blockIdx++;

    const importsKerf = /from\s+['"]kerfjs(?:\/[a-z-]+)?['"]/.test(body);
    if (!importsKerf) {
      totalSkippedBlocks++;
      continue;
    }
    // Self-contained = imports ONLY from kerfjs. A block that also pulls in
    // react / react-dom / relative modules (e.g. the framework-interop examples
    // on the incremental-adoption page) can't compile in the kerfjs-only scratch
    // sandbox — it's a multi-runtime fragment, not a runnable unit. Skip it.
    const importsOutsideKerf = [...body.matchAll(/from\s+['"]([^'"]+)['"]/g)]
      .map((mm) => mm[1])
      .some((s) => !/^kerfjs(?:\/[a-z-]+)?$/.test(s));
    if (importsOutsideKerf) {
      totalSkippedBlocks++;
      continue;
    }
    if (/\/\*\s*\.\.\.\s*\*\/|\/\/\s*\.\.\./.test(body)) {
      // Block has explicit "rest of code omitted" placeholders — pedagogical
      // fragment, not a runnable unit. Skip.
      totalSkippedBlocks++;
      continue;
    }

    blocksToCompile.push({
      srcFile: docName,
      idx: blockIdx,
      body,
      lang,
    });
  }
}

if (process.exitCode === 1) {
  ok(`${totalLinks} /kerf/run/ links — see errors above`);
  process.exit(1);
}
ok(`${totalLinks} /kerf/run/ links resolve to built+tested examples`);

// --- Check 3: example doc excerpts mirror their source's kerfjs imports ----

/** Pull every named import (including `type` imports) from any
 *  `import { ... } from 'kerfjs[/subpath]'` statement in `src`. */
function extractKerfImports(src) {
  const out = new Set();
  const re = /import\s*(?:type\s+)?\{\s*([^}]+)\s*\}\s*from\s*['"]kerfjs(?:\/[a-z-]+)?['"]/g;
  for (const m of src.matchAll(re)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (name) out.add(name);
    }
  }
  return out;
}

let totalExamplePairs = 0;
const exampleDocFiles = existsSync(exampleDocsDir)
  ? readdirSync(exampleDocsDir).filter((f) => f.endsWith('.md') && f !== 'index.md')
  : [];

for (const docFile of exampleDocFiles) {
  const baseName = docFile.replace(/\.md$/, '');
  const srcPath = resolve(exampleSrcDir, baseName, 'main.tsx');
  if (!existsSync(srcPath)) continue; // doc has no paired source — skip
  totalExamplePairs++;

  const srcImports = extractKerfImports(readFileSync(srcPath, 'utf8'));
  const docImports = extractKerfImports(readFileSync(resolve(exampleDocsDir, docFile), 'utf8'));

  const missing = [...srcImports].filter((i) => !docImports.has(i));
  if (missing.length > 0) {
    fail(
      `${docFile}: paired source examples/complete/${baseName}/main.tsx imports ` +
      `[${missing.join(', ')}] from kerfjs, but the doc excerpt never mentions ` +
      `${missing.length === 1 ? 'it' : 'them'}. Update the doc to reflect the canonical pattern.`,
    );
  }
}
if (process.exitCode === 1) {
  ok(`${totalExamplePairs} example doc/source pairs — drift detected, see errors above`);
  process.exit(1);
}
ok(`${totalExamplePairs} example doc/source pairs have matching kerfjs imports`);

// --- Compile self-contained blocks via tsc ------------------------------

// Use the existing tests/dist/jsx-typing tsconfig as the template — it
// already points at the built dist/ types and sets jsxImportSource: kerfjs.
const baseTsconfig = JSON.parse(readFileSync(distTypingTsconfig, 'utf8'));
const tsconfig = {
  compilerOptions: {
    ...baseTsconfig.compilerOptions,
    paths: Object.fromEntries(
      Object.entries(baseTsconfig.compilerOptions.paths).map(([k, v]) => [
        k,
        v.map((p) => p.replace(/\.\.\/\.\.\/\.\.\//g, '../../')),
      ]),
    ),
  },
  include: ['./**/*.ts', './**/*.tsx'],
  exclude: ['node_modules'],
};
writeFileSync(resolve(scratchDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

for (const { srcFile, idx, body, lang } of blocksToCompile) {
  const name = `${srcFile.replace(/\.[^.]+$/, '')}-block-${idx}.${lang}`;
  writeFileSync(resolve(scratchDir, name), body);
  totalCompiledBlocks++;
}

if (totalCompiledBlocks === 0) {
  ok(`no self-contained kerf code blocks to compile (${totalSkippedBlocks} blocks skipped as fragments)`);
  rmSync(scratchDir, { recursive: true, force: true });
  process.exit(0);
}

try {
  execSync(`node node_modules/typescript7/bin/tsc -p ${scratchDir}`, { stdio: 'inherit' });
  ok(`${totalCompiledBlocks} self-contained kerf code blocks compile clean (${totalSkippedBlocks} fragments skipped)`);
  rmSync(scratchDir, { recursive: true, force: true });
} catch {
  fail(`${totalCompiledBlocks} self-contained kerf code blocks attempted; tsc failed above. Scratch dir kept at ${scratchDir} for inspection.`);
  process.exit(1);
}
