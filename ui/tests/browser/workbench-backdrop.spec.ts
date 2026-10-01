import { expect, test } from '@playwright/test';

test('responsive rail backdrop absorbs a press over a work-area card', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/?component=workbench');
  const workbench = page.locator('#catalog-workbench-resizable');
  await workbench.scrollIntoViewIfNeeded();
  const left = workbench.locator('[data-workbench-rail="left"]');
  const backdrop = workbench.locator('[data-workbench-backdrop]');
  const underlay = workbench.locator('[data-demo-underlay]');
  await expect(backdrop).toBeHidden();

  await workbench.getByRole('button', { name: 'Show navigator' }).click();
  await expect(left).toHaveAttribute('data-collapsed', 'false');
  await expect(backdrop).toBeVisible();
  await expect(backdrop).toHaveCSS('background-color', /rgba?\(/);
  await workbench.screenshot({
    path: 'test-results/workbench-backdrop-rail.png',
  });
  const card = await underlay.boundingBox();
  expect(card).not.toBeNull();
  const point = { x: card!.x + card!.width / 2, y: card!.y + card!.height / 2 };
  const top = await page.evaluate(
    ({ x, y }) =>
      document.elementFromPoint(x, y)?.hasAttribute('data-workbench-backdrop'),
    point,
  );
  expect(top).toBe(true);
  await page.mouse.click(point.x, point.y);
  await expect(left).toHaveAttribute('data-collapsed', 'true');
  await expect(backdrop).toBeHidden();
  await expect(page.locator('.catalog-log')).not.toContainText(
    'Select underlying item requested',
  );
  await underlay.click();
  await expect(page.locator('.catalog-log')).toContainText(
    'Select underlying item requested',
  );
});

test('responsive drawer backdrop closes the drawer without covering its controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/?component=workbench');
  const workbench = page.locator('#catalog-workbench-responsive-drawer');
  await workbench.scrollIntoViewIfNeeded();
  const drawer = workbench.locator('[data-workbench-drawer]');
  const backdrop = workbench.locator('[data-workbench-backdrop]');
  await expect(drawer).toHaveAttribute('data-collapsed', 'true');
  await workbench.getByRole('button', { name: 'Show output' }).click();
  await expect(drawer).toHaveAttribute('data-collapsed', 'false');
  await expect(backdrop).toBeVisible();
  await expect(
    drawer.getByRole('button', { name: 'Hide output' }),
  ).toBeVisible();
  const bounds = await backdrop.boundingBox();
  await page.mouse.click(bounds!.x + bounds!.width / 2, bounds!.y + 10);
  await expect(drawer).toHaveAttribute('data-collapsed', 'true');
  await expect(backdrop).toBeHidden();
});
