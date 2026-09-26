import { expect, type Locator, type Page, test } from '@playwright/test';

// KF-4EYES0: a stacked or narrow Toolbar never clips an action. Stacked control
// zones and every trailing zone wrap whole groups onto another row, and the
// `wrap` policy moves the trailing zone below a heading identity instead of
// truncating it.

/** Every control in the toolbar sits wholly inside it and inside `frame`. */
async function expectNoClippedControls(toolbar: Locator, frame: Locator) {
  const result = await toolbar.evaluate(
    (element, frameElement) => {
      const box = element.getBoundingClientRect();
      const clip = (frameElement as Element).getBoundingClientRect();
      const zones = [...element.children].map((zone) => ({
        name: zone.className,
        overflow: zone.scrollWidth - zone.clientWidth,
      }));
      const controls = [
        ...element.querySelectorAll('button, kui-select, wa-select'),
      ].map((control) => {
        const rect = control.getBoundingClientRect();
        return {
          name:
            control.getAttribute('aria-label') ??
            control.textContent?.trim() ??
            control.tagName,
          inside:
            rect.width > 0 &&
            rect.left >= Math.max(box.left, clip.left) - 0.5 &&
            rect.right <= Math.min(box.right, clip.right) + 0.5,
        };
      });
      return { zones, controls };
    },
    await frame.elementHandle(),
  );
  for (const zone of result.zones)
    expect(zone.overflow, `${zone.name} overflows`).toBeLessThanOrEqual(0);
  expect(result.controls.length).toBeGreaterThan(0);
  for (const control of result.controls)
    expect(control.inside, `${control.name} is clipped`).toBe(true);
}

const topOf = (locator: Locator) =>
  locator.evaluate((element) => element.getBoundingClientRect().top);

async function textIsWhole(text: Locator) {
  return text.evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 0.5,
  );
}

async function open(page: Page, width: number, route: string) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/?component=${route}`);
}

test('the stacked compact-toolbar recipe wraps its trailing action at 390px', async ({
  page,
  browserName,
}) => {
  await open(page, 390, 'recipe-compact-toolbar');
  const recipe = page.locator('[data-recipe="recipe-compact-toolbar"]');
  const toolbar = recipe.locator('[data-component="toolbar"]');
  const frame = page.locator('[data-catalog-example-viewport]').first();
  const more = recipe.getByRole('button', { name: 'More task actions' });
  const refresh = recipe.getByRole('button', { name: 'Refresh tasks' });
  await expect(more).toBeVisible();
  await expectNoClippedControls(toolbar, frame);
  // Whether More fits beside the filter group depends on each engine's Select
  // width; either it shares that row or it wraps to a later one, never earlier.
  expect(await topOf(more)).toBeGreaterThanOrEqual(await topOf(refresh));
  // Stacked zones use the full toolbar content width, not a column track.
  const widths = await toolbar.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const content =
      element.clientWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight);
    return {
      content,
      trailing: element
        .querySelector('.kui-toolbar__trailing')!
        .getBoundingClientRect().width,
    };
  });
  expect(widths.trailing).toBeCloseTo(widths.content, 0);
  await more.click();
  await expect(page.locator('.catalog-log')).toHaveText('more requested');
  if (browserName === 'chromium')
    await recipe.screenshot({
      path: 'test-results/toolbar-overflow-compact-toolbar-390.png',
    });
});

test('the loading-inspector heading keeps its whole title beside or above its action', async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await open(page, width, 'recipe-loading-inspector');
    const recipe = page.locator('[data-recipe="recipe-loading-inspector"]');
    const toolbar = recipe.locator('[data-component="toolbar"]').first();
    await recipe.getByRole('button', { name: 'Show loaded' }).click();
    const toggle = recipe.getByRole('button', { name: 'Show loading' });
    const title = recipe.locator(
      '#recipe-inspector-title .kui-toolbar-text__text',
    );
    await expect(title).toHaveText('Ticket · KF-2048');
    await expect(toolbar).toHaveAttribute('data-responsive', 'wrap');
    expect(await textIsWhole(title)).toBe(true);
    await expectNoClippedControls(
      toolbar,
      page.locator('[data-catalog-example-viewport]').first(),
    );
    const titleBox = await title.boundingBox();
    const toggleBox = await toggle.boundingBox();
    if (width === 1440) {
      // Roomy: one row, the action beside the title.
      expect(toggleBox!.y).toBeLessThan(titleBox!.y + titleBox!.height);
    } else {
      // Narrow: the action moves below the title, still trailing-aligned.
      expect(toggleBox!.y).toBeGreaterThanOrEqual(
        titleBox!.y + titleBox!.height - 0.5,
      );
      const toolbarBox = await toolbar.boundingBox();
      expect(
        toolbarBox!.x + toolbarBox!.width - (toggleBox!.x + toggleBox!.width),
      ).toBeLessThan(24);
    }
  }
});

test('the focused Toolbar demo shows stacked wrapping and the wrap policy', async ({
  page,
  browserName,
}) => {
  for (const width of [1440, 390]) {
    await open(page, width, 'toolbar');
    const stacked = page.locator('[data-demo-toolbar-overflow="stack"]');
    const stackedToolbar = stacked.locator('[data-component="toolbar"]');
    await expectNoClippedControls(
      stackedToolbar,
      stacked.locator('[data-catalog-example-viewport]'),
    );
    const more = stacked.getByRole('button', { name: 'More draft actions' });
    const bold = stacked.getByRole('button', { name: 'Bold' });
    expect(await topOf(more)).toBeGreaterThan(await topOf(bold));

    const wrapped = page.locator('[data-demo-toolbar-overflow="wrap"]');
    const wrappedToolbar = wrapped.locator('[data-component="toolbar"]');
    const title = wrapped.locator('.kui-toolbar-text__text');
    const publish = wrapped.getByRole('button', { name: 'Publish' });
    expect(await textIsWhole(title)).toBe(true);
    await expectNoClippedControls(
      wrappedToolbar,
      wrapped.locator('[data-catalog-example-viewport]'),
    );
    const titleBox = await title.boundingBox();
    expect(await topOf(publish)).toBeGreaterThanOrEqual(
      titleBox!.y + titleBox!.height - 0.5,
    );
    if (browserName === 'chromium')
      await page.locator('[data-demo="toolbar"]').screenshot({
        path: `test-results/toolbar-overflow-demo-${width}.png`,
      });
  }
});
