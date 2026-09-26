import { expect, type Locator, type Page, test } from '@playwright/test';

// KF-KMKM0G: a List, Row, or Grid given `fill` is the layout root of a
// definite-height parent and takes its full height, so app-sized recipes no
// longer wrap themselves in a frame Pane whose scroll owner never scrolls. The
// catalog frames them at the application-sized `app` height.

type Box = { top: number; bottom: number; left: number; right: number };

const box = (locator: Locator): Promise<Box> =>
  locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
    };
  });

async function openRecipe(page: Page, id: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/?component=${id}`);
  const recipe = page.locator(`[data-recipe="${id}"]`);
  await expect(recipe).toBeVisible();
  const frame = page.locator('[data-catalog-example-viewport]').filter({
    has: recipe,
  });
  return { recipe, frame };
}

/** The recipe root fills the frame's content box exactly. */
async function expectRootFillsFrame(recipe: Locator, frame: Locator) {
  await expect(frame).toHaveAttribute('data-height', 'app');
  const geometry = await frame.evaluate(
    (element, root) => {
      const frameRect = element.getBoundingClientRect();
      const rootRect = (root as Element).getBoundingClientRect();
      return {
        frameHeight: frameRect.height,
        clientHeight: element.clientHeight,
        rootHeight: rootRect.height,
        scrollOwners: element.querySelectorAll(
          ':scope > * > .kui-pane__content',
        ).length,
      };
    },
    await recipe.elementHandle(),
  );
  // The application-sized frame is 592px tall, well above the 360px `tall`.
  expect(geometry.frameHeight).toBeCloseTo(592, 0);
  expect(geometry.rootHeight).toBeCloseTo(geometry.clientHeight, 0);
  // No frame Pane: nothing directly under the root owns scrolling.
  expect(geometry.scrollOwners).toBe(0);
  await expect(recipe).toHaveAttribute('data-fill', 'true');
}

test('the app-shell recipe root fills the app frame and its body reaches the bottom edge', async ({
  page,
  browserName,
}) => {
  for (const width of [1440, 390]) {
    const { recipe, frame } = await openRecipe(page, 'recipe-app-shell', width);
    await expect(recipe).toHaveAttribute('data-component', 'list');
    await expectRootFillsFrame(recipe, frame);
    const root = await box(recipe);
    // The content pane grows into the whole body below the app bar.
    const content = await box(recipe.locator('#recipe-shell-content'));
    expect(content.bottom).toBeCloseTo(root.bottom, 0);
    if (width === 1440) {
      // The resize separators run the full body height, not the content height.
      for (const name of ['Resize Navigation', 'Resize Inspector']) {
        const separator = await box(recipe.getByRole('separator', { name }));
        expect(separator.top, `${name} starts at the body`).toBeCloseTo(
          content.top,
          0,
        );
        expect(separator.bottom, `${name} reaches the bottom`).toBeCloseTo(
          root.bottom,
          0,
        );
      }
    }
    if (browserName === 'chromium')
      await frame.screenshot({
        path: `test-results/layout-fill-app-shell-${width}.png`,
      });
  }
});

test('the collapsible-sidebar recipe root fills the app frame with edge-docked panels', async ({
  page,
  browserName,
}) => {
  const { recipe, frame } = await openRecipe(
    page,
    'recipe-collapsible-sidebar',
    1440,
  );
  await expect(recipe).toHaveAttribute('data-component', 'row');
  await expectRootFillsFrame(recipe, frame);
  const root = await box(recipe);
  const rail = await box(
    page.locator('[data-collapsible-panel="sidebar-rail"]'),
  );
  expect(rail.top).toBeCloseTo(root.top, 0);
  expect(rail.bottom).toBeCloseTo(root.bottom, 0);

  // The drawer opens from the root's bottom edge and the main pane shrinks.
  await page.getByRole('button', { name: 'Show activity' }).first().click();
  const drawer = page.locator('[data-collapsible-panel="sidebar-console"]');
  await expect(drawer).toHaveAttribute('data-collapsed', 'false');
  await expect
    .poll(async () => Math.round((await box(drawer)).bottom - root.bottom))
    .toBe(0);
  const main = await box(recipe.locator('main'));
  const drawerBox = await box(drawer);
  expect(main.bottom).toBeLessThanOrEqual(drawerBox.top + 1);
  await expect(recipe).toHaveAttribute('data-drawer-collapsed', 'false');
  if (browserName === 'chromium')
    await frame.screenshot({
      path: 'test-results/layout-fill-collapsible-sidebar-drawer.png',
    });
});
