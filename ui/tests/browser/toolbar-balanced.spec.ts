import { expect, test } from '@playwright/test';

test('balanced Toolbar centers its middle zone with an empty leading zone', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?component=toolbar');
  const toolbar = page.locator(
    '[data-component="toolbar"][aria-label="Ticket header"]',
  );
  const center = toolbar.locator(':scope > .kui-toolbar__center');
  const trailing = toolbar.locator(':scope > .kui-toolbar__trailing');
  await expect(toolbar).toHaveAttribute('data-center-align', 'balanced');
  await expect(toolbar.locator(':scope > .kui-toolbar__leading')).toBeEmpty();
  await expect(center.getByText('TICKET-123')).toBeVisible();
  for (const width of [850, 480]) {
    await toolbar.evaluate((element, value) => {
      element.style.width = `${value}px`;
    }, width);
    for (const direction of ['ltr', 'rtl']) {
      await toolbar.evaluate((element, value) => {
        element.setAttribute('dir', value);
      }, direction);
      const barBox = (await toolbar.boundingBox())!;
      const centerBox = (await center.boundingBox())!;
      const trailingBox = (await trailing.boundingBox())!;
      expect(
        Math.abs(
          centerBox.x + centerBox.width / 2 - (barBox.x + barBox.width / 2),
        ),
        `${width}px ${direction} midpoint`,
      ).toBeLessThanOrEqual(1);
      expect(
        centerBox.x + centerBox.width <= trailingBox.x ||
          trailingBox.x + trailingBox.width <= centerBox.x,
      ).toBe(true);
      if (testInfo.project.name === 'chromium' && direction === 'ltr')
        await toolbar.screenshot({
          path: testInfo.outputPath(`balanced-toolbar-${width}.png`),
        });
    }
  }
});
