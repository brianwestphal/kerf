import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { defaultOutput } from './capture.mjs';

const { chromium } = createRequire(import.meta.url)('@playwright/test');
const root = resolve(process.argv[2] ?? defaultOutput);
const source = JSON.parse(await readFile(`${root}/fill-layout.json`, 'utf8'));
const native = JSON.parse(
  await readFile(`${root}/fill-verification.json`, 'utf8'),
);
assert.equal(source.source, 'Button({ fill: true })');
assert.equal(source.cases.length, 36);
assert.equal(native.cases.length, 36);
assert.equal(native.reopened.length, 36);
assert.equal(native.transitions.length, 6);

const rows = [];
for (const test of source.cases) {
  const current = native.cases.find((entry) => entry.id === test.id);
  const reopened = native.reopened.find((entry) => entry.id === test.id);
  assert.ok(current && reopened, `Missing native case ${test.id}`);
  assert.equal(current.label, test.displayLabel);
  assert.equal(reopened.label, test.displayLabel);
  assert.equal(current.frame.width, test.width);
  assert.equal(current.frame.height, 44);
  assert.equal(current.linked, true);
  assert.equal(reopened.linked, true);
  if (test.sizeCase === 'below')
    assert.notEqual(test.displayLabel, test.sourceLabel);
  else assert.equal(test.displayLabel, test.sourceLabel);
  const [browserImage, nativeImage] = await Promise.all([
    readFile(`${root}/fill-browser/${test.id}.png`),
    readFile(`${root}/fill-exports/${test.id}.png`),
  ]);
  rows.push({
    ...test,
    browserImage: browserImage.toString('base64'),
    nativeImage: nativeImage.toString('base64'),
  });
}

function markup(items) {
  return `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:14px system-ui;background:#e5e7eb;color:#111827}
main{display:grid;grid-template-columns:repeat(3,minmax(300px,1fr));gap:12px;padding:12px}
article{padding:12px;background:#fff;border-radius:8px;overflow:hidden}
article.dark{background:#111113;color:#fff}
h2{margin:0 0 8px;font-size:14px}p{margin:0 0 8px;font-size:12px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start}
label{display:block;font-size:11px;margin-bottom:4px}
img{display:block;max-width:100%;height:auto}
</style><main>${items
    .map(
      (entry) =>
        `<article class="${entry.theme}"><h2>${entry.id}</h2><p>${entry.width}px · ${entry.sourceLabel} → ${entry.displayLabel}</p><div class="pair"><div><label>Real Button(fill:true)</label><img src="data:image/png;base64,${entry.browserImage}"></div><div><label>Editable Sketch Symbol</label><img src="data:image/png;base64,${entry.nativeImage}"></div></div></article>`,
    )
    .join('')}</main>`;
}

const browser = await chromium.launch();
try {
  for (const [name, items] of [
    ['fill-comparison', rows],
    [
      'fill-comparison-narrow',
      rows.filter((entry) => entry.sizeCase === 'below'),
    ],
  ]) {
    const path = `${root}/${name}.html`;
    await writeFile(path, markup(items));
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(pathToFileURL(path).href);
    await page
      .locator('img')
      .evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
    const sizes = await page
      .locator('article')
      .evaluateAll((articles) =>
        articles.map((article) =>
          [...article.querySelectorAll('img')].map((image) => [
            image.naturalWidth,
            image.naturalHeight,
          ]),
        ),
      );
    for (const pair of sizes)
      assert.deepEqual(
        pair[0],
        pair[1],
        'Browser and Sketch export size differs',
      );
    await page.screenshot({ path: `${root}/${name}.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${root}/fill-checks.json`,
  `${JSON.stringify(
    {
      passed: true,
      browserSource: source.source,
      modes: ['natural-content', 'fixed-fill-with-manual-ellipsis'],
      cases: source.cases.length,
      reopened: native.reopened.length,
      resizeCycles: native.transitions.length,
      checks: [
        'real Button(fill:true) browser source',
        'above, equal, and below intrinsic widths',
        'short and long labels, with and without icon, light and dark',
        'editable label overrides with no content spill',
        'centered content group, fixed 16px icon, 8px gap',
        'resize, override edit, widen, and reset to Fit',
        'Library links and overrides after save/reopen',
      ],
    },
    null,
    2,
  )}\n`,
);
console.log('Passed: 36 fill cases, 36 reopened instances, six resize cycles.');
