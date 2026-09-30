import { expect, test } from '@playwright/test';

test('ListItemLink navigates as an anchor with shared row geometry', async ({
  page,
}) => {
  await page.goto('/?component=list-item');

  const link = page.locator(
    '[data-component="list-item-link"][data-item-id="link"]',
  );
  await expect(link).toHaveAttribute('href', '#list-item-link-target');
  await expect(link).toHaveCSS('display', 'grid');
  await expect(link).toHaveCSS('text-decoration-line', 'none');
  await link.click();
  await expect(page).toHaveURL(/#list-item-link-target$/);
  await expect(page.locator('#list-item-link-target')).toBeVisible();

  const external = page.locator(
    '[data-component="list-item-link"][data-item-id="external-link"]',
  );
  await expect(external).toHaveAttribute('target', '_blank');
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(external).toHaveAttribute(
    'aria-label',
    'Open external example (opens in new tab)',
  );
});
