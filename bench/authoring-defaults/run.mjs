import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { bundle, directory, repository, variants } from './build.mjs';
import { picker, table } from './workload.mjs';

const fixtureFiles = [
  'build.mjs',
  'workload.mjs',
  'run.mjs',
  ...(await readdir(path.join(directory, 'fixtures')))
    .sort()
    .map((name) => 'fixtures/' + name),
];
const rounds = Number(process.env.ROUNDS ?? 5);
const seed = Number(process.env.SEED ?? 1729);
if (!Number.isInteger(rounds) || rounds < 1 || !Number.isSafeInteger(seed))
  throw new Error('Invalid ROUNDS or SEED');
let random = seed >>> 0;
function shuffle(entries) {
  const order = [...entries];
  for (let i = order.length - 1; i > 0; i--) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((random / 2 ** 32) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
const checksum = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = {
  metadata: {
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repository,
      encoding: 'utf8',
    }).trim(),
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
    seed,
    rounds,
    viewport: { width: 1000, height: 760 },
    dependencies: JSON.parse(
      await readFile(path.join(directory, 'package.json'), 'utf8'),
    ).dependencies,
    lockSha256: checksum(
      await readFile(path.join(directory, 'package-lock.json')),
    ),
    rootLockSha256: checksum(
      await readFile(path.join(repository, 'package-lock.json')),
    ),
    uiLockSha256: checksum(
      await readFile(path.join(repository, 'ui/package-lock.json')),
    ),
    playwright: JSON.parse(
      await readFile(
        path.join(repository, 'node_modules/playwright/package.json'),
        'utf8',
      ),
    ).version,
    fixtureSha256: checksum(
      Buffer.concat(
        await Promise.all(
          fixtureFiles.map((file) => readFile(path.join(directory, file))),
        ),
      ),
    ),
    reactCompiler: false,
  },
  builds: {},
  pages: [],
};
const entries = new Map();
for (const variant of variants) {
  const name = variant.name;
  const timed = await bundle(variant, false);
  const counted =
    variant.form === 'picker' ? timed : await bundle(variant, true);
  entries.set(name, { timed, counted });
  run.builds[name] = Object.fromEntries(
    Object.entries(timed).map(([filename, buffer]) => [
      filename,
      {
        rawBytes: buffer.length,
        gzipBytes: gzipSync(buffer, { level: 9 }).length,
        sha256: checksum(buffer),
      },
    ]),
  );
}
const browser = await chromium.launch();
run.metadata.browser = browser.version();
try {
  for (let round = -1; round < rounds; round++) {
    for (const variant of shuffle(variants)) {
      const { name, form } = variant;
      const context = await browser.newContext({
        viewport: run.metadata.viewport,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(4500);
      const instrumented = round === -1;
      const record = {
        name,
        round,
        pass: instrumented ? 'correctness-counters' : 'timing',
        assets: [],
      };
      const files = entries.get(name)[instrumented ? 'counted' : 'timed'];
      try {
        // Browser loads only the prebuilt local production assets. Fulfil from
        // memory so machine-local server startup and network don't affect runs.
        await page.route('**/*', async (route) => {
          const key = new URL(route.request().url()).pathname;
          if (key === '/')
            return route.fulfill({
              contentType: 'text/html',
              body: '<!doctype html><link rel="stylesheet" href="/asset.css"><main></main><script type="module" src="/asset.js"></script>',
            });
          if (!files[key]) return route.abort();
          record.assets.push(key);
          return route.fulfill({
            contentType: key.endsWith('.css') ? 'text/css' : 'text/javascript',
            body: files[key],
          });
        });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('http://baseline.test/');
        if (errors.length) throw new Error(errors.join('\n'));
        const perform = () =>
          form === 'picker' ? picker(page) : table(page, instrumented);
        if (!instrumented) {
          const cold = await perform();
          record.coldMount = cold[0];
          if (form === 'picker')
            await page.evaluate(() => {
              window.commits = [];
            });
        }
        record.samples = await perform();
        if (instrumented) {
          const cdp = await context.newCDPSession(page);
          async function usedHeap() {
            await cdp.send('HeapProfiler.collectGarbage');
            return (await cdp.send('Runtime.getHeapUsage')).usedSize;
          }
          // Page is warmed and disposed. Release the test-owned focus reference.
          await page.evaluate(() => {
            window.referenceInput = null;
          });
          const before = await usedHeap();
          for (let i = 0; i < 3; i++) {
            if (form === 'picker')
              await page.evaluate(() => {
                window.commits = [];
              });
            await perform();
            await page.evaluate(() => {
              window.referenceInput = null;
            });
          }
          record.heap = {
            cycles: 3,
            beforeBytes: before,
            afterBytes: await usedHeap(),
          };
        }
        if (errors.length) throw new Error(errors.join('\n'));
        record.ok = true;
      } catch (error) {
        record.ok = false;
        record.error = String(error.message).slice(0, 500);
        console.error(name, record.error);
      } finally {
        await context.close();
        run.pages.push(record);
      }
    }
  }
} finally {
  await browser.close();
}
const dest = process.env.RESULT ?? path.join(directory, 'results.local.json');
await writeFile(dest, JSON.stringify(run) + '\n');
console.log(dest);
if (run.pages.some((page) => !page.ok)) process.exitCode = 1;
