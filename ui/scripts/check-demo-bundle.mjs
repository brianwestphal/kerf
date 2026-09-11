import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const assetsDir = fileURLToPath(new URL('../dist-demo/assets/', import.meta.url));
const limits = {
  largestJavaScriptGzip: 150_000,
  totalJavaScriptGzip: 235_000,
};

const javascript = (await readdir(assetsDir)).filter((name) => name.endsWith('.js'));
if (javascript.length < 2) throw new Error('UX demo must emit multiple JavaScript chunks');

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
