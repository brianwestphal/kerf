import { expect, test } from '@playwright/test';

import { minPaintedTextContrast } from './painted-contrast.js';

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
  await expect(demo.locator('[data-component="chip"]')).toHaveCount(9);
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

test('link chips download files, show focus and hover, truncate, and read on transcript bubbles', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=chip');
  const transcript = page.locator('[data-demo-chip-transcript]');
  const userFile = transcript
    .locator('[data-demo-chip-files="user"]')
    .getByRole('link', { name: 'failing-checks.log' });
  const longName = 'design-template-drift-report-2026-10-13.md';
  const assistantLong = transcript
    .locator('[data-demo-chip-files="assistant"]')
    .getByRole('link', { name: longName });

  await expect(transcript.locator('a.kui-chip')).toHaveCount(3);
  await expect(transcript.locator('.kui-chip button')).toHaveCount(0);
  await expect(userFile).toHaveAttribute('download', 'failing-checks.log');
  await expect(userFile).toHaveAttribute('data-tone', 'inherit');
  await expect(userFile).toHaveCSS('text-decoration-line', 'none');
  await expect(userFile).toHaveCSS('min-height', '28px');

  // The inherit tone follows each bubble's foreground.
  for (const chip of await transcript.locator('a.kui-chip').all()) {
    const [chipColor, bubbleColor] = await chip.evaluate((element) => [
      globalThis.getComputedStyle(element).color,
      globalThis.getComputedStyle(element.closest('.kui-content-item')!).color,
    ]);
    expect(chipColor).toBe(bubbleColor);
  }

  // A real download starts from the native link.
  const download = page.waitForEvent('download');
  await userFile.click();
  expect((await download).suggestedFilename()).toBe('failing-checks.log');

  // An inherit chip's hover strengthens its border and underlines its label
  // without painting a fill over the bubble.
  await page.mouse.move(0, 0);
  const label = userFile.locator('.kui-chip__label');
  const restBorder = await userFile.evaluate(
    (element) => globalThis.getComputedStyle(element).borderTopColor,
  );
  await expect(label).toHaveCSS('text-decoration-line', 'none');
  await userFile.hover();
  await expect(label).toHaveCSS('text-decoration-line', 'underline');
  const hovered = await userFile.evaluate((element) => {
    const style = globalThis.getComputedStyle(element);
    return {
      border: style.borderTopColor,
      color: style.color,
      background: style.backgroundColor,
    };
  });
  expect(hovered.border).not.toBe(restBorder);
  expect(hovered.border).toBe(hovered.color);
  expect(hovered.background).toBe('rgba(0, 0, 0, 0)');
  await expect(userFile).toHaveCSS('cursor', 'pointer');
  await userFile.screenshot({
    path: testInfo.outputPath('chip-link-hover.png'),
  });
  await page.mouse.move(0, 0);

  // Keyboard focus draws a currentColor ring on an inherit link chip. WebKit
  // does not focus links at all by default (Safari's "Press Tab to highlight
  // each item" setting is off), even through focus(), so the ring is checked
  // in the engines that focus them; the outline CSS is engine-neutral.
  const focusesLinks = testInfo.project.name !== 'webkit';
  if (focusesLinks) {
    await userFile.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(userFile).toBeFocused();
    const ring = await userFile.evaluate((element) => {
      const style = globalThis.getComputedStyle(element);
      return {
        matches: element.matches(':focus-visible'),
        style: style.outlineStyle,
        width: style.outlineWidth,
        color: style.outlineColor,
        text: style.color,
      };
    });
    expect(ring).toMatchObject({ matches: true, style: 'solid', width: '3px' });
    expect(ring.color).toBe(ring.text);
    await transcript.screenshot({
      path: testInfo.outputPath('chip-link-focus.png'),
    });
  }

  // Text stays readable over the chip fill on both bubbles and themes.
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const labels = transcript.locator('a.kui-chip .kui-chip__label');
    expect(await minPaintedTextContrast(labels)).toBeGreaterThanOrEqual(4.5);
  }
  await page.emulateMedia({ colorScheme: 'light' });

  // A semantic-tone external link chip announces the new tab, uses the
  // standard focus ring, and washes its fill on hover.
  const external = page.getByRole('link', {
    name: 'Kerf Source (opens in new tab)',
  });
  await expect(external).toHaveAttribute('target', '_blank');
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(external).not.toHaveAttribute('download');
  const externalRest = await external.evaluate(
    (element) => globalThis.getComputedStyle(element).backgroundImage,
  );
  await external.hover();
  await expect
    .poll(() =>
      external.evaluate(
        (element) => globalThis.getComputedStyle(element).backgroundImage,
      ),
    )
    .not.toBe(externalRest);
  await page.mouse.move(0, 0);
  if (focusesLinks) {
    await external.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(external).toBeFocused();
    await expect(external).toHaveCSS('outline-width', '3px');
    await expect(external).toHaveCSS('outline-offset', '2px');
  }

  // A long file name truncates inside its bubble at phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(assistantLong).toBeVisible();
  const geometry = await assistantLong.evaluate((element) => {
    const label = element.querySelector<HTMLElement>('.kui-chip__label')!;
    const bubble = element.closest('.kui-content-item')!;
    return {
      clipped: label.scrollWidth > label.clientWidth,
      chipEnd: element.getBoundingClientRect().right,
      bubbleEnd: bubble.getBoundingClientRect().right,
      title: label.title,
    };
  });
  expect(geometry.clipped).toBe(true);
  expect(geometry.title).toBe(longName);
  expect(geometry.chipEnd).toBeLessThanOrEqual(geometry.bubbleEnd);
  await transcript.screenshot({
    path: testInfo.outputPath('chip-link-narrow.png'),
  });
});
