import { expect, test } from '@playwright/test';

test('renders conditional and mapped List children without a Fragment', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=list');

  const workspace = page
    .locator('[data-demo="list"] [data-component="list"]')
    .filter({ has: page.getByText('Workspace', { exact: true }) })
    .last();
  await expect(workspace.getByText('Workspace', { exact: true })).toBeVisible();
  await expect(workspace.locator('[data-component="list-item"]')).toHaveCount(
    3,
  );
  await expect(workspace.locator('[data-component="list-item"]')).toContainText(
    ['Inbox', 'Projects', 'Drafts without a visible icon'],
  );

  if (browserName === 'chromium') {
    await page.screenshot({
      path: 'test-results/semantic-content-list-wide.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(workspace).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: 'test-results/semantic-content-list-narrow.png',
      fullPage: true,
    });
  }
});
