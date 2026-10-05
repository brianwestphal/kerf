import { expect, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';
import { minPaintedTextContrast } from './painted-contrast.js';

test('contrast measurement composites nested fills and transparent text across backdrop changes', async ({
  page,
}) => {
  await page.setContent(`
    <html style="background:white"><body style="background:transparent">
      <div id="outer" style="background:rgb(0 0 0 / .5)">
        <span id="nested" style="color:white;background:rgb(0 0 0 / .5)">Nested</span>
      </div>
      <span id="track" style="color:black;background:rgba(0,0,0,.1)">Track</span>
      <span id="text" style="color:rgb(0 0 0 / .5)">Text</span>
      <span id="modern" style="color:black;background:color(srgb 0 0 0 / .1)">Modern</span>
      <span id="low" style="color:#222;background:#333">Low contrast</span>
    </body></html>
  `);
  expect(await minPaintedTextContrast(page.locator('#nested'))).toBeCloseTo(
    contrastRatio([255, 255, 255], [63, 63, 63])!,
    1,
  );
  expect(await minPaintedTextContrast(page.locator('#track'))).toBeGreaterThan(
    16,
  );
  expect(await minPaintedTextContrast(page.locator('#modern'))).toBeCloseTo(
    await minPaintedTextContrast(page.locator('#track')),
    1,
  );
  expect(await minPaintedTextContrast(page.locator('#text'))).toBeCloseTo(
    contrastRatio([127, 127, 127], [255, 255, 255])!,
    1,
  );
  expect(await minPaintedTextContrast(page.locator('#low'))).toBeLessThan(1.5);
  expect(
    await minPaintedTextContrast(page.locator('#low, #track')),
  ).toBeLessThan(1.5);

  await page.locator('html').evaluate((element) => {
    (element as HTMLElement).style.backgroundColor = 'black';
  });
  // The same track now has genuinely insufficient contrast. No white-backdrop
  // shortcut may make it pass after the theme changes.
  expect(await minPaintedTextContrast(page.locator('#track'))).toBe(1);
  expect(await minPaintedTextContrast(page.locator('#nested'))).toBe(21);
  await expect(
    minPaintedTextContrast(page.locator('#missing')),
  ).rejects.toThrow('No elements to measure');
});

test('contrast measurement includes a shadow host backdrop', async ({
  page,
}) => {
  await page.setContent(
    '<html style="background:white"><body><div id="host" style="background:black"></div></body></html>',
  );
  await page.locator('#host').evaluate((element) => {
    element.attachShadow({ mode: 'open' }).innerHTML =
      '<span style="color:white">Shadow text</span>';
  });
  expect(await minPaintedTextContrast(page.locator('#host span'))).toBe(21);
});
