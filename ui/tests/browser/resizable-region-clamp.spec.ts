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

// KF-DTZY4N: the resize itself is clamped to the space the parent leaves, so
// the separator reports the size that is shown. Keyboard resizing moves the
// visible separator on the first key press instead of sticking beyond the
// clamped track, and aria-valuemax announces the visible maximum.
test('the catalog region demo resizes only to the 390px stage and reports the shown size', async ({
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

  const stage = region.locator('xpath=..');
  const stageWidth = await stage.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  const shown = await widths(region);
  // The separator reports exactly the visible width, never the declared 420.
  expect(shown.region).toBeLessThan(420);
  expect(shown.region).toBeLessThanOrEqual(stageWidth + 0.5);
  const visible = String(Math.floor(shown.region));
  await expect(handle).toHaveAttribute('aria-valuenow', visible);
  await expect(handle).toHaveAttribute('aria-valuemax', visible);
  await expect(page.locator('[data-region-size]')).toHaveText(`${visible}px`);
  expect(shown.content).toBeCloseTo(shown.region, 0);
  const textRight = await region.evaluate((element) => {
    const text = [...element.querySelectorAll('*')].filter(
      (node) => node.children.length === 0 && node.textContent?.trim(),
    );
    return Math.max(...text.map((node) => node.getBoundingClientRect().right));
  });
  expect(textRight).toBeLessThanOrEqual(shown.regionRight + 0.5);
  if (browserName === 'chromium')
    await page.locator('[data-demo="resize"]').screenshot({
      path: 'test-results/resizable-region-clamp-390.png',
    });

  // The first key press away from the maximum moves the visible separator.
  await page.keyboard.press('ArrowLeft');
  const stepped = Number(visible) - 16;
  await expect(handle).toHaveAttribute('aria-valuenow', String(stepped));
  expect((await widths(region)).region).toBeCloseTo(stepped, 0);
  // Growing again stops at the visible maximum.
  await page.keyboard.press('Shift+ArrowRight');
  await expect(handle).toHaveAttribute('aria-valuenow', visible);

  // A pointer drag past the stage clamps the same way.
  const box = (await handle.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 80, y, { steps: 4 });
  await page.mouse.move(x + 200, y, { steps: 4 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-valuenow', visible);
  await expect(page.locator('[data-region-size]')).toHaveText(`${visible}px`);

  // Shrinking with the keyboard below the stage width moves the separator and
  // content together again.
  await handle.focus();
  await page.keyboard.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '180');
  const shrunk = await widths(region);
  expect(shrunk.region).toBeCloseTo(180, 0);
  expect(shrunk.content).toBeCloseTo(shrunk.region, 0);
});

test('a size committed on a wide stage reports the clamped size when focused on a narrow one', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=resize');
  const region = page.locator(
    '[data-demo="resize"] [data-component="resizable-region"]',
  );
  const handle = region.locator('[data-kui-resize-handle]');
  await handle.focus();
  await page.keyboard.press('End');
  // With room to spare the declared maximum is reachable and announced.
  await expect(handle).toHaveAttribute('aria-valuenow', '420');
  await expect(handle).toHaveAttribute('aria-valuemax', '420');
  expect((await widths(region)).region).toBeCloseTo(420, 0);

  await handle.blur();
  await page.setViewportSize({ width: 390, height: 844 });
  await handle.focus();
  const shown = await widths(region);
  const visible = String(Math.floor(shown.region));
  expect(shown.region).toBeLessThan(420);
  await expect(handle).toHaveAttribute('aria-valuenow', visible);
  await expect(handle).toHaveAttribute('aria-valuemax', visible);
  // Focus reports without committing; the app keeps its size until a resize.
  await expect(page.locator('[data-region-size]')).toHaveText('420px');
  await page.keyboard.press('ArrowLeft');
  await expect(handle).toHaveAttribute(
    'aria-valuenow',
    String(Number(visible) - 16),
  );
});

// KF-XZJ0Y8: the reported values stay in sync at rest. Narrowing the viewport
// re-clamps them, and an unrelated re-render that writes the rendered props
// back is re-clamped too, without the handle ever being focused.
test('the reported size stays clamped at rest through a resize and an unrelated re-render', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=resize');
  const region = page.locator(
    '[data-demo="resize"] [data-component="resizable-region"]',
  );
  const handle = region.locator('[data-kui-resize-handle]');
  await handle.focus();
  await page.keyboard.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '420');
  await handle.blur();

  await page.setViewportSize({ width: 390, height: 844 });
  const visible = async () => String(Math.floor((await widths(region)).region));
  await expect.poll(visible).not.toBe('420');
  const shown = await visible();
  await expect(handle).toHaveAttribute('aria-valuenow', shown);
  await expect(handle).toHaveAttribute('aria-valuemax', shown);

  // An unrelated re-render: the contrast setting re-renders the whole catalog.
  const contrast = page.locator('[data-action="toggle-contrast"]');
  await contrast.click();
  await expect(contrast).toHaveAttribute('aria-pressed', 'true');
  await expect(handle).not.toBeFocused();
  await expect(handle).toHaveAttribute('aria-valuenow', shown);
  await expect(handle).toHaveAttribute('aria-valuemax', shown);
  // The app keeps its committed size; only the report is clamped.
  await expect(page.locator('[data-region-size]')).toHaveText('420px');

  // Growing the viewport again reports the committed size once it fits.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(handle).toHaveAttribute('aria-valuenow', '420');
  await expect(handle).toHaveAttribute('aria-valuemax', '420');
});
