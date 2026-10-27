import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { defaultOutput } from './capture.mjs';

const { chromium } = createRequire(import.meta.url)('@playwright/test');
const root = resolve(process.argv[2] ?? defaultOutput);
const data = JSON.parse(
  await readFile(root + '/resizing-verification.json', 'utf8'),
);
const fixtures = JSON.parse(await readFile(root + '/fixtures.json', 'utf8'));
const layout = JSON.parse(await readFile(root + '/layout-report.json', 'utf8'));
assert.equal(data.cases.length, 30);
assert.equal(data.reopened.length, 30);
const near = (a, b, message) =>
  assert.ok(Math.abs(a - b) < 0.01, `${message}: ${a} vs ${b}`);
for (const c of data.cases) {
  const text = c.textFrame,
    icon = c.expanded.find((l) => l.name === 'Icon');
  const start = icon ? icon.frame.x : text.x,
    end = text.x + text.width;
  near(
    (start + end) / 2,
    c.frame.width / 2,
    `${c.name}/${c.case} horizontal centering`,
  );
  near(text.y + text.height / 2, c.frame.height / 2, 'vertical centering');
  assert.ok(start >= 8.99, 'minimum left inset');
  assert.ok(c.frame.width - end >= 8.99, 'minimum right inset');
  if (icon) {
    near(icon.frame.width, 16, 'fixed icon width');
    near(icon.frame.height, 16, 'fixed icon height');
    near(text.x - icon.frame.x - icon.frame.width, 8, 'icon gap');
    near(icon.frame.y + 8, c.frame.height / 2, 'icon vertical centering');
  }
  assert.equal(c.linked, true);
  const reopened = data.reopened.find((r) => r.id === c.id);
  assert.deepEqual(reopened.frame, c.frame);
  assert.deepEqual(reopened.textFrame, c.textFrame);
  assert.equal(reopened.label, c.label);
}
for (const l of layout) {
  assert.equal(l.text.alignment, 'center');
  assert.equal(l.text.verticalAlignment, 'center');
  assert.equal(l.text.fontWeight, 6);
  assert.deepEqual(l.corners.radii, [12]);
  assert.equal(l.stack.wraps, false);
  assert.equal(l.stack.gap, 8);
  assert.equal(l.stack.padding.left, 9);
  assert.equal(l.stack.padding.right, 9);
}
await mkdir(root + '/resize-browser', { recursive: true });
const browser = await chromium.launch();
try {
  const previews = [];
  for (let fi = 0; fi < fixtures.length; fi++) {
    const f = fixtures[fi],
      cards = [];
    for (const c of data.cases.filter((c) => c.name === f.name)) {
      const page = await browser.newPage({
        viewport: { width: 500, height: 160 },
        deviceScaleFactor: 2,
        colorScheme: f.theme,
      });
      await page.goto(pathToFileURL(root + '/inputs/' + f.id + '.html').href);
      await page.locator('.kui-button').evaluate((el, c) => {
        el.querySelector('.kui-button__label').textContent = c.label;
        if (c.case !== 'hug-long') {
          el.setAttribute('data-fill', 'true');
          el.parentElement.style.width = c.frame.width + 'px';
        }
        if (c.case === 'tall') el.style.height = c.frame.height + 'px';
      }, c);
      await page.evaluate(() => document.fonts.ready);
      const sourcePath = `${root}/resize-browser/symbol-${fi}-${c.case}.png`;
      await page
        .locator('.kui-button')
        .screenshot({ path: sourcePath, omitBackground: true });
      await page.close();
      const source = (await readFile(sourcePath)).toString('base64');
      const native = (
        await readFile(`${root}/resize-exports/symbol-${fi}-${c.case}.png`)
      ).toString('base64');
      cards.push(
        `<article><h4>${c.case}: ${c.frame.width}×${c.frame.height}</h4><label>Browser</label><img src="data:image/png;base64,${source}"><label>Sketch</label><img src="data:image/png;base64,${native}"></article>`,
      );
    }
    previews.push(
      `<section class="${f.theme}"><h3>${f.name}</h3><div>${cards.join('')}</div></section>`,
    );
  }
  const html = `<!doctype html><style>body{margin:0;font:14px system-ui}section{padding:20px;background:white;color:#111}section.dark{background:#111113;color:#fff}section>div{display:grid;grid-template-columns:repeat(5,340px);gap:20px}h3{margin:0 0 12px}h4{margin:0 0 10px}label{display:block;font-size:12px;margin:8px 0}img{display:block;zoom:.5}</style>${previews.join('')}`;
  await writeFile(root + '/resizing-comparison.html', html);
  const page = await browser.newPage({
    viewport: { width: 1820, height: 1200 },
  });
  await page.goto(pathToFileURL(root + '/resizing-comparison.html').href);
  await page
    .locator('img')
    .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
  await page.screenshot({
    path: root + '/resizing-comparison.png',
    fullPage: true,
  });
} finally {
  await browser.close();
}
await writeFile(
  root + '/layout-checks.json',
  JSON.stringify(
    {
      passed: true,
      symbols: 6,
      resizingCases: 30,
      reopenedInstances: 30,
      checks: [
        'content-fit growth',
        'manual wider and narrower widths',
        'taller instances',
        'horizontal content-group centering',
        'vertical centering',
        'fixed icon size',
        '8px icon gap',
        'minimum insets',
        'centered text attributes',
        '12px corners',
        'preserved overrides and dimensions after reopening',
      ],
    },
    null,
    2,
  ),
);
console.log('Passed: six Symbols, 30 resizing cases, 30 reopened instances.');
