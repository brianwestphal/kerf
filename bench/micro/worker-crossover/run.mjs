// Worker-crossover micro-benchmark: main thread vs. a real module worker in
// real browsers (Playwright). Directional only; never publish these numbers.
//
//   node bench/micro/worker-crossover/run.mjs \
//     [--browsers=chromium,firefox,webkit] [--sizes=1000,10000,100000,1000000] [--runs=3]
//
// Prints one markdown table per engine: the median over `--runs` fresh browser
// launches of each case's in-page median.
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, firefox, webkit } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ??
  fallback;
const browsers = arg('browsers', 'chromium').split(',');
const sizes = arg('sizes', '1000,10000,100000,1000000').split(',').map(Number);
const runs = Number(arg('runs', '3'));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const file = join(here, path === '/' ? 'page.html' : path);
  const type = TYPES[extname(file)];
  if (!file.startsWith(here) || type === undefined) {
    res.writeHead(404).end();
    return;
  }
  // Cross-origin isolation only to sharpen performance.now() from 100 µs to
  // ~5 µs; nothing here uses SharedArrayBuffer.
  res.writeHead(200, {
    'content-type': type,
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-embedder-policy': 'require-corp',
  });
  createReadStream(file)
    .on('error', () => res.end())
    .pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

const engines = { chromium, firefox, webkit };
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmt = (ms) =>
  ms < 1 ? ms.toFixed(3) : ms < 100 ? ms.toFixed(2) : ms.toFixed(0);

for (const name of browsers) {
  const all = [];
  let version = '';
  for (let r = 0; r < runs; r++) {
    const browser = await engines[name].launch();
    version = browser.version();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => window.ready === true);
    all.push(await page.evaluate((s) => window.runBench(s), sizes));
    await browser.close();
  }
  console.log(
    `\n### ${name} ${version}: median of ${runs} runs (ms; busy = main-thread time)\n`,
  );
  console.log('| case | N | mode | round trip | main-thread busy |');
  console.log('| --- | ---: | --- | ---: | ---: |');
  all[0].forEach((row, i) => {
    const total = median(all.map((run) => run[i].total));
    const busy = median(all.map((run) => run[i].busy));
    console.log(
      `| ${row.case} | ${row.n} | ${row.mode} | ${fmt(total)} | ${fmt(busy)} |`,
    );
  });
}
server.close();
process.exit(0);
