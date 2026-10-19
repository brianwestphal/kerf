import { expect, test } from '@playwright/test';

test('controlled dialog layers push, reorder, pop, and reopen at both viewports', async ({
  page,
}, testInfo) => {
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/?component=surface-scaffold');
    const atlas = page.locator('#catalog-reader-atlas');
    const borealis = page.locator('#catalog-reader-borealis');
    await page.getByRole('button', { name: 'Open Reader' }).click();
    await expect(atlas).toHaveAttribute('open', '');
    await expect(atlas).toHaveAttribute('aria-modal', 'true');
    await expect(atlas).toBeFocused();
    await expect(borealis).not.toHaveAttribute('open', '');
    await atlas.evaluate(() => {
      const push = document.querySelector<HTMLElement>(
        '[data-action="push-dialog-stack"]',
      );
      push?.click();
    });
    await expect(borealis).toHaveAttribute('open', '');
    await expect(borealis).toHaveAttribute('aria-modal', 'true');
    await expect(borealis).toBeFocused();
    await expect(borealis).not.toHaveAttribute('data-kui-dialog-motion');
    const box = (await borealis.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(width === 390 ? 15 : 23);
    expect(box.x + box.width).toBeLessThanOrEqual(
      width - (width === 390 ? 15 : 23),
    );
    expect(box.height).toBeGreaterThan(750);
    expect(
      await page.evaluate(
        () =>
          document
            .elementFromPoint(window.innerWidth / 2, 150)
            ?.closest('dialog')?.id,
      ),
    ).toBe('catalog-reader-borealis');
    await expect(atlas).toHaveAttribute('aria-hidden', 'true');
    await expect(atlas).toHaveAttribute('inert', '');
    await expect(borealis.locator('[data-kerf-overlay-host]')).toHaveCount(1);
    const menu = borealis.locator('.kui-popup-menu');
    await menu.getByRole('button', { name: 'Reader Actions' }).click();
    await expect(menu.locator('.kui-popup-menu__item').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(borealis).toHaveAttribute('open', '');
    await page.screenshot({
      path: testInfo.outputPath(`dialog-stack-${width}.png`),
    });
    await borealis.evaluate(() => {
      document
        .querySelector<HTMLElement>('[data-action="reorder-dialog-stack"]')
        ?.click();
    });
    await expect(atlas).toHaveAttribute('data-stack-active', 'true');
    await expect(atlas).toBeFocused();
    expect(
      await page.evaluate(
        () =>
          document
            .elementFromPoint(window.innerWidth / 2, 150)
            ?.closest('dialog')?.id,
      ),
    ).toBe('catalog-reader-atlas');
    await page.keyboard.press('Escape');
    await expect(atlas).not.toHaveAttribute('open', '');
    await expect(borealis).toHaveAttribute('aria-modal', 'true');
    await expect(borealis).toBeFocused();
    await borealis.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(borealis).not.toHaveAttribute('open', '');
    await page.getByRole('button', { name: 'Open Reader' }).click();
    await expect(atlas).toHaveAttribute('open', '');
  }
});
