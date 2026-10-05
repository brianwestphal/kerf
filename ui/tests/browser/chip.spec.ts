import { expect, test } from '@playwright/test';

test('Chip delegates removal, sizes its compact control, and disables unavailable removal', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=chip');
  const demo = page.locator('[data-demo="chip"]');
  const urgent = demo.locator('[data-component="chip"][data-item-id="urgent"]');
  const removeUrgent = urgent.getByRole('button', {
    name: 'Remove Urgent tag',
  });
  await expect(urgent).toHaveAttribute('data-tone', 'info');
  await expect(removeUrgent).toHaveAttribute('data-action', 'log-chip-remove');
  await removeUrgent.click();
  await expect(page.locator('.catalog-log')).toHaveText('Remove tag: urgent');

  const compact = demo.locator('[data-item-id="reviewed"]');
  const compactButton = compact.getByRole('button', {
    name: 'Remove Reviewed tag',
  });
  await expect(compact).toHaveAttribute('data-size', 'compact');
  const compactBox = await compact.boundingBox();
  const buttonBox = await compactButton.boundingBox();
  expect(compactBox?.height).toBe(20);
  expect(buttonBox?.width).toBe(16);
  await compactButton.focus();
  await expect(compactButton).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Remove tag: reviewed');

  const locked = demo.locator('[data-item-id="locked"]');
  await expect(locked).toHaveAttribute('data-disabled', '');
  await expect(
    locked.getByRole('button', { name: 'Remove Locked tag' }),
  ).toBeDisabled();
  await expect(demo.locator('[data-component="chip"]')).toHaveCount(5);
  await expect(
    demo.locator('[data-component="chip"]').last().locator('button'),
  ).toHaveCount(0);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/chip-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(removeUrgent).toBeVisible();
  await expect(compactButton).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/chip-narrow.png' });
});

test('Chip aligns a decorative icon and truncates only its label beside a full price', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=chip');
  const row = page.locator('[data-demo-chip-offer]');
  const chip = row.locator('[data-component="chip"]');
  const label = chip.locator('.kui-chip__label');
  const price = row.locator('.kui-text');
  const icon = chip.locator('.kui-chip__icon');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon.locator('[data-lucide="trophy"]')).toHaveCount(1);
  await expect(label).toHaveAttribute(
    'title',
    'Acme International Procurement and Manufacturing Limited',
  );
  await expect(price).toHaveCSS('white-space', 'nowrap');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const geometry = await row.evaluate((element) => {
      const chip = element.querySelector<HTMLElement>('.kui-chip')!;
      const label = chip.querySelector<HTMLElement>('.kui-chip__label')!;
      const icon = chip.querySelector<HTMLElement>('.kui-chip__icon')!;
      const price = element.querySelector<HTMLElement>('.kui-text')!;
      return {
        chipEnd: chip.getBoundingClientRect().right,
        priceStart: price.getBoundingClientRect().left,
        priceEnd: price.getBoundingClientRect().right,
        rowEnd: element.getBoundingClientRect().right,
        labelClipped: label.scrollWidth > label.clientWidth,
        iconWidth: icon.getBoundingClientRect().width,
        chipFontSize: Number.parseFloat(
          globalThis.getComputedStyle(chip).fontSize,
        ),
      };
    });
    expect(geometry.chipEnd).toBeLessThanOrEqual(geometry.priceStart);
    expect(geometry.priceEnd).toBeLessThanOrEqual(geometry.rowEnd + 1);
    expect(geometry.iconWidth).toBeCloseTo(geometry.chipFontSize, 1);
    if (width === 390) expect(geometry.labelClipped).toBe(true);
    await row.screenshot({
      path: testInfo.outputPath(`chip-offer-${width}.png`),
    });
  }
  const compact = page.locator('[data-item-id="reviewed"]');
  const compactIcon = compact.locator('.kui-chip__icon');
  const compactFont = await compact.evaluate((element) =>
    Number.parseFloat(globalThis.getComputedStyle(element).fontSize),
  );
  const compactWidth = await compactIcon.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  expect(compactWidth).toBeCloseTo(compactFont, 1);
});
