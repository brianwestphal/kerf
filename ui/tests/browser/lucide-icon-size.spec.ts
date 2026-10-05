import { expect, test } from '@playwright/test';

test('LucideIcon named and numeric sizes follow the root font scale', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=lucide-icon');
  const row = page.locator('[data-demo-icon-sizes]');
  const steps = [
    ['xs', 12],
    ['s', 16],
    ['m', 20],
    ['l', 24],
    ['xl', 32],
    ['30', 30],
  ] as const;
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    for (const rootSize of [16, 20]) {
      await page.evaluate((size) => {
        globalThis.document.documentElement.style.fontSize = `${size}px`;
      }, rootSize);
      for (const [step, pixels] of steps) {
        const icon = row.locator(`[data-size="${step}"]`);
        await expect(icon).toHaveCSS('width', `${(pixels / 16) * rootSize}px`);
        await expect(icon).toHaveCSS('height', `${(pixels / 16) * rootSize}px`);
        await expect(icon).toHaveAttribute('aria-hidden', 'true');
      }
    }
    await page.evaluate(() => {
      globalThis.document.documentElement.style.removeProperty('font-size');
    });
    await row.screenshot({
      path: testInfo.outputPath(`lucide-icon-sizes-${width}.png`),
    });
  }
});

test('LucideIcon solid appearance fills the glyph with currentColor', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=lucide-icon');
  const row = page.locator('[data-demo-icon-appearance]');
  const outline = row.locator('[data-lucide="star-outline"]');
  const solid = row.locator('[data-lucide="star-solid"]');
  await expect(outline).toHaveAttribute('fill', 'none');
  await expect(solid).toHaveAttribute('fill', 'currentColor');
  await row.evaluate((element) => {
    (element as HTMLElement).style.color = 'rgb(24, 96, 160)';
  });
  await expect(solid).toHaveCSS('fill', 'rgb(24, 96, 160)');
  await expect(solid.locator('path')).toHaveCSS('fill', 'rgb(24, 96, 160)');
  await expect(outline.locator('path')).toHaveCSS('fill', 'none');
  await row.screenshot({
    path: testInfo.outputPath('lucide-icon-appearance.png'),
  });
});

test('LucideIcon color supports inherited, semantic, and custom foregrounds', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=lucide-icon');
  const row = page.locator('[data-demo-icon-colors]');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const inherited = row.locator('[data-lucide="bell-inherited"]');
    const token = row.locator('[data-lucide="bell-warning"]');
    const custom = row.locator('[data-lucide="star-custom"]');
    await expect(inherited).not.toHaveAttribute('style', /color:/);
    await expect(token).toHaveAttribute(
      'style',
      /color:var\(--kui-color-warning-on-quiet\)/,
    );
    const tokenColor = await token.evaluate(
      (element) => globalThis.getComputedStyle(element).color,
    );
    expect(tokenColor).not.toBe(
      await inherited.evaluate(
        (element) => globalThis.getComputedStyle(element).color,
      ),
    );
    await expect(custom).toHaveCSS('color', 'rgb(102, 51, 153)');
    await expect(custom).toHaveCSS('fill', 'rgb(102, 51, 153)');
    await row.screenshot({
      path: testInfo.outputPath(`lucide-icon-colors-${width}.png`),
    });
    await page.screenshot({
      path: testInfo.outputPath(`lucide-icon-colors-context-${width}.png`),
    });
  }
});

test('LucideIcon inline flows inside Text at wide and narrow widths', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=lucide-icon');
  const text = page.locator('[data-demo-icon-inline]');
  const icon = text.locator('[data-lucide="bell-inline"]');
  await expect(page.locator('[data-lucide="bell"]')).toHaveCSS(
    'display',
    'block',
  );
  await expect(text).toHaveText(/Notifications.*are ready\./);
  await expect(icon).toHaveCSS('display', 'inline-block');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const sharesLine = await icon.evaluate((element) => {
      const leadingText = element.previousSibling;
      if (!leadingText) return false;
      const range = document.createRange();
      range.selectNodeContents(leadingText);
      const textRect = range.getBoundingClientRect();
      const iconRect = element.getBoundingClientRect();
      return Math.abs(textRect.top - iconRect.top) < 10;
    });
    expect(sharesLine).toBe(true);
    await text.screenshot({
      path: testInfo.outputPath(`lucide-icon-inline-${width}.png`),
    });
    await page.screenshot({
      path: testInfo.outputPath(`lucide-icon-inline-context-${width}.png`),
      fullPage: true,
    });
  }
});
