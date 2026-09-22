import { expect, test } from '@playwright/test';

test('focused app-layout catalog demos expose their real controlled behavior', async ({
  page,
}) => {
  await page.goto('/?component=nav-stack');
  const stack = page.getByRole('region', { name: 'Project library' });
  await expect(stack).toHaveAttribute('data-depth', '2');
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(stack).toHaveAttribute('data-depth', '1');
  await expect(stack.locator('.kui-nav-stack__title')).toHaveText('Library');

  await page.goto('/?component=tab-scaffold');
  const search = page.getByRole('tab', { name: 'Search' });
  await search.click();
  await expect(search).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.locator('[data-tab-scaffold-scene="search"]'),
  ).toHaveAttribute('data-active', 'true');

  await page.goto('/?component=collapsible-panel');
  const panels = page.locator('[data-demo="collapsible-panel"]');
  await expect(panels.getByRole('complementary')).toHaveCount(3);
  await expect(
    page.getByRole('complementary', { name: 'Project navigator' }),
  ).toHaveClass(/kui-collapsible-panel--left/);
  await expect(
    page.getByRole('complementary', { name: 'Selection inspector' }),
  ).toHaveClass(/kui-collapsible-panel--right/);
  await expect(
    page.getByRole('complementary', { name: 'Build output' }),
  ).toHaveClass(/kui-collapsible-panel--bottom/);
});

test('app-layout catalog routes remain usable at compact width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const id of [
    'nav-stack',
    'split-view',
    'tab-scaffold',
    'workbench',
    'collapsible-panel',
  ]) {
    await page.goto(`/?component=${id}`);
    const demo = page.locator(`[data-demo="${id}"]`);
    await expect(demo).toBeVisible();
    expect(
      await demo.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
  }
});
