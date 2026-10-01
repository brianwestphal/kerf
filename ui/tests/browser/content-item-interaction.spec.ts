import { expect, test } from '@playwright/test';

test('interactive cards select with pointer and keyboard without moving their frame', async ({
  page,
}) => {
  await page.goto('/?component=content-item');
  const demo = page.locator('[data-demo="content-item"]');
  const toggle = demo.locator('[data-demo-item="toggle-card"]');
  const disabled = demo.locator('[data-demo-item="disabled-card"]');
  const optionA = demo.locator('[data-demo-item="document-a"]');
  const optionB = demo.locator('[data-demo-item="document-b"]');
  const log = page.locator('.catalog-log');

  await expect(toggle).toHaveAttribute('role', 'button');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAttribute('title', 'Edit this quotation');
  const loweredBackground = await toggle.evaluate(
    (element) =>
      window.getComputedStyle(element.parentElement!).backgroundColor,
  );
  const before = await toggle.boundingBox();
  const restingBorder = await toggle.evaluate(
    (element) => window.getComputedStyle(element).borderColor,
  );
  await toggle.hover();
  const hoverBorder = await toggle.evaluate(
    (element) => window.getComputedStyle(element).borderColor,
  );
  const hoverBackground = await toggle.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );
  expect(hoverBackground).not.toBe(loweredBackground);
  expect(hoverBorder).not.toBe(restingBorder);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(log).toContainText('Card line-42 selected');
  const selectedBackground = await toggle.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );
  expect(selectedBackground).not.toBe(hoverBackground);
  expect((await toggle.boundingBox())?.width).toBeCloseTo(
    before?.width ?? 0,
    2,
  );
  expect((await toggle.boundingBox())?.height).toBeCloseTo(
    before?.height ?? 0,
    2,
  );

  await toggle.focus();
  await toggle.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS('outline-style', 'solid');
  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(log).toContainText('Card line-42 cleared');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await expect(optionA).toHaveAttribute('aria-selected', 'true');
  await optionB.click();
  await expect(optionB).toHaveAttribute('aria-selected', 'true');
  await expect(optionA).toHaveAttribute('aria-selected', 'false');
  await expect(log).toContainText('Card document-b selected');

  await expect(disabled).toHaveAttribute('aria-disabled', 'true');
  await expect(disabled).toHaveAttribute('tabindex', '-1');
  await expect(disabled).not.toHaveAttribute('data-action', /.+/);
  await expect(disabled).toHaveCSS('cursor', 'not-allowed');
  await disabled.evaluate((element: HTMLElement) => element.click());
  await expect(log).toContainText('Card document-b selected');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeInViewport();
  await expect(optionB).toHaveAttribute('aria-selected', 'true');
  await toggle.screenshot({
    path: 'test-results/content-item-interaction-narrow.png',
  });
});
