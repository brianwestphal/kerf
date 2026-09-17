import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const assetsDir = fileURLToPath(new URL('../dist-demo/assets/', import.meta.url));
const limits = {
  largestJavaScriptGzip: 150_000,
  // Measured at 256.29 kB after dogfooding the demo shell onto @kerfjs/ui/catalog
  // (Catalog + wireCatalog); keep only narrow headroom and preserve the split.
  totalJavaScriptGzip: 257_000,
};

const javascript = (await readdir(assetsDir)).filter((name) => name.endsWith('.js'));
const stylesheets = (await readdir(assetsDir)).filter((name) => name.endsWith('.css'));
if (javascript.length < 2) throw new Error('UX demo must emit multiple JavaScript chunks');

const indexHtml = await readFile(new URL('../dist-demo/index.html', import.meta.url), 'utf8');
const emittedModules = await Promise.all(javascript.map((name) => readFile(new URL(`../dist-demo/assets/${name}`, import.meta.url), 'utf8')));
if ([indexHtml, ...emittedModules].some((source) => /["']\/assets\//.test(source))) {
  throw new Error('UX demo assets must use relative URLs so the catalog remains relocatable below a host path');
}

for (const name of stylesheets) {
  const css = await readFile(new URL(`../dist-demo/assets/${name}`, import.meta.url), 'utf8');
  if (css.includes('remify(')) {
    throw new Error(`UX demo stylesheet ${name} still contains remify() authoring syntax`);
  }
}

const sizes = await Promise.all(javascript.map(async (name) => ({
  name,
  gzip: gzipSync(await readFile(new URL(`../dist-demo/assets/${name}`, import.meta.url))).byteLength,
})));
const largest = sizes.reduce((current, asset) => asset.gzip > current.gzip ? asset : current);
const total = sizes.reduce((sum, asset) => sum + asset.gzip, 0);

function kb(bytes) {
  return `${(bytes / 1000).toFixed(2)} kB`;
}

if (largest.gzip > limits.largestJavaScriptGzip) {
  throw new Error(`UX demo largest JavaScript chunk ${largest.name} is ${kb(largest.gzip)} gzip; budget is ${kb(limits.largestJavaScriptGzip)}`);
}
if (total > limits.totalJavaScriptGzip) {
  throw new Error(`UX demo JavaScript totals ${kb(total)} gzip; budget is ${kb(limits.totalJavaScriptGzip)}`);
}

console.log(`UX demo bundle budget: ${javascript.length} chunks, ${kb(total)} gzip total, largest ${largest.name} at ${kb(largest.gzip)} gzip`);
