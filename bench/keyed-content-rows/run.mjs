import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = await build({
  entryPoints: [path.join(here, 'page.tsx')],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const output = {
  revision: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: here,
    encoding: 'utf8',
  }).trim(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  browser: '',
  characterization: [],
  cost: [],
};
const browser = await chromium.launch();
output.browser = browser.version();
try {
  async function createPage() {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><ul></ul>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    return page;
  }
  const positionsPage = await createPage();
  try {
    await positionsPage.evaluate(() => window.verifyPositions());
  } finally {
    await positionsPage.close();
  }
  const modes = ['each', 'legacy', 'watched', 'eager'];
  for (const mode of modes) {
    for (const granular of [false, true]) {
      const page = await createPage();
      try {
        const stages = await page.evaluate(
          ([m, g]) => window.characterize(m, g),
          [mode, granular],
        );
        output.characterization.push({ mode, granular, stages });
      } catch (error) {
        throw new Error(mode + ' granular=' + granular, { cause: error });
      } finally {
        await page.close();
      }
    }
  }
  const sizes = process.env.SMOKE ? [10] : [10, 1000, 10000];
  const repeats = process.env.SMOKE ? 1 : 3;
  for (let repeat = 0; repeat < repeats; repeat++) {
    for (const size of sizes) {
      for (let i = 0; i < modes.length; i++) {
        const mode = modes[(i + repeat) % modes.length];
        for (const use of mode === 'watched' || mode === 'eager'
          ? ['none', 'first', 'all']
          : ['none']) {
          const page = await createPage();
          try {
            const cdp = await page.context().newCDPSession(page);
            async function heap() {
              await cdp.send('HeapProfiler.collectGarbage');
              return (await cdp.send('Runtime.getHeapUsage')).usedSize;
            }
            const before = await heap();
            const created = await page.evaluate(
              ([m, n, u]) => window.cold(m, n, u),
              [mode, size, use],
            );
            if (created.rows !== size)
              throw new Error('incorrect mounted row count');
            const live = await heap();
            await page.evaluate(() => window.clear());
            output.cost.push({
              repeat,
              mode,
              size,
              use,
              ...created,
              liveHeapDelta: live - before,
              disposedHeapDelta: (await heap()) - before,
            });
          } finally {
            await page.close();
          }
        }
      }
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  process.env.RESULT ?? path.join(here, 'results.local.json'),
  JSON.stringify(output, null, 2) + '\n',
);
console.log(
  output.characterization.length +
    ' correctness sequences and ' +
    output.cost.length +
    ' fresh-page measurements',
);
