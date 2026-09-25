import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  gzipDelta,
  measureDemoBundle,
  measuringNodeMismatch,
  updateDemoBundleBudget,
} from './lib/demo-bundle-budget.mjs';

const assetsDir = fileURLToPath(
  new URL('../dist-demo/assets/', import.meta.url),
);
const budgetUrl = new URL('../demo-bundle-budget.json', import.meta.url);
const limits = JSON.parse(await readFile(budgetUrl, 'utf8'));
const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const updateBudget = process.argv.includes('--update-budget');
const json = process.argv.includes('--json');

const javascript = (await readdir(assetsDir)).filter((name) =>
  name.endsWith('.js'),
);
const stylesheets = (await readdir(assetsDir)).filter((name) =>
  name.endsWith('.css'),
);
if (javascript.length < 2)
  throw new Error('UX demo must emit multiple JavaScript chunks');

const indexHtml = await readFile(
  new URL('../dist-demo/index.html', import.meta.url),
  'utf8',
);
const emittedModules = await Promise.all(
  javascript.map((name) =>
    readFile(new URL(`../dist-demo/assets/${name}`, import.meta.url), 'utf8'),
  ),
);
if (
  [indexHtml, ...emittedModules].some((source) => /["']\/assets\//.test(source))
) {
  throw new Error(
    'UX demo assets must use relative URLs so the catalog remains relocatable below a host path',
  );
}

for (const name of stylesheets) {
  const css = await readFile(
    new URL(`../dist-demo/assets/${name}`, import.meta.url),
    'utf8',
  );
  if (css.includes('remify(')) {
    throw new Error(
      `UX demo stylesheet ${name} still contains remify() authoring syntax`,
    );
  }
}

const nodeMismatch = measuringNodeMismatch(
  process.version,
  await readFile(new URL('../../.nvmrc', import.meta.url), 'utf8'),
);
if (nodeMismatch && updateBudget) throw new Error(nodeMismatch);
if (nodeMismatch) console.warn(`Warning: ${nodeMismatch}`);

const measurement = await measureDemoBundle(assetsDir);
const delta = gzipDelta(measurement, limits);

if (updateBudget) {
  const next = updateDemoBundleBudget(
    limits,
    measurement,
    process.env.KERF_UI_BUNDLE_REASON ?? valueAfter('--reason') ?? '',
    new Date().toISOString(),
  );
  await writeFile(budgetUrl, `${JSON.stringify(next, null, 2)}\n`);
  console.log(
    `UX demo bundle budget updated: ${limits.measuredTotalJavaScriptGzip} -> ${measurement.totalJavaScriptGzip} bytes measured; ${limits.totalJavaScriptGzip} -> ${next.totalJavaScriptGzip} bytes budget.`,
  );
  process.exit(0);
}

function kb(bytes) {
  return `${(bytes / 1000).toFixed(2)} kB`;
}

if (measurement.largestJavaScriptGzip > limits.largestJavaScriptGzip) {
  throw new Error(
    `UX demo largest JavaScript chunk ${measurement.largestJavaScriptAsset} is ${kb(measurement.largestJavaScriptGzip)} gzip; budget is ${kb(limits.largestJavaScriptGzip)}`,
  );
}
if (measurement.totalJavaScriptGzip > limits.totalJavaScriptGzip) {
  throw new Error(
    `UX demo JavaScript totals ${kb(measurement.totalJavaScriptGzip)} gzip; budget is ${kb(limits.totalJavaScriptGzip)}. If reviewed, run npm run check:change -- --update-bundle-budget --reason "why the growth is intentional".`,
  );
}

if (json) console.log(JSON.stringify({ ...measurement, delta }));
else
  console.log(
    `UX demo bundle budget: ${measurement.chunks} chunks, ${kb(measurement.totalJavaScriptGzip)} gzip total (${delta.total >= 0 ? '+' : ''}${delta.total} bytes from reviewed baseline), largest ${measurement.largestJavaScriptAsset} at ${kb(measurement.largestJavaScriptGzip)} gzip (${delta.largest >= 0 ? '+' : ''}${delta.largest} bytes)`,
  );
