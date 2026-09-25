import { expect, test } from '@playwright/test';

test('Spacer provides fixed token dimensions and flexible main-axis space', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=spacer');
  // One Spacer per catalog example: named dimensions, flexible, vertical.
  const examples = page.locator('[data-demo="spacer"] [data-catalog-example]');

  const fixed = examples.nth(0).locator('.kui-spacer');
  await expect(fixed).toHaveAttribute('aria-hidden', 'true');
  await expect(fixed).toHaveAttribute('data-flex', 'false');
  await expect
    .poll(() =>
      fixed.evaluate((element) => {
        const style = globalThis.getComputedStyle(element);
        return { width: style.width, height: style.height, flex: style.flex };
      }),
    )
    .toEqual({ width: '16px', height: '24px', flex: '0 0 auto' });

  const flexible = examples.nth(1).locator('.kui-spacer');
  await expect(flexible).toHaveAttribute('data-flex', 'true');
  await expect
    .poll(() =>
      flexible.evaluate((element) => {
        const style = globalThis.getComputedStyle(element);
        return {
          flex: style.flex,
          width: element.getBoundingClientRect().width,
        };
      }),
    )
    .toMatchObject({ flex: '1 1 auto' });
  expect(
    await flexible.evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(100);

  const vertical = examples.nth(2).locator('.kui-spacer');
  await expect
    .poll(() =>
      vertical.evaluate(
        (element) => globalThis.getComputedStyle(element).height,
      ),
    )
    .toBe('16px');

  await page.screenshot({
    path: 'test-results/spacer-wide.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator('html')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/spacer-narrow.png',
    fullPage: true,
  });
});
