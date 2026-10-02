import { expect, test } from '@playwright/test';

const routes = [
  { id: 'loading-spinner', name: 'LoadingSpinner', links: 3 },
  { id: 'toolbar', name: 'Toolbar', links: 4 },
  { id: 'recipe-list-detail-dialog', name: 'List-detail dialog', links: 2 },
  { id: 'wa-button', name: 'Button', links: 2 },
] as const;

test('catalog resource links wrap as whole actions at compact widths', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const { id, name, links } of routes) {
    await page.goto(`/?component=${id}`);
    const resources = page.getByRole('group', { name: `${name} resources` });
    const actions = resources.locator('[data-component="toolbar-action-link"]');
    const footer = resources.locator(
      'xpath=ancestor::*[@data-component="toolbar"][1]',
    );
    await expect(actions).toHaveCount(links);
    await expect(resources).toHaveAttribute('data-overflow', 'wrap');
    const geometry = await resources.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        groupLeft: bounds.left,
        groupRight: bounds.right,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        actions: [...element.querySelectorAll('a')].map((link) => {
          const action = link.getBoundingClientRect();
          const label = link.querySelector('span')!.getBoundingClientRect();
          return {
            top: action.top,
            left: action.left,
            right: action.right,
            labelLeft: label.left,
            labelRight: label.right,
          };
        }),
      };
    });
    expect(geometry.groupLeft).toBeGreaterThanOrEqual(-1);
    expect(geometry.groupRight).toBeLessThanOrEqual(391);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    for (const action of geometry.actions) {
      expect(action.left).toBeGreaterThanOrEqual(geometry.groupLeft);
      expect(action.right).toBeLessThanOrEqual(geometry.groupRight);
      expect(action.labelLeft).toBeGreaterThanOrEqual(action.left);
      expect(action.labelRight).toBeLessThanOrEqual(action.right);
    }
    if (links > 2)
      expect(geometry.actions.at(-1)!.top).toBeGreaterThan(
        geometry.actions[0].top,
      );
    else expect(geometry.actions.at(-1)!.top).toBe(geometry.actions[0].top);
    await actions.last().focus();
    await expect(actions.last()).toBeFocused();
    if (testInfo.project.name === 'chromium')
      await footer.screenshot({
        path: testInfo.outputPath(`catalog-footer-${id}-narrow.png`),
      });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=toolbar');
  const wide = page.getByRole('group', { name: 'Toolbar resources' });
  const wideActions = wide.locator('[data-component="toolbar-action-link"]');
  await expect(wideActions).toHaveCount(4);
  expect(
    await wideActions.first().evaluate((el) => el.getBoundingClientRect().top),
  ).toBe(
    await wideActions.last().evaluate((el) => el.getBoundingClientRect().top),
  );
  if (testInfo.project.name === 'chromium')
    await wide
      .locator('xpath=ancestor::*[@data-component="toolbar"][1]')
      .screenshot({
        path: testInfo.outputPath('catalog-footer-toolbar-wide.png'),
      });

  await page.setViewportSize({ width: 720, height: 900 });
  await page.goto('/?component=wa-button');
  await page.locator('html').evaluate((element) => {
    element.style.fontSize = '200%';
  });
  const zoomed = page.getByRole('group', { name: 'Button resources' });
  await expect(zoomed).toBeVisible();
  expect(
    await zoomed.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
