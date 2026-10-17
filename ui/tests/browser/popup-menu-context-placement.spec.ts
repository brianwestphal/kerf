import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// A context PopupMenu honors its `placement` at its anchor point: top-start
// sits above the point at its start, top-end above it at its end, and the
// viewport flip still applies. Before, every context menu opened bottom-start
// whatever placement it was rendered with.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/context-menu-placement.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

type Fixture = {
  contextPlacementFixture: {
    open(placement: string): void;
    openAt(placement: string, x: number, y: number, at?: string): void;
  };
};

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css)
    throw new Error('Context placement fixture emitted no JS/CSS');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.setContent(
    '<!doctype html><html><body style="margin:0"></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
}

const menuOf = (page: Page, placement: string) =>
  page.locator(
    `[data-context-placement="${placement}"] > .kui-popup-menu__menu`,
  );

async function placed(page: Page, placement: string) {
  const menu = menuOf(page, placement);
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('opacity', '1');
  return menu.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      placement: element.getAttribute('data-placement'),
    };
  });
}

test('a context PopupMenu opens at its placement against its anchor point', async ({
  page,
}) => {
  await mountFixture(page);
  // Rendered anchor at (400, 400): each placement's corner meets the point.
  for (const placement of [
    'bottom-start',
    'bottom-end',
    'top-start',
    'top-end',
  ]) {
    await page.evaluate(
      (value) =>
        (globalThis as unknown as Fixture).contextPlacementFixture.open(value),
      placement,
    );
    const box = await placed(page, placement);
    expect(box.placement).toBe(placement);
    const [side, align] = placement.split('-');
    if (side === 'top') expect(Math.abs(box.bottom - 400)).toBeLessThan(2);
    else expect(Math.abs(box.top - 400)).toBeLessThan(2);
    if (align === 'start') expect(Math.abs(box.left - 400)).toBeLessThan(2);
    else expect(Math.abs(box.right - 400)).toBeLessThan(2);
    await page.keyboard.press('Escape');
    await expect(menuOf(page, placement)).toBeHidden();
  }

  // A new pointer point keeps the placement: top-start sits above it.
  await page.evaluate(() =>
    (globalThis as unknown as Fixture).contextPlacementFixture.openAt(
      'top-start',
      600,
      700,
    ),
  );
  let box = await placed(page, 'top-start');
  expect(box.placement).toBe('top-start');
  expect(Math.abs(box.bottom - 700)).toBeLessThan(2);
  expect(Math.abs(box.left - 600)).toBeLessThan(2);
  await page.screenshot({
    path: test.info().outputPath('context-placement-top-start.png'),
  });
  await page.keyboard.press('Escape');

  // With no room above the point, the viewport flip still opens it below.
  await page.evaluate(() =>
    (globalThis as unknown as Fixture).contextPlacementFixture.openAt(
      'top-start',
      600,
      20,
    ),
  );
  box = await placed(page, 'top-start');
  expect(box.placement).toBe('bottom-start');
  expect(Math.abs(box.top - 20)).toBeLessThan(2);
  await page.screenshot({
    path: test.info().outputPath('context-placement-flipped.png'),
  });
  await page.keyboard.press('Escape');
});

// A button-triggered PopupMenu opened at a pointer point sits bottom-start
// there by default, and at an explicit `openPopupMenuAt` placement (top-start
// above the point) for that opening when one is given.
test('a button-triggered PopupMenu opens at an explicit placement at a point', async ({
  page,
}) => {
  await mountFixture(page);
  const openAt = (x: number, y: number, at?: string) =>
    page.evaluate(
      ([px, py, value]) =>
        (globalThis as unknown as Fixture).contextPlacementFixture.openAt(
          'button',
          px as number,
          py as number,
          value as string | undefined,
        ),
      [x, y, at] as const,
    );

  await openAt(500, 300);
  let box = await placed(page, 'button');
  expect(box.placement).toBe('bottom-start');
  expect(Math.abs(box.top - 300)).toBeLessThan(2);
  expect(Math.abs(box.left - 500)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(menuOf(page, 'button')).toBeHidden();

  await openAt(500, 600, 'top-start');
  box = await placed(page, 'button');
  expect(box.placement).toBe('top-start');
  expect(Math.abs(box.bottom - 600)).toBeLessThan(2);
  expect(Math.abs(box.left - 500)).toBeLessThan(2);
  await page.screenshot({
    path: test.info().outputPath('button-point-top-start.png'),
  });
  await page.keyboard.press('Escape');
  await expect(menuOf(page, 'button')).toBeHidden();

  // The next point opening without a placement is bottom-start again.
  await openAt(500, 300);
  box = await placed(page, 'button');
  expect(box.placement).toBe('bottom-start');
  expect(Math.abs(box.top - 300)).toBeLessThan(2);
  await page.keyboard.press('Escape');
});
