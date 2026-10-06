import { expect, test } from '@playwright/test';

test('Workbench rail navigates with one toolbar, fixed per-view header, one scroll owner, and a relocating toggle', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=workbench');
    const specimen = page.locator('[data-demo-workbench-navigation]');
    const workbench = specimen.locator('#catalog-workbench-navigation');
    const rail = workbench.locator('[data-workbench-rail="right"]');
    const stack = rail.locator('#catalog-workbench-ticket-stack');
    const activeView = stack.locator(
      '.kui-nav-stack__view[data-nav-active="true"]',
    );
    const activeHeader = activeView.locator('[data-nav-stack-header]');
    const activeScroller = activeView.locator(
      ':scope > [data-component="pane"] > .kui-pane__content',
    );
    const show = workbench.getByRole('button', { name: 'Show tickets' });
    if (await show.isVisible()) await show.click();

    await expect(activeHeader).toContainText('Ticket queue');
    await expect(rail.locator('[data-component="toolbar"]')).toHaveCount(1);
    await specimen.screenshot({
      path: `test-results/workbench-navigation-root-${width}.png`,
    });

    await rail.getByRole('button', { name: 'Open ticket T-42' }).click();
    await expect(stack).toHaveAttribute('data-depth', '2');
    await expect(stack.locator('[data-nav-chrome-copy]')).toHaveCount(0);
    await expect(activeHeader).toContainText('Workspace rail detail');
    await expect(rail.locator('[data-component="toolbar"]')).toHaveCount(1);
    await expect(stack.getByRole('button', { name: 'Back' })).toBeVisible();
    const trailing = stack.locator('.kui-toolbar__trailing');
    await expect(trailing.getByRole('button').last()).toHaveAttribute(
      'aria-label',
      'Hide tickets',
    );

    const headerTop = (await activeHeader.boundingBox())!.y;
    const scroll = await activeScroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return {
        top: element.scrollTop,
        overflow: globalThis.getComputedStyle(element).overflowY,
      };
    });
    expect(scroll.top).toBeGreaterThan(0);
    expect(scroll.overflow).toBe('auto');
    expect((await activeHeader.boundingBox())!.y).toBeCloseTo(headerTop, 0);
    await stack.getByRole('button', { name: 'Activity' }).click();
    await expect(activeView).toContainText('Event 1');
    await specimen.screenshot({
      path: `test-results/workbench-navigation-detail-${width}.png`,
    });

    await rail.getByRole('button', { name: 'Hide tickets' }).click();
    await expect(
      workbench.getByRole('button', { name: 'Show tickets' }),
    ).toBeVisible();
    await expect(rail).toHaveAttribute('data-collapsed', 'true');
    await rail
      .locator('.kui-workbench__panel-content')
      .evaluate(async (element) => {
        await Promise.all(
          element.getAnimations().map((animation) => animation.finished),
        );
      });
    await specimen.screenshot({
      path: `test-results/workbench-navigation-collapsed-${width}.png`,
    });
    await workbench.getByRole('button', { name: 'Show tickets' }).click();
    await expect(stack).toHaveAttribute('data-depth', '2');
    await stack.getByRole('button', { name: 'Back' }).click();
    await expect(stack).toHaveAttribute('data-depth', '1');
    await expect(stack.locator('[data-nav-chrome-copy]')).toHaveCount(0);
    await expect(activeHeader).toContainText('Ticket queue');
  }
});
