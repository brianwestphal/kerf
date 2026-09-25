import { expect, test } from '@playwright/test';

test('applies property-specific CSS values in a real browser', async ({
  browserName,
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.goto('/?component=list');

  const content = page.locator(
    '[data-demo="list"] .kui-pane__content > .kui-list',
  );
  await expect(content).toHaveCSS('gap', '24px');
  await expect(content).toHaveAttribute(
    'style',
    '--_kui-list-gap:var(--kui-space-l);--_kui-list-flex:1 1 auto',
  );
  await expect(content).toHaveCSS('flex', '1 1 auto');
  // The standalone list card has no neighboring region, so the scrolling
  // content List draws no side divider (a lone right divider read as a stray
  // vertical line just inside the card border).
  await expect(content).not.toHaveAttribute('divider-sides');
  const visibleDividerShadows = await content.evaluate((element) => {
    const shadow = window.getComputedStyle(element).boxShadow;
    if (shadow === 'none') return [];
    return shadow
      .split(/,(?![^(]*\))/)
      .map((part) => part.trim())
      .filter((part) => !/^rgba\([^)]*,\s*0\)/.test(part));
  });
  expect(visibleDividerShadows).toEqual([]);

  const tools = content.locator('section').nth(1).locator(':scope > .kui-list');
  await expect(tools).toHaveCSS('gap', '8px');
  await expect(tools).toHaveAttribute(
    'style',
    '--_kui-list-gap:var(--kui-space-xs)',
  );

  await page.goto('/?component=skeleton');
  const shapedSkeleton = page
    .locator('[data-demo="skeleton"] .kui-list > .kui-skeleton')
    .nth(1);
  await expect(shapedSkeleton).toHaveCSS('width', '128px');
  await expect(shapedSkeleton).toHaveCSS('height', '24px');
  await expect(shapedSkeleton).toHaveCSS('border-radius', '12px');

  await page.goto('/?component=select');
  const semanticIcon = page
    .locator('[data-demo="select"] .kui-select__icon')
    .filter({ has: page.locator('[data-lucide="bell"]') })
    .first();
  await expect(semanticIcon).toHaveAttribute(
    'style',
    'color:var(--kui-color-success)',
  );
  await expect(semanticIcon).toHaveCSS('color', /^(?:rgba?|color)\(/);

  if (browserName === 'chromium') {
    await page.goto('/?component=list');
    await page.screenshot({
      path: 'test-results/css-values-list-wide.png',
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(content).toHaveCSS('gap', '24px');
    await expect(tools).toHaveCSS('gap', '8px');
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: 'test-results/css-values-list-narrow.png',
      fullPage: true,
    });
  }
});
