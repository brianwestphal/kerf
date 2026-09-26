import { resolve } from 'node:path';

import { expect, type Locator, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-1575B8: ResizableRegion content spans the whole region, like its
// separator. A lone child (a Pane or a layout) fills the region so it owns its
// scrolling; several children keep their natural height.

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
  if (!javascript || !css) throw new Error('Fill fixture emitted no JS/CSS');
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
  await expect(page.locator('[data-case="h-pane"]')).toBeVisible();
}

const rect = (locator: Locator) =>
  locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, height: box.height };
  });

const region = (page: Page, id: string) =>
  page.locator(`[data-component="resizable-region"][data-region-id="${id}"]`);

async function expectPaneFillsAndScrolls(pane: Locator, owner: Locator) {
  const regionBox = await rect(owner);
  const paneBox = await rect(pane);
  expect(paneBox.top).toBeCloseTo(regionBox.top, 0);
  expect(paneBox.bottom).toBeCloseTo(regionBox.bottom, 0);
  const scroll = await pane.evaluate((element) => {
    const content = element.querySelector<HTMLElement>(
      ':scope > .kui-pane__content',
    )!;
    content.scrollTop = content.scrollHeight;
    return {
      scrollable: content.scrollHeight > content.clientHeight,
      scrolled: content.scrollTop > 0,
      bottom: content.getBoundingClientRect().bottom,
    };
  });
  expect(scroll.scrollable).toBe(true);
  expect(scroll.scrolled).toBe(true);
  expect(scroll.bottom).toBeCloseTo(regionBox.bottom, 0);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await mountFixture(page);
});

test('a lone Pane fills a horizontal region and scrolls long content', async ({
  page,
}) => {
  const owner = region(page, 'fill-horizontal');
  expect((await rect(owner)).height).toBeCloseTo(250, 0);
  await expectPaneFillsAndScrolls(page.locator('[data-case="h-pane"]'), owner);
});

test('a lone Pane fills a vertical region and scrolls long content', async ({
  page,
}) => {
  const owner = region(page, 'fill-vertical');
  expect((await rect(owner)).height).toBeCloseTo(150, 0);
  await expectPaneFillsAndScrolls(page.locator('[data-case="v-pane"]'), owner);
});

test('several region children keep their natural height', async ({ page }) => {
  const owner = await rect(region(page, 'fill-stack'));
  const first = await rect(page.locator('[data-case="stack-a"]'));
  const second = await rect(page.locator('[data-case="stack-b"]'));
  expect(first.height).toBeLessThan(owner.height / 2);
  expect(second.height).toBeCloseTo(first.height, 0);
  expect(second.top).toBeGreaterThanOrEqual(first.bottom);
});

test('a lone Pane keeps filling after a collapse round trip at a new size', async ({
  page,
}) => {
  const owner = region(page, 'fill-horizontal');
  const pane = page.locator('[data-case="h-pane"]');
  await owner.evaluate((element) => {
    element.setAttribute('data-collapsed', 'true');
    element.style.setProperty('--kui-resizable-region-size', '0px');
  });
  await owner.evaluate((element) => {
    element.setAttribute('data-collapsed', 'false');
    element.style.setProperty('--kui-resizable-region-size', '260px');
  });
  await expectPaneFillsAndScrolls(pane, owner);
});
