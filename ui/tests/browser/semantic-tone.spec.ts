import { expect, test } from '@playwright/test';

test('info is a shared semantic role across metadata, feedback, and content', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const component of ['badge', 'chip', 'state-banner', 'content-item']) {
      await page.goto(`/?component=${component}`);
      const attribute =
        component === 'content-item' ? 'data-appearance' : 'data-tone';
      const specimen = page
        .locator(
          `[data-demo="${component}"] [data-component="${component}"][${attribute}="info"]`,
        )
        .first();
      await expect(specimen).toBeVisible();
      const colors = await specimen.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return { background: style.backgroundColor, color: style.color };
      });
      expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(colors.color).not.toBe(colors.background);
      if (component === 'state-banner')
        await expect(
          specimen.locator('[data-component="badge"]'),
        ).toHaveAttribute('data-tone', 'info');
      await specimen.screenshot({
        path: testInfo.outputPath(`${component}-info-${width}.png`),
      });
    }
  }
});
