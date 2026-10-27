import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from 'playwright';

import { defaultOutput } from './capture.mjs';

const selected = [
  'select-form-control',
  'search-field-tokens-control',
  'tag-field-tags-control',
  'slider-readout-control',
  'color-field-hint-control',
  'color-picker-rgb-control',
  'color-swatches-palette-control',
];
const output = defaultOutput;
const fixtures = JSON.parse(
  await readFile(join(output, 'fixtures.json'), 'utf8'),
);
const png = async (path) => (await readFile(path)).toString('base64');
const browser = await chromium.launch({ headless: true });
try {
  for (const theme of ['light', 'dark']) {
    const rows = [];
    for (const prefix of selected) {
      const fixture = fixtures.filter(
        (item) => item.id === `${prefix}-${theme}`,
      )[0];
      assert.ok(
        fixture,
        `Missing advanced comparison fixture: ${prefix}-${theme}`,
      );
      const native = await png(join(output, 'exports', `${fixture.id}.png`));
      const wide = await png(
        join(output, 'consumer-exports', `${fixture.id}-wide.png`),
      );
      const svg = Buffer.from(fixture.svg).toString('base64');
      rows.push(`<section><h2>${fixture.name}</h2><div class="pair">
        <figure><figcaption>Production SVG</figcaption><img width="${fixture.box.width}" height="${fixture.box.height}" src="data:image/svg+xml;base64,${svg}"></figure>
        <figure><figcaption>Editable Sketch Symbol</figcaption><img width="${fixture.box.width}" height="${fixture.box.height}" src="data:image/png;base64,${native}"></figure>
        <figure><figcaption>Linked instance, +80px and text override</figcaption><img width="${fixture.box.width + 80}" height="${fixture.box.height}" src="data:image/png;base64,${wide}"></figure>
      </div></section>`);
    }
    const background = theme === 'light' ? '#fff' : '#1c1c1e';
    const color = theme === 'light' ? '#1d1d1f' : '#f5f5f7';
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:${background};color:${color};font:14px system-ui,-apple-system,sans-serif}
      h1{font-size:22px;margin:0 0 20px}h2{font-size:16px;margin:0 0 12px}section{margin:0 0 24px;padding:16px;border:1px solid ${theme === 'light' ? '#ddd' : '#555'};border-radius:10px}
      .pair{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start}figure{margin:0;min-width:0}figcaption{font-size:12px;margin-bottom:8px;color:${theme === 'light' ? '#666' : '#aaa'}}img{display:block;max-width:100%;height:auto}
    </style></head><body><h1>Kerf advanced-input Symbols · ${theme}</h1>${rows.join('')}</body></html>`;
    const page = await browser.newPage({
      viewport: { width: 1500, height: 900 },
      colorScheme: theme,
      deviceScaleFactor: 1,
    });
    await page.setContent(html);
    await page.screenshot({
      path: join(output, `comparison-${theme}.png`),
      fullPage: true,
    });
    await page.close();
    console.log(`Reviewed ${rows.length} ${theme} advanced Symbol pairs.`);
  }
} finally {
  await browser.close();
}
