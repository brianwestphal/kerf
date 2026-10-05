import { expect, test } from '@playwright/test';

test('compact toolbar independent action matches adjacent pill geometry', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=recipe-compact-toolbar');
  const recipe = page.locator('[data-recipe="recipe-compact-toolbar"]');
  const more = recipe.getByRole('button', { name: 'More task actions' });
  const moreGroup = more.locator('xpath=..');
  const filterGroup = recipe
    .getByRole('group', { name: 'Task actions' })
    .first();

  const geometry = await Promise.all(
    [moreGroup, filterGroup].map((group) =>
      group.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          height: bounds.height,
          radius: Number.parseFloat(style.borderTopLeftRadius),
        };
      }),
    ),
  );
  expect(geometry[0].height).toBe(geometry[1].height);
  expect(geometry[0].height).toBe(44);
  expect(geometry[0].radius).toBeGreaterThanOrEqual(geometry[0].height / 2);

  await more.focus();
  await expect(more).toBeFocused();
  await more.click();
  await expect(page.locator('.catalog-log')).toHaveText('more requested');
  if (browserName === 'chromium')
    await recipe.screenshot({ path: 'test-results/compact-toolbar-wide.png' });

  // Resize completion can precede the app's responsive resize-event handling.
  // Poll the unchanged no-overflow requirement, including a return to wide.
  for (const width of [390, 1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1,
        ),
      )
      .toBe(true);
    await expect(moreGroup).toBeVisible();
  }
  if (browserName === 'chromium')
    await recipe.locator('[aria-label="Task workspace controls"]').screenshot({
      path: 'test-results/compact-toolbar-narrow.png',
    });
});
