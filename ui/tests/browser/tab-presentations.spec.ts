import { expect, test } from '@playwright/test';

test('renders typed tab presentations without consumer descendant CSS', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=tab-bar');
  const demo = page.locator('[data-demo="tab-bar"]');

  // Inspector presentation: compact rectangular tabs that keep their
  // intrinsic width next to an adjacent trailing action.
  const inspector = demo.locator('[data-tab-bar-id="inspector-tab-bar"]');
  await expect(inspector).toHaveAttribute('data-allocation', 'intrinsic');
  await expect(inspector).toHaveAttribute(
    'data-trailing-placement',
    'adjacent',
  );
  const inspectorTabs = inspector.locator('[data-component="app-tab"]');
  await expect(inspectorTabs).toHaveCount(5);
  const tabGeometry = (tab: typeof inspectorTabs) =>
    tab.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      flexGrow: window.getComputedStyle(element).flexGrow,
      radius: window.getComputedStyle(element).borderRadius,
      labelWidth: element
        .querySelector('.kui-app-tab__name')!
        .getBoundingClientRect().width,
    }));
  const geometry = await tabGeometry(inspectorTabs.first());
  expect(geometry.height).toBe(32);
  expect(geometry.flexGrow).toBe('0');
  expect(geometry.labelWidth).toBeLessThanOrEqual(120);
  expect(geometry.radius).not.toBe('9999px');
  expect(
    await inspectorTabs
      .first()
      .locator('.kui-app-tab__name')
      .evaluate((element) => window.getComputedStyle(element).textOverflow),
  ).toBe('ellipsis');

  // Fill allocation stretches every tab across the bar with no consumer CSS.
  const fill = demo.locator('[data-tab-bar-id="segmented-tab-bar"]');
  await expect(fill).toHaveAttribute('data-allocation', 'fill');
  const fillTabs = fill.locator('[data-component="app-tab"]');
  await expect(fillTabs).toHaveCount(2);
  const fillGeometry = await tabGeometry(fillTabs.first());
  expect(fillGeometry.height).toBe(32);
  expect(fillGeometry.flexGrow).toBe('1');
  expect(fillGeometry.labelWidth).toBeLessThanOrEqual(120);

  await page.goto('/?component=tabs');
  const appTabDemo = page.locator('[data-demo="tabs"]');
  const iconTab = appTabDemo.locator(
    '[data-component="app-tab"][data-tab-id="status"]',
  );
  await expect(iconTab.getByRole('tab', { name: 'Status' })).toBeVisible();
  expect(
    await iconTab.evaluate((element) => element.getBoundingClientRect().width),
  ).toBe(32);
  await appTabDemo.screenshot({
    path: testInfo.outputPath('tab-presentations.png'),
  });
});

test('a pending AppTab keeps its name, stays selectable and undimmed, and swaps in place', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=tabs');
  const bar = page.locator('[data-tab-bar-id="app-tab-pending"]');
  const pending = bar.locator(
    '[data-component="app-tab"][data-tab-id="alpha"]',
  );
  await expect(pending).toHaveAttribute('data-pending', 'true');
  await expect(pending).toHaveAttribute('aria-busy', 'true');

  // The label is visible and names the tab, without the spinner's label.
  const tab = pending.getByRole('tab', { name: 'alpha', exact: true });
  // Selectable while opening, so the application can show its panel's
  // placeholders; never dimmed by Web Awesome's native button:disabled.
  await expect(tab).toBeEnabled();
  await expect(tab).toHaveCSS('opacity', '1');
  await expect(pending).toHaveCSS('opacity', '1');
  await expect(tab).toHaveAttribute('data-action', 'select-tab');
  await expect(pending).toHaveAttribute('draggable', 'false');
  await expect(pending.locator('.kui-app-tab__name')).toHaveText('alpha');
  const colors = await pending.evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--kui-color-text-quiet)';
    element.append(probe);
    const quiet = window.getComputedStyle(probe).color;
    probe.remove();
    return {
      name: window.getComputedStyle(
        element.querySelector('.kui-app-tab__name')!,
      ).color,
      quiet,
    };
  });
  expect(colors.name).toBe(colors.quiet);
  await expect(
    pending.locator('.kui-app-tab__trailing .kui-loading-spinner'),
  ).toBeVisible();

  // Hovering never reveals the disabled close button.
  await pending.hover();
  await expect(pending.locator('.kui-app-tab__close')).toBeHidden();

  // Swapping to the live tab in place keeps the pill's geometry.
  const pendingBox = await pending.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const liveBox = await pending.evaluate((element) => {
    element.removeAttribute('data-pending');
    element.removeAttribute('aria-busy');
    element.querySelector('.kui-app-tab__trailing')!.replaceChildren();
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(liveBox.height).toBe(pendingBox.height);
  expect(Math.abs(liveBox.width - pendingBox.width)).toBeLessThanOrEqual(0.5);
});

test('tab strips scroll only horizontally and grow to fit taller tabs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=tab-bar');
  const strips = page.locator('[data-demo="tab-bar"] .kui-tab-bar__tabs');
  await expect(strips.first()).toBeVisible();
  const measure = () =>
    strips.evaluateAll((elements) =>
      elements.map((element) => {
        const style = window.getComputedStyle(element);
        return {
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          height: element.getBoundingClientRect().height,
          verticalExcess: element.scrollHeight - element.clientHeight,
        };
      }),
    );
  const before = await measure();
  for (const strip of before) {
    expect(strip.overflowX).toBe('auto');
    expect(strip.overflowY).toBe('hidden');
    expect(strip.verticalExcess).toBeLessThanOrEqual(0);
  }
  // The default strip keeps its toolbar-group height.
  expect(before.map((strip) => strip.height)).toContain(44);

  // Consumer padding makes the strip taller rather than a vertical scroller.
  await strips.evaluateAll((elements) => {
    for (const element of elements) element.style.paddingBlock = '6px';
  });
  const padded = await measure();
  padded.forEach((strip, index) => {
    expect(strip.height).toBeGreaterThan(before[index]!.height);
    expect(strip.verticalExcess).toBeLessThanOrEqual(0);
  });
});
