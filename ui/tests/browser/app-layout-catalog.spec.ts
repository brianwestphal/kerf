import { expect, test } from '@playwright/test';

test('a tab scene keeps its own NavStack toolbar and pane above the tab bar', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=tab-navigator');
  const scaffold = page.locator('#catalog-tab-scaffold-nested');
  const stack = scaffold.locator('#catalog-tab-scaffold-project-stack');
  await expect(stack).toHaveAttribute('data-depth', '1');
  await expect(stack.locator(':scope > [data-nav-stack-chrome]')).toBeVisible();
  await expect(stack.locator('[data-component="pane"]')).toBeVisible();
  await expect(stack.locator(':scope > [data-nav-stack-bottom]')).toHaveCount(
    0,
  );
  await expect(scaffold.locator('.kui-tab-scaffold__bar')).toBeVisible();
  if (browserName === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-nested-stack-root-wide.png',
    });

  await stack.getByRole('button', { name: /Project Atlas/ }).click();
  await expect(stack).toHaveAttribute('data-depth', '2');
  await expect(stack).not.toHaveAttribute('data-nav-chrome-transition', 'true');
  await expect(
    stack.locator(
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) .kui-toolbar-text[data-fill="true"]',
    ),
  ).toHaveText('Project Atlas');
  await scaffold.getByRole('tab', { name: 'Search' }).click();
  await expect(
    scaffold.locator('[data-tab-scaffold-scene="search"]'),
  ).toHaveAttribute('data-active', 'true');
  await scaffold.getByRole('tab', { name: 'Projects' }).click();
  await expect(stack).toHaveAttribute('data-depth', '2');
  await page.setViewportSize({ width: 390, height: 844 });
  if (browserName === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-nested-stack-detail-narrow.png',
    });
  await stack.getByRole('button', { name: 'Back' }).click();
  await expect(stack).toHaveAttribute('data-depth', '1');
});

test('focused app-layout catalog demos expose their real controlled behavior', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=nav-stack');
  const navDemo = page.locator('[data-demo="nav-stack"]');
  const stack = page.getByRole('region', {
    name: 'Project library',
    exact: true,
  });
  await expect(stack).toHaveAttribute('data-depth', '1');
  await expect(stack.locator('[data-nav-back]')).toHaveCount(0);
  if (browserName === 'chromium')
    await navDemo.screenshot({
      path: 'test-results/nav-stack-root-wide.png',
    });
  await stack.evaluate((element) => {
    const stack = element as HTMLElement;
    const record = () => {
      if (stack.dataset.navChromeTransition === 'true')
        stack.dataset.testSawChromeTransition = 'true';
      const copies = stack.querySelectorAll('[data-nav-chrome-copy]').length;
      const maxCopies = String(
        Math.max(Number(stack.dataset.testMaxChromeCopies ?? 0), copies),
      );
      if (stack.dataset.testMaxChromeCopies !== maxCopies)
        stack.dataset.testMaxChromeCopies = maxCopies;
    };
    new MutationObserver(record).observe(stack, {
      attributeFilter: ['data-nav-chrome-transition'],
      childList: true,
      subtree: true,
    });
    record();
  });
  const atlas = stack.getByRole('button', { name: /Project Atlas/ });
  await atlas.click();
  await expect(stack).toHaveAttribute('data-depth', '2');
  await expect(stack.locator('[data-nav-detail-focus]')).toBeFocused();
  await expect(
    stack.locator(
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) .kui-toolbar-text[data-fill="true"]',
    ),
  ).toHaveText('Project Atlas');
  await expect(
    stack.locator(
      ':scope > [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
    ),
  ).toHaveText('Updated just now');
  await expect(stack).not.toHaveAttribute('data-nav-chrome-transition', 'true');
  await expect(stack).toHaveAttribute(
    'data-test-saw-chrome-transition',
    'true',
  );
  await expect(stack).toHaveAttribute('data-test-max-chrome-copies', '2');
  if (browserName === 'chromium')
    await navDemo.screenshot({
      path: 'test-results/nav-stack-detail-wide.png',
    });
  // The transition attribute is transient (removed when the animation
  // settles), so a fast engine can clear it before a poll sees it. Reset the
  // observer's latch and assert that the back navigation raised it instead.
  await stack.evaluate((element) => {
    delete (element as HTMLElement).dataset.testSawChromeTransition;
  });
  await page.getByRole('button', { name: 'Back to library' }).click();
  await expect(stack).toHaveAttribute('data-depth', '1');
  await expect(atlas).toBeFocused();
  await expect(stack).toHaveAttribute(
    'data-test-saw-chrome-transition',
    'true',
  );
  await expect(
    stack.locator(
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) .kui-toolbar-text[data-fill="true"]',
    ),
  ).toHaveText('Library');
  await expect(
    stack.locator(
      ':scope > [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
    ),
  ).toHaveText('2 saved projects');
  await expect(stack).not.toHaveAttribute('data-nav-chrome-transition', 'true');

  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?component=nav-stack');
    const narrowStack = page.getByRole('region', {
      name: 'Project library',
      exact: true,
    });
    await narrowStack.getByText('Project Relay', { exact: true }).click();
    await expect(narrowStack).toHaveAttribute(
      'data-nav-chrome-transition',
      'true',
    );
    await expect(narrowStack).not.toHaveAttribute(
      'data-nav-chrome-transition',
      'true',
    );
    await page.locator('[data-demo="nav-stack"]').screenshot({
      path: 'test-results/nav-stack-detail-narrow.png',
    });
  }

  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=split-view');
  const compactStack = page.getByRole('region', { name: 'Compact messages' });
  await expect(compactStack).toHaveAttribute('data-depth', '1');
  await expect(compactStack.locator('[data-nav-back]')).toHaveCount(0);
  if (browserName === 'chromium')
    await compactStack.screenshot({
      path: 'test-results/split-view-list-wide.png',
    });
  await compactStack.getByText('Design review', { exact: true }).click();
  await expect(compactStack).toHaveAttribute('data-depth', '2');
  await expect(compactStack).not.toHaveAttribute(
    'data-nav-chrome-transition',
    'true',
  );
  await expect(
    compactStack.getByRole('button', { name: 'Back to inbox' }),
  ).toBeVisible();
  await expect(compactStack).toContainText('Today’s review notes');
  if (browserName === 'chromium')
    await compactStack.screenshot({
      path: 'test-results/split-view-detail-wide.png',
    });
  await compactStack.getByRole('button', { name: 'Back to inbox' }).click();
  await expect(compactStack).toHaveAttribute('data-depth', '1');
  await expect(compactStack.locator('[data-nav-back]')).toHaveCount(0);

  if (browserName === 'chromium') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?component=split-view');
    const narrowStack = page.getByRole('region', {
      name: 'Compact messages',
    });
    await narrowStack.getByText('Launch plan', { exact: true }).click();
    await expect(narrowStack).toHaveAttribute('data-depth', '2');
    await expect(narrowStack).not.toHaveAttribute(
      'data-nav-chrome-transition',
      'true',
    );
    await narrowStack.screenshot({
      path: 'test-results/split-view-detail-narrow.png',
    });
  }

  await page.goto('/?component=tab-navigator');
  const originalScaffold = page.locator('#catalog-tab-scaffold');
  const search = originalScaffold.getByRole('tab', { name: 'Search' });
  await search.click();
  await expect(search).toHaveAttribute('aria-selected', 'true');
  await expect(
    originalScaffold.locator('[data-tab-scaffold-scene="search"]'),
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
    'tab-navigator',
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

// KF-DRMN5Q: the collapsible-panel catalog route demonstrates a drawer's
// restoreControl, wired with wireSidebar so the corner control really restores
// the drawer and the drawer's own toggle collapses it again.
for (const width of [1100, 390]) {
  test(`the collapsible-panel restore control restores and re-collapses its drawer (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=collapsible-panel');
    const example = page.locator('[data-catalog-panel-restore-example]');
    const frame = example.locator('[data-catalog-example-viewport]');
    const drawer = example.locator(
      '[data-collapsible-panel="catalog-panel-restore"]',
    );
    const restore = example.locator(
      '[data-panel-restore="catalog-panel-restore"]',
    );
    const show = restore.getByRole('button', { name: 'Show console' });

    // Collapsed on arrival: the control floats in the frame's bottom-end
    // corner, inset from the frame's padding box (inside its border).
    await expect(drawer).toHaveAttribute('data-collapsed', 'true');
    await show.scrollIntoViewIfNeeded();
    await expect(show).toBeVisible();
    const group = restore.locator('[data-component="toolbar-control-group"]');
    const groupBox = (await group.boundingBox())!;
    const inner = await frame.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        right: box.left + element.clientLeft + element.clientWidth,
        bottom: box.top + element.clientTop + element.clientHeight,
      };
    });
    expect(Math.round(inner.right - (groupBox.x + groupBox.width))).toBe(16);
    expect(Math.round(inner.bottom - (groupBox.y + groupBox.height))).toBe(16);

    // The corner control restores the drawer and hands focus into it.
    await show.click();
    await expect(drawer).toHaveAttribute('data-collapsed', 'false');
    await expect(restore).toHaveCount(0);
    const hide = drawer.getByRole('button', { name: 'Hide console' });
    await expect(hide).toBeVisible();
    await expect(hide).toBeFocused();

    // The drawer's own toggle collapses it; the restore control returns and
    // takes focus back.
    await hide.click();
    await expect(drawer).toHaveAttribute('data-collapsed', 'true');
    await expect(show).toBeVisible();
    await expect(show).toBeFocused();
  });
}

// The NavStack route's configured example dogfoods toolbarConfig (a level-2
// heading title over a bottom divider), per-view leading/center/trailing groups,
// and a visible backText naming the previous view.
for (const width of [1100, 390]) {
  test(`the configured nav-stack example forwards its toolbar configuration (${width}px)`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=nav-stack');
    const stack = page.getByRole('region', {
      name: 'Configured project library',
    });
    const toolbar = stack.locator(
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) [data-component="toolbar"]',
    );
    await expect(toolbar).toHaveAttribute('divider-sides', 'b');
    await expect(
      toolbar.getByRole('heading', { level: 2, name: 'Library' }),
    ).toBeVisible();
    await expect(
      toolbar
        .locator('.kui-toolbar__leading')
        .getByRole('button', { name: 'Show sidebar' }),
    ).toBeVisible();
    await expect(
      toolbar
        .locator('.kui-toolbar__center')
        .getByRole('button', { name: 'List layout' }),
    ).toHaveAttribute('aria-pressed', 'true');
    // The center group sits clear of the leading identity.
    const leadingBox = (await toolbar
      .locator('.kui-toolbar__leading')
      .boundingBox())!;
    const centerBox = (await toolbar
      .locator('.kui-toolbar__center [data-component="toolbar-control-group"]')
      .boundingBox())!;
    expect(centerBox.x).toBeGreaterThanOrEqual(leadingBox.x + leadingBox.width);
    if (browserName === 'chromium')
      await stack.screenshot({
        path: `test-results/nav-stack-configured-root-${width}.png`,
      });

    await stack.getByText('Project Atlas', { exact: true }).click();
    await expect(stack).toHaveAttribute('data-depth', '2');
    await expect(stack).not.toHaveAttribute(
      'data-nav-chrome-transition',
      'true',
    );
    // Visible backText names the control; the pushed view owns a trailing group.
    const back = toolbar.getByRole('button', { name: 'Library' });
    await expect(back).toBeVisible();
    await expect(back).not.toHaveAttribute('aria-label', /.*/);
    await expect(
      toolbar.getByRole('heading', { level: 2, name: 'Project Atlas' }),
    ).toBeVisible();
    await expect(
      toolbar
        .locator('.kui-toolbar__trailing')
        .getByRole('button', { name: 'Share project' }),
    ).toBeVisible();
    await expect(toolbar.locator('.kui-toolbar__center')).toBeHidden();
    if (browserName === 'chromium')
      await stack.screenshot({
        path: `test-results/nav-stack-configured-detail-${width}.png`,
      });

    await back.click();
    await expect(stack).toHaveAttribute('data-depth', '1');
    await expect(
      toolbar.getByRole('heading', { level: 2, name: 'Library' }),
    ).toBeVisible();
  });
}

// The SplitView route's resizable example forwards the list region's
// configuration: a hidden separator that still resizes, and a collapse whose
// FloatingToolbar restore control brings the list back at its committed width.
test('the resizable split-view example resizes, collapses, and restores its list', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=split-view');
  const split = page.locator('#catalog-split-view-resizable');
  const region = split.locator('[data-component="resizable-region"]');
  const list = page.getByRole('region', { name: 'Threads' });
  await expect(region).toHaveAttribute('data-separator', 'hidden');
  await expect(region).toHaveAttribute('data-collapsed', 'false');
  await expect(list).toBeVisible();

  const separator = split.getByRole('separator', { name: 'Resize Threads' });
  await separator.focus();
  await page.keyboard.press('End');
  await expect(separator).toHaveAttribute('aria-valuenow', '420');
  expect(Math.round((await list.boundingBox())!.width)).toBe(420);
  if (browserName === 'chromium')
    await split.screenshot({
      path: 'test-results/split-view-resizable-open-wide.png',
    });

  await split.getByRole('button', { name: 'Hide threads' }).click();
  await expect(region).toHaveAttribute('data-collapsed', 'true');
  await expect(region).toHaveAttribute('inert', '');
  const restore = split.getByRole('button', { name: 'Show threads' });
  await expect(restore).toBeVisible();
  // The restore control docks in the split's bottom-start corner.
  const splitBox = (await split.boundingBox())!;
  const restoreBox = (await restore.boundingBox())!;
  expect(restoreBox.x - splitBox.x).toBeLessThan(40);
  expect(
    splitBox.y + splitBox.height - (restoreBox.y + restoreBox.height),
  ).toBeLessThan(40);
  if (browserName === 'chromium')
    await split.screenshot({
      path: 'test-results/split-view-resizable-collapsed-wide.png',
    });

  await restore.click();
  await expect(region).toHaveAttribute('data-collapsed', 'false');
  await expect(restore).toHaveCount(0);
  await expect(separator).toHaveAttribute('aria-valuenow', '420');
});

// The compact drill-down forwards compactStack: a level-2 heading title over a
// bottom divider, and per-view trailing groups plus the detail's bottom toolbar.
test('the compact split-view example forwards its compactStack configuration', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=split-view');
  const stack = page.getByRole('region', { name: 'Compact messages' });
  const toolbar = stack.locator(
    ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) [data-component="toolbar"]',
  );
  await expect(toolbar).toHaveAttribute('divider-sides', 'b');
  await expect(
    toolbar.getByRole('heading', { level: 2, name: 'Inbox' }),
  ).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Compose' })).toBeVisible();

  await stack.getByText('Design review', { exact: true }).click();
  await expect(stack).toHaveAttribute('data-depth', '2');
  await expect(stack).not.toHaveAttribute('data-nav-chrome-transition', 'true');
  await expect(
    toolbar.getByRole('heading', { level: 2, name: 'Design review' }),
  ).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Reply' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Compose' })).toHaveCount(0);
  const bottom = stack.locator(
    ':scope > [data-nav-stack-bottom]:not([data-nav-chrome-copy])',
  );
  await expect(bottom).toContainText('Received today');
  await expect(bottom.getByRole('button', { name: 'Archive' })).toBeVisible();
});
