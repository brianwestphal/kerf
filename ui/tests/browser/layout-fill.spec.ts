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

// KF-1575B8: a lone child of ResizableRegion content fills the region, so the
// app shell's navigation and inspector Panes reach the bottom edge the
// separators already did and own scrolling when their content is long.
test('the app-shell resizable panes fill their regions and scroll long content', async ({
  page,
}) => {
  const { recipe } = await openRecipe(page, 'recipe-app-shell', 1440);
  const root = await box(recipe);
  for (const [paneId, regionId] of [
    ['recipe-shell-navigation', 'recipe-navigation'],
    ['recipe-shell-inspector', 'recipe-inspector'],
  ] as const) {
    const region = await box(
      recipe.locator(
        `[data-component="resizable-region"][data-region-id="${regionId}"]`,
      ),
    );
    const pane = recipe.locator(`#${paneId}`);
    const paneBox = await box(pane);
    expect(paneBox.top, `${paneId} top`).toBeCloseTo(region.top, 0);
    expect(paneBox.bottom, `${paneId} bottom`).toBeCloseTo(region.bottom, 0);
    expect(paneBox.bottom, `${paneId} reaches the root`).toBeCloseTo(
      root.bottom,
      0,
    );

    // Long content scrolls inside the pane's content slot; the pane itself
    // keeps the region's height instead of growing past it.
    const scroll = await pane.evaluate((element) => {
      const content = element.querySelector<HTMLElement>(
        ':scope > .kui-pane__content',
      )!;
      for (let index = 0; index < 40; index += 1) {
        const item = document.createElement('div');
        item.className = 'kui-content-item';
        item.textContent = `Filler ${String(index + 1)}`;
        content.append(item);
      }
      const before = element.getBoundingClientRect().height;
      content.scrollTop = content.scrollHeight;
      return {
        before,
        overflow: globalThis.getComputedStyle(content).overflowY,
        scrollable: content.scrollHeight > content.clientHeight,
        scrolled: content.scrollTop > 0,
        contentBottom: content.getBoundingClientRect().bottom,
        paneBottom: element.getBoundingClientRect().bottom,
      };
    });
    expect(scroll.before).toBeCloseTo(paneBox.bottom - paneBox.top, 0);
    expect(scroll.overflow).toBe('auto');
    expect(scroll.scrollable).toBe(true);
    expect(scroll.scrolled).toBe(true);
    expect(scroll.contentBottom).toBeCloseTo(scroll.paneBottom, 0);
    expect((await box(pane)).bottom).toBeCloseTo(region.bottom, 0);
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
