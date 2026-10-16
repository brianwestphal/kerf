import { expect, test } from '@playwright/test';

test('SearchField help toggle fills its slot and opens syntax help by pointer and keyboard', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=search-field');
  const demo = page.locator('[data-demo="search-field"]');
  const button = demo.getByRole('button', { name: 'Search Help' });
  await page.evaluate(() => {
    document.body.dataset.searchHelpClicks = '0';
    document.addEventListener('click', (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('#catalog-search-field-help')
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
      label: 'Search Help',
      action: 'toggle-search-field-help',
    });
    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/search-field-trailing-action-${width}.png`,
      });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(page.locator('.catalog-log')).toHaveText('Search help opened');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const surface = page.getByRole('dialog', { name: 'Search Syntax' });
    await expect(surface).toBeVisible();
    await expect(button).toHaveAttribute(
      'aria-controls',
      (await surface.getAttribute('id')) ?? '',
    );
    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/search-field-help-open-${width}.png`,
      });
    // The help is read-only, so focus stays on the toggle; Enter closes it.
    await button.focus();
    await button.press('Enter');
    await expect(surface).toHaveCount(0);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('body')).toHaveAttribute(
      'data-search-help-clicks',
      String((index + 1) * 2),
    );
  }
});

test('SearchField syntax help chips insert their filter once', async ({
  page,
}) => {
  await page.goto('/?component=search-field');
  const demo = page.locator('[data-demo="search-field"]');
  const field = demo.locator('[data-search-field-id="catalog-search"]');
  await demo.getByRole('button', { name: 'Search Help' }).click();
  const surface = page.getByRole('dialog', { name: 'Search Syntax' });
  await expect(
    surface.getByRole('heading', { name: 'Search Syntax' }),
  ).toBeVisible();
  const status = surface.getByRole('group', { name: 'Status' });
  await status.getByRole('button', { name: 'Insert filter is:open' }).click();
  await expect(page.locator('.catalog-log')).toHaveText('Inserted is:open');
  await expect(field.getByText('is:open', { exact: true })).toHaveCount(1);
  // A filter already in the field is not inserted twice.
  await status.getByRole('button', { name: 'Insert filter is:open' }).click();
  await expect(field.getByText('is:open', { exact: true })).toHaveCount(1);
  await expect(surface).toBeVisible();
});
