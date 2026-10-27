import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { defaultOutput } from './capture.mjs';
import { variants } from './variant-capture.mjs';

const { chromium } = createRequire(import.meta.url)('@playwright/test');
const root = resolve(process.argv[2] ?? defaultOutput);
const fixtures = JSON.parse(
  await readFile(`${root}/variant-fixtures.json`, 'utf8'),
);
const verification = JSON.parse(
  await readFile(`${root}/variant-verification.json`, 'utf8'),
);
assert.equal(fixtures.length, variants.length * 2);
assert.equal(verification.symbols.length, fixtures.length);
assert.equal(verification.cases.length, fixtures.length * 3);
assert.equal(verification.reopenedInstances, fixtures.length * 3);
assert.ok(verification.cases.every((item) => item.linked));
const sheets = {};
for (const theme of ['light', 'dark']) {
  const rows = [];
  for (const f of fixtures.filter((item) => item.theme === theme)) {
    const [source, native] = await Promise.all([
      readFile(`${root}/variant-inputs/${f.id}.png`),
      readFile(`${root}/variant-exports/${f.id}.png`),
    ]);
    rows.push(
      `<section data-id="${f.id}"><h3>${f.name}</h3><div><label>Browser<img src="data:image/png;base64,${source.toString('base64')}"></label><label>Sketch<img src="data:image/png;base64,${native.toString('base64')}"></label></div></section>`,
    );
  }
  const html = `<!doctype html><style>body{margin:0;padding:20px;background:${theme === 'light' ? '#fff' : '#111113'};color:${theme === 'light' ? '#111' : '#fff'};font:14px system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:12px}section{padding:8px;border:1px solid #8885;min-height:95px}h3{font-size:13px;margin:0 0 6px}section>div{display:flex;gap:18px}label{font-size:11px;width:45%}img{display:block;margin-top:4px;zoom:.5;max-width:none}</style><main>${rows.join('')}</main>`;
  await writeFile(`${root}/variant-comparison-${theme}.html`, html);
  sheets[theme] = `${root}/variant-comparison-${theme}.html`;
}
const browser = await chromium.launch();
const metrics = [];
try {
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({
      viewport: { width: 950, height: 900 },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(sheets[theme]).href);
    await page
      .locator('img')
      .evaluateAll((images) =>
        Promise.all(images.map((item) => item.decode())),
      );
    const batch = await page.locator('section').evaluateAll((sections) =>
      sections.map((section) => {
        const images = [...section.querySelectorAll('img')];
        const [a, b] = images.map((image) => {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, canvas.width, canvas.height);
        });
        const width = Math.min(a.width, b.width);
        const height = Math.min(a.height, b.height);
        let difference = 0;
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) {
            const ai = (y * a.width + x) * 4;
            const bi = (y * b.width + x) * 4;
            for (let c = 0; c < 4; c++)
              difference += Math.abs(a.data[ai + c] - b.data[bi + c]);
          }
        return {
          id: section.dataset.id,
          browser: [a.width, a.height],
          sketch: [b.width, b.height],
          meanChannelError: difference / (width * height * 4),
        };
      }),
    );
    metrics.push(...batch);
    await page.screenshot({
      path: `${root}/variant-comparison-${theme}.png`,
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${root}/variant-comparison.json`,
  `${JSON.stringify(metrics, null, 2)}\n`,
);
console.log(
  `Compared ${metrics.length} production Button captures with native Sketch exports.`,
);
