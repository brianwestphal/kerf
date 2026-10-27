import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  readTemplateCss,
  resolveTemplateStyles,
} from '../../build-design-templates.mjs';

import { defaultOutput } from './capture.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const { Plus } = require('lucide');
const variants = [
  {
    id: 'primary-brand',
    name: 'Primary Brand',
    icon: false,
    props: { tone: 'brand' },
  },
  {
    id: 'secondary',
    name: 'Secondary',
    icon: false,
    props: { emphasis: 'secondary' },
  },
  {
    id: 'icon-brand',
    name: 'Primary with Icon',
    icon: true,
    props: { tone: 'brand' },
  },
];
const labels = [
  { id: 'short', value: 'Cancel' },
  { id: 'long', value: 'Save All Pending Changes' },
];

export async function captureFillCases(output = defaultOutput) {
  const root = resolve(output);
  await mkdir(join(root, 'fill-browser'), { recursive: true });
  const [{ Button }, { LucideIcon }] = await Promise.all([
    import('../../../dist/button.js'),
    import('../../../dist/lucide-icon.js'),
  ]);
  const css = await readTemplateCss(
    await resolveTemplateStyles([
      'foundation',
      'layout',
      'row',
      'lucide-icon',
      'button',
    ]),
  );
  const browser = await chromium.launch();
  const cases = [];
  try {
    for (const theme of ['light', 'dark']) {
      for (const variant of variants) {
        for (const label of labels) {
          const props = {
            ...variant.props,
            children: label.value,
            icon: variant.icon
              ? LucideIcon({ icon: Plus, name: 'plus' })
              : undefined,
          };
          const natural = `<!doctype html><html><head><meta charset="utf-8"><style>${css}\nhtml{color-scheme:${theme}}body{margin:0;background:transparent;font-family:system-ui,-apple-system,sans-serif}</style></head><body><div id="frame">${Button(props)}</div></body></html>`;
          const naturalPath = join(
            root,
            'fill-browser',
            `${variant.id}-${label.id}-${theme}-natural.html`,
          );
          await writeFile(naturalPath, natural);
          const page = await browser.newPage({
            viewport: { width: 600, height: 160 },
            colorScheme: theme,
            deviceScaleFactor: 2,
          });
          try {
            await page.goto(pathToFileURL(naturalPath).href);
            await page.evaluate(() => document.fonts.ready);
            const intrinsicWidth = await page
              .locator('.kui-button')
              .evaluate((element) => element.getBoundingClientRect().width);
            const widths = {
              above: Math.ceil(intrinsicWidth + 64),
              equal: Math.ceil(intrinsicWidth),
              below: Math.max(
                variant.icon ? 60 : 34,
                Math.floor(
                  intrinsicWidth *
                    (variant.icon && label.id === 'short' ? 0.8 : 0.7),
                ),
              ),
            };
            for (const [sizeCase, width] of Object.entries(widths)) {
              const id = `${variant.id}-${label.id}-${theme}-${sizeCase}`;
              const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}\nhtml{color-scheme:${theme}}body{margin:0;background:transparent;font-family:system-ui,-apple-system,sans-serif}#frame{width:${width}px}</style></head><body><div id="frame">${Button({ ...props, fill: true })}</div></body></html>`;
              const htmlPath = join(root, 'fill-browser', `${id}.html`);
              await writeFile(htmlPath, html);
              await page.goto(pathToFileURL(htmlPath).href);
              await page.evaluate(() => document.fonts.ready);
              const measured = await page
                .locator('.kui-button')
                .evaluate((el) => {
                  const labelEl = el.querySelector('.kui-button__label');
                  const rootRect = el.getBoundingClientRect();
                  const labelRect = labelEl.getBoundingClientRect();
                  const iconRect = el
                    .querySelector('svg')
                    ?.getBoundingClientRect();
                  const style = getComputedStyle(labelEl);
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  context.font = style.font;
                  const full = labelEl.textContent;
                  const budget = Math.max(0, labelRect.width - 1);
                  let displayLabel = full;
                  if (labelEl.scrollWidth > labelEl.clientWidth) {
                    displayLabel =
                      context.measureText('…').width <= budget ? '…' : '';
                    if (displayLabel) {
                      for (const char of full) {
                        const candidate =
                          displayLabel.slice(0, -1) + char + '…';
                        if (context.measureText(candidate).width > budget)
                          break;
                        displayLabel = candidate;
                      }
                    }
                  }
                  return {
                    rootWidth: rootRect.width,
                    rootHeight: rootRect.height,
                    labelWidth: labelRect.width,
                    labelHeight: labelRect.height,
                    iconWidth: iconRect?.width ?? 0,
                    displayLabel,
                    font: style.font,
                    textOverflow: style.textOverflow,
                    whiteSpace: style.whiteSpace,
                  };
                });
              assert.equal(measured.rootWidth, width, `${id} fill width`);
              assert.equal(measured.rootHeight, 44, `${id} control height`);
              assert.equal(measured.textOverflow, 'ellipsis');
              assert.equal(measured.whiteSpace, 'nowrap');
              assert.equal(measured.iconWidth, variant.icon ? 16 : 0);
              await page.locator('.kui-button').screenshot({
                path: join(root, 'fill-browser', `${id}.png`),
                omitBackground: true,
              });
              cases.push({
                id,
                mode: 'fill',
                variantId: `${variant.id}-${theme}`,
                variantName: `Button / ${variant.name} / ${theme === 'light' ? 'Light' : 'Dark'}`,
                theme,
                icon: variant.icon,
                labelCase: label.id,
                sizeCase,
                sourceLabel: label.value,
                displayLabel: measured.displayLabel,
                intrinsicWidth,
                width,
                browser: measured,
              });
            }
          } finally {
            await page.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
  await writeFile(
    join(root, 'fill-layout.json'),
    `${JSON.stringify(
      {
        version: 1,
        source: 'Button({ fill: true })',
        sketchWorkflow: 'fixed-instance-width-with-manual-label-ellipsis',
        cases,
      },
      null,
      2,
    )}\n`,
  );
  return cases;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const cases = await captureFillCases(process.argv[2]);
  console.log(`Captured ${cases.length} real Button(fill:true) cases.`);
}
