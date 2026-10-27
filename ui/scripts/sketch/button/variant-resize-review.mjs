import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { defaultOutput } from './capture.mjs';

const { chromium } = createRequire(import.meta.url)('@playwright/test');
const root = resolve(process.argv[2] ?? defaultOutput);
const fixtures = JSON.parse(
  await readFile(`${root}/variant-fixtures.json`, 'utf8'),
);
const verification = JSON.parse(
  await readFile(`${root}/variant-verification.json`, 'utf8'),
);
const selected = new Set([
  'icon-only',
  'loading-brand',
  'badge-brand',
  'badge-dot',
  'focus-standard',
  'focus-brand',
]);
const rows = [];
const browser = await chromium.launch();
try {
  for (const fixture of fixtures.filter((item) =>
    selected.has(item.id.slice(0, -item.theme.length - 1)),
  )) {
    const test = verification.cases.find(
      (item) => item.id === fixture.id && item.step === 2,
    );
    assert.ok(test?.linked, `Missing linked fixed-width variant ${fixture.id}`);
    const page = await browser.newPage({
      viewport: { width: 400, height: 140 },
      colorScheme: fixture.theme,
      deviceScaleFactor: 2,
    });
    await page.goto(
      pathToFileURL(`${root}/variant-inputs/${fixture.id}.html`).href,
    );
    await page.locator('#frame').evaluate((frame, width) => {
      frame.style.width = `${width}px`;
    }, test.frame.width);
    const button = page.locator('.kui-button');
    await button.evaluate((element) =>
      element.setAttribute('data-fill', 'true'),
    );
    await page.evaluate(() => document.fonts.ready);
    if (fixture.focus) await button.focus();
    const bounds = await button.boundingBox();
    assert.ok(bounds);
    const sourcePath = `${root}/variant-inputs/${fixture.id}-wide.png`;
    if (fixture.id.startsWith('focus-standard-'))
      await page.screenshot({
        path: sourcePath,
        omitBackground: true,
        clip: {
          x: bounds.x - 4,
          y: bounds.y - 4,
          width: bounds.width + 8,
          height: bounds.height + 8,
        },
      });
    else if (fixture.layout.badge && !fixture.layout.badge.dot)
      await page.screenshot({
        path: sourcePath,
        omitBackground: true,
        clip: {
          x: bounds.x,
          y: bounds.y - 4,
          width: bounds.width + 4,
          height: bounds.height + 4,
        },
      });
    else await button.screenshot({ path: sourcePath, omitBackground: true });
    await page.close();
    const [source, native] = await Promise.all([
      readFile(sourcePath),
      readFile(`${root}/variant-consumer-exports/${fixture.id}-2.png`),
    ]);
    rows.push(
      `<section class="${fixture.theme}"><h3>${fixture.name} · ${test.frame.width}px fixed</h3><div><label>Browser<img src="data:image/png;base64,${source.toString('base64')}"></label><label>Sketch Library instance<img src="data:image/png;base64,${native.toString('base64')}"></label></div></section>`,
    );
  }
} finally {
  await browser.close();
}
assert.equal(rows.length, selected.size * 2);
const html = `<!doctype html><style>body{margin:0;padding:16px;font:14px system-ui;background:#ddd}main{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}section{min-height:90px;padding:10px;background:#fff;color:#111}section.dark{background:#111113;color:#fff}h3{font-size:13px;margin:0 0 6px}section>div{display:flex;gap:12px}label{font-size:11px;width:48%}img{display:block;margin-top:4px;zoom:.5;max-width:none}</style><main>${rows.join('')}</main>`;
await writeFile(`${root}/variant-resize-comparison.html`, html);
const review = await chromium.launch();
try {
  const page = await review.newPage({
    viewport: { width: 1040, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(`${root}/variant-resize-comparison.html`).href);
  await page
    .locator('img')
    .evaluateAll((images) => Promise.all(images.map((item) => item.decode())));
  await page.screenshot({
    path: `${root}/variant-resize-comparison.png`,
    fullPage: true,
  });
} finally {
  await review.close();
}
console.log(
  `Reviewed ${rows.length} fixed-width browser/native Button state pairs.`,
);
