import { expect, test } from '@playwright/test';

test('ListHeader shows badge and status together across widths', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/?component=list-header');
    const header = page
      .locator(
        '[data-demo-list-header-combined] [data-component="list-header"]',
      )
      .filter({ hasText: 'Purchases' });
    await expect(header).toHaveAttribute('data-has-badge', 'true');
    await expect(header).toHaveAttribute('data-has-count', 'false');
    const badges = header.locator('[data-component="badge"]');
    await expect(badges).toHaveCount(2);
    await expect(badges.nth(0)).toHaveText('3 lines unpriced');
    await expect(badges.nth(1)).toHaveText('Needs review');
    const geometry = await header.evaluate((element) => {
      const [first, second] = element.querySelectorAll<HTMLElement>(
        '[data-component="badge"]',
      );
      const firstRect = first!.getBoundingClientRect();
      const secondRect = second!.getBoundingClientRect();
      const headerRect = element.getBoundingClientRect();
      return {
        inOrder: firstRect.right <= secondRect.left,
        inside: secondRect.right <= headerRect.right + 1,
      };
    });
    expect(geometry).toEqual({ inOrder: true, inside: true });
    if (testInfo.project.name === 'chromium')
      await header.screenshot({
        path: testInfo.outputPath(`list-header-combined-${width}.png`),
      });
  }
});
