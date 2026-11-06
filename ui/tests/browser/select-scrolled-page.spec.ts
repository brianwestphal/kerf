import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// KF-GRNDW5: a Select in a page that scrolls its document opens by the room
// the viewport has around its trigger. The popup was bounded by the
// document element's client rect, which moves up as the page scrolls, so a
// scrolled page opened it on the wrong side and capped it too short (8px at
// phone width).

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/select-scrolled-page.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  jsx: 'automatic',
  jsxImportSource: 'kerfjs',
  write: false,
});

async function mountFixture(page: Page, width: number, height: number) {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'))!;
  await page.setViewportSize({ width, height });
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

/** Scrolls the page so the trigger's top sits at `top` in the viewport. */
async function scrollTriggerTo(page: Page, top: number) {
  const trigger = page.locator('.kui-select__trigger');
  await trigger.evaluate((element, wanted) => {
    const box = element.getBoundingClientRect();
    window.scrollBy(0, box.top - wanted);
  }, top);
  return trigger;
}

async function open(page: Page) {
  const select = page.locator('[name="fruit"]');
  await select.getByRole('combobox').click();
  await expect(select).toHaveAttribute('open');
  const popup = select.locator(':scope > .kui-select__popup');
  await expect(popup).toHaveCSS('opacity', '1');
  return { select, popup };
}

for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test(`a Select in a scrolled page opens by its viewport room (${width}px)`, async ({
    page,
  }) => {
    await mountFixture(page, width, height);
    // Near the top of the viewport, far down the page: plenty of room below.
    const trigger = await scrollTriggerTo(page, 80);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    const { select, popup } = await open(page);
    const anchor = (await trigger.boundingBox())!;
    const box = (await popup.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(anchor.y + anchor.height - 1);
    expect(box.height).toBeGreaterThan(height / 2);
    await page.keyboard.press('Escape');
    await expect(select).not.toHaveAttribute('open');
    // Near the bottom of the viewport: it opens above, as tall as that room.
    await scrollTriggerTo(page, height - 120);
    await open(page);
    const above = (await popup.boundingBox())!;
    const moved = (await trigger.boundingBox())!;
    expect(above.y + above.height).toBeLessThanOrEqual(moved.y + 1);
    expect(above.height).toBeGreaterThan(height / 2);
    expect(above.y).toBeGreaterThanOrEqual(9);
  });
}
