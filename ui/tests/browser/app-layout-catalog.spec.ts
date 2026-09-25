import { expect, test } from '@playwright/test';

test('focused app-layout catalog demos expose their real controlled behavior', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto('/?component=nav-stack');
  const navDemo = page.locator('[data-demo="nav-stack"]');
  const stack = page.getByRole('region', { name: 'Project library' });
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
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) .kui-nav-stack__title',
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
      ':scope > [data-nav-stack-chrome]:not([data-nav-chrome-copy]) .kui-nav-stack__title',
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
    const narrowStack = page.getByRole('region', { name: 'Project library' });
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
