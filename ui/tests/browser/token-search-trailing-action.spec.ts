import { expect, test } from '@playwright/test';

test('TokenSearchField trailing action fills its slot and activates by pointer and keyboard', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=token-search-field');
  const demo = page.locator('[data-demo="token-search-field"]');
  const button = demo.getByRole('button', { name: 'Search help' });
  await page.evaluate(() => {
    document.body.dataset.searchHelpClicks = '0';
    document.addEventListener('click', (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('#catalog-token-search-help')
      )
        document.body.dataset.searchHelpClicks = String(
          Number(document.body.dataset.searchHelpClicks) + 1,
        );
    });
  });

  for (const [index, width] of [1100, 390].entries()) {
    await page.setViewportSize({ width, height: 844 });
    await expect(button).toBeVisible();
    const geometry = await button.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        width: rect.width,
        height: rect.height,
        appearance: style.appearance,
        padding: style.padding,
        borderWidth: style.borderTopWidth,
        label: element.getAttribute('aria-label'),
        action: element.getAttribute('data-action'),
      };
    });
    expect(geometry.width).toBeGreaterThanOrEqual(24);
    expect(geometry.height).toBeGreaterThanOrEqual(24);
    expect(geometry).toMatchObject({
      appearance: 'none',
      padding: '0px',
      borderWidth: '0px',
      label: 'Search help',
      action: 'show-token-search-help',
    });
    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/token-search-trailing-action-${width}.png`,
      });
    await button.click();
    await expect(page.locator('.catalog-log')).toHaveText(
      'Search help requested',
    );
    await button.focus();
    await button.press('Enter');
    await expect(page.locator('body')).toHaveAttribute(
      'data-search-help-clicks',
      String((index + 1) * 2),
    );
  }
});
