import { resolve } from 'node:path';

import { expect, type Locator, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-2Q2VFB: an expanded slide-motion ResizableRegion's content follows the
// region's actual track. A parent that clamps the region (the catalog stage's
// max-width at 390px) used to leave the content at the full resized size, so
// its text ran past the separator. The fixed expanded size still applies once
// the track collapses, so the collapse keeps reading as a slide.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/resizable-region-fill.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Clamp fixture emitted no JS/CSS');
  await page.setContent(
    '<!doctype html><html><body style="margin:0"><div data-fill-host></div></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
}

const widths = (region: Locator) =>
  region.evaluate((element) => {
    const content = element.querySelector<HTMLElement>(
      ':scope > .kui-resizable-region__content',
    )!;
    const regionBox = element.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    return {
      region: regionBox.width,
      regionRight: regionBox.right,
      content: contentBox.width,
      contentRight: contentBox.right,
    };
  });

test('a clamped horizontal region keeps its content inside the separator', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await mountFixture(page);
  const region = page.locator(
    '[data-component="resizable-region"][data-region-id="fill-horizontal"]',
  );
  await expect(region).toHaveAttribute('data-collapse-motion', 'slide');
  // The committed size is 200px; a parent constraint clamps the track to 150.
  await region.evaluate((element) => {
    element.style.maxWidth = '150px';
  });
  const clamped = await widths(region);
  expect(clamped.region).toBeCloseTo(150, 0);
  expect(clamped.content).toBeCloseTo(clamped.region, 0);
  expect(clamped.contentRight).toBeCloseTo(clamped.regionRight, 0);

  // Collapsing snaps the track to zero; the content keeps the fixed expanded
  // width and slides out on its transform.
  const collapsed = await region.evaluate((element) => {
    element.dataset.collapsed = 'true';
    element.style.setProperty('--kui-resizable-region-size', '0px');
    const content = element.querySelector<HTMLElement>(
      ':scope > .kui-resizable-region__content',
    )!;
    const style = globalThis.getComputedStyle(content);
    return {
      region: element.getBoundingClientRect().width,
      content: Number.parseFloat(style.width),
      transform: style.transform,
    };
  });
  expect(collapsed.region).toBe(0);
  expect(collapsed.content).toBeCloseTo(200, 0);
  expect(collapsed.transform).not.toBe('none');

  // Expanding again returns the content to the clamped track.
  await region.evaluate((element) => {
    element.dataset.collapsed = 'false';
    element.style.setProperty('--kui-resizable-region-size', '200px');
  });
  const reopened = await widths(region);
  expect(reopened.content).toBeCloseTo(reopened.region, 0);
});

test('a clamped vertical region keeps its content inside the separator', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await mountFixture(page);
  const region = page.locator(
    '[data-component="resizable-region"][data-region-id="fill-vertical"]',
  );
  await region.evaluate((element) => {
    element.style.maxHeight = '100px';
  });
  const heights = await region.evaluate((element) => {
    const content = element.querySelector<HTMLElement>(
      ':scope > .kui-resizable-region__content',
    )!;
    return {
      region: element.getBoundingClientRect().height,
      content: content.getBoundingClientRect().height,
    };
  });
  expect(heights.region).toBeCloseTo(100, 0);
  expect(heights.content).toBeCloseTo(heights.region, 0);
});

test('the catalog region demo resized past the 390px stage keeps its text inside the handle', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=resize');
  const region = page.locator(
    '[data-demo="resize"] [data-component="resizable-region"]',
  );
  const handle = region.locator('[data-kui-resize-handle]');
  await handle.focus();
  await page.keyboard.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '420');

  const stage = region.locator('xpath=..');
  const geometry = await region.evaluate((element) => {
    const content = element.querySelector<HTMLElement>(
      ':scope > .kui-resizable-region__content',
    )!;
    const text = [...content.querySelectorAll('*')].filter(
      (node) => node.children.length === 0 && node.textContent?.trim(),
    );
    return {
      region: element.getBoundingClientRect().right,
      content: content.getBoundingClientRect().right,
      text: Math.max(...text.map((node) => node.getBoundingClientRect().right)),
    };
  });
  const stageRight = await stage.evaluate(
    (element) => element.getBoundingClientRect().right,
  );
  expect(geometry.region).toBeLessThanOrEqual(stageRight + 0.5);
  expect(geometry.content).toBeCloseTo(geometry.region, 0);
  expect(geometry.text).toBeLessThanOrEqual(geometry.region + 0.5);
  if (browserName === 'chromium')
    await page.locator('[data-demo="resize"]').screenshot({
      path: 'test-results/resizable-region-clamp-390.png',
    });

  // Shrinking with the keyboard below the stage width moves the separator and
  // content together again.
  await page.keyboard.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '180');
  const shrunk = await widths(region);
  expect(shrunk.region).toBeCloseTo(180, 0);
  expect(shrunk.content).toBeCloseTo(shrunk.region, 0);
});
