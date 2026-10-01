import { expect, test } from '@playwright/test';

test('Workbench inspector header stays pinned above its one scroll owner', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=workbench');
  const workbench = page.locator('#catalog-workbench-resizable');
  await workbench.getByRole('button', { name: 'Show inspector' }).click();
  const inspector = workbench.locator('[data-workbench-rail="right"]');
  const pane = inspector.locator('[data-component="pane"]');
  const header = pane.locator(':scope > .kui-pane__header');
  const scroller = pane.locator(':scope > .kui-pane__content');
  const footer = pane.locator(':scope > .kui-pane__footer');
  await expect(header.getByText('Ticket #42')).toBeVisible();
  await expect(header.getByText('Open for review')).toBeVisible();
  await expect(footer.getByText('Updated just now')).toBeVisible();
  await expect(footer.locator('.kui-toolbar')).toHaveJSProperty(
    'tagName',
    'FOOTER',
  );
  const headerY = (await header.boundingBox())!.y;
  const footerY = (await footer.boundingBox())!.y;
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  expect((await header.boundingBox())!.y).toBeCloseTo(headerY, 1);
  expect((await footer.boundingBox())!.y).toBeCloseTo(footerY, 1);
  await expect(header).toHaveAttribute('data-scroll-divider', /b/);
  await inspector.screenshot({
    path: 'test-results/workbench-panel-header-wide.png',
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await workbench.scrollIntoViewIfNeeded();
  await expect(inspector).toHaveCSS('position', 'absolute');
  await workbench.getByRole('button', { name: 'Show inspector' }).click();
  await expect(header.getByText('Ticket #42')).toBeVisible();
  await expect(footer.getByText('Updated just now')).toBeVisible();
});

test('CollapsiblePanel composes the same fixed header under its toolbar', async ({
  page,
}) => {
  await page.goto('/?component=collapsible-panel');
  const example = page.locator('[data-catalog-panel-relocation-example]');
  await example.getByRole('button', { name: 'Show navigator' }).click();
  const panel = example.locator(
    '[data-collapsible-panel="catalog-panel-relocation"]',
  );
  const pane = panel.locator('[data-component="pane"]');
  await expect(
    pane.locator(':scope > .kui-pane__header .kui-toolbar'),
  ).toHaveCount(1);
  await expect(
    pane.locator(':scope > .kui-pane__header').getByText('Pinned files'),
  ).toBeVisible();
  await expect(
    pane.locator(':scope > .kui-pane__content').getByText('Files'),
  ).toBeVisible();
});
