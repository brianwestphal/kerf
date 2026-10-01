import { expect, test } from '@playwright/test';

test('busy toolbar action keeps its dimensions and cannot activate', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-control-group');
  const demo = page.locator('[data-demo="toolbar-control-group"]');
  const group = demo.locator(
    '[data-component="toolbar-control-group"]:has([data-action="log-pricing-check"])',
  );
  const action = group.locator('[data-action="log-pricing-check"]');
  const toggle = demo.locator('[data-action="toggle-toolbar-group-busy"]');
  const before = await group.boundingBox();

  await action.click();
  await expect(page.locator('.catalog-log')).toContainText(
    'Pricing check requested',
  );
  await demo.locator('[data-action="log-sidebar"]').click();
  await expect(page.locator('.catalog-log')).toContainText('Sidebar requested');
  await toggle.click();
  await expect(group).toHaveAttribute('aria-busy', 'true');
  await expect(group).toHaveAttribute('inert', '');
  await expect(
    group.locator('[data-component="loading-spinner"]'),
  ).toBeVisible();
  await expect(demo.getByRole('status')).toHaveText('Running pricing check');
  const during = await group.boundingBox();
  expect(during?.width).toBe(before?.width);
  expect(during?.height).toBe(before?.height);
  await group.screenshot({
    path: 'test-results/toolbar-control-group-busy.png',
  });
  await action.evaluate((element: HTMLElement) => element.focus());
  await expect(action).not.toBeFocused();
  const bounds = await action.boundingBox();
  if (bounds)
    await page.mouse.click(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
  await expect(page.locator('.catalog-log')).toContainText('Sidebar requested');
  await toggle.click();
  await expect(group).not.toHaveAttribute('inert', '');
  await expect(group.locator('[data-component="loading-spinner"]')).toHaveCount(
    0,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await toggle.click();
  await expect(group).toHaveAttribute('aria-busy', 'true');
  await expect(group).toBeInViewport();
});
