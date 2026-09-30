import { expect, test } from '@playwright/test';

test('pinned leading tab stays in the tablist and visible while peers scroll', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=tab-bar');
    const bar = page.locator('[data-tab-bar-id="pinned-tab-bar"]');
    const strip = bar.locator('.kui-tab-bar__tabs');
    const pinned = bar.locator('.kui-app-tab[data-pinned="true"]');
    const buttons = strip.getByRole('tab');
    await expect(buttons).toHaveCount(8);
    await expect(pinned).toHaveAttribute('data-pinned', 'true');
    await expect(buttons.first()).toHaveAccessibleName('Project grid');
    await expect(buttons.first()).toHaveAttribute('aria-selected', 'true');

    const before = await strip.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(before.scrollWidth).toBeGreaterThan(before.clientWidth);
    await strip.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    const position = await bar.evaluate((element) => {
      const scroller =
        element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
      const tab = element.querySelector<HTMLElement>('[data-pinned="true"]')!;
      const tabBox = tab.getBoundingClientRect();
      const stripBox = scroller.getBoundingClientRect();
      return {
        scrollLeft: scroller.scrollLeft,
        tabLeft: tabBox.left,
        stripLeft: stripBox.left,
        background: window.getComputedStyle(tab).backgroundColor,
        position: window.getComputedStyle(tab).position,
        topmostTabId: document
          .elementFromPoint(
            tabBox.left + tabBox.width / 2,
            tabBox.top + tabBox.height / 2,
          )
          ?.closest('[data-component="app-tab"]')
          ?.getAttribute('data-tab-id'),
      };
    });
    expect(position.scrollLeft).toBeGreaterThan(0);
    expect(position.tabLeft).toBeGreaterThanOrEqual(position.stripLeft - 1);
    expect(position.tabLeft).toBeLessThanOrEqual(position.stripLeft + 4);
    expect(position.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(position.position).toBe('sticky');
    expect(position.topmostTabId).toBe('project-grid');
    await bar.screenshot({
      path: testInfo.outputPath(`pinned-tab-${width}.png`),
    });

    await buttons.last().focus();
    await buttons.last().press('Home');
    await expect(buttons.first()).toBeFocused();
    await buttons.first().press('ArrowRight');
    await expect(buttons.nth(1)).toBeFocused();
    const visiblePeer = await bar.evaluate((element) => {
      const pinnedTab = element.querySelector<HTMLElement>(
        '[data-pinned="true"]',
      )!;
      const peer = element.querySelector<HTMLElement>(
        '[data-tab-id="pinned-backlog"]',
      )!;
      return (
        peer.getBoundingClientRect().left -
        pinnedTab.getBoundingClientRect().right
      );
    });
    expect(visiblePeer).toBeGreaterThanOrEqual(-1.5);
  }
});

test('pinned tab stays at the inline start in a right-to-left strip', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'KF-MYFQAS: WebKit RTL sticky positioning',
  );
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="pinned-tab-bar"]');
  await bar.evaluate((element) => {
    const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    strip.dir = 'rtl';
    strip.scrollLeft = -strip.scrollWidth;
  });
  const geometry = await bar.evaluate((element) => {
    const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    const pinned = element.querySelector<HTMLElement>('[data-pinned="true"]')!;
    return {
      scrollLeft: strip.scrollLeft,
      pinnedRight: pinned.getBoundingClientRect().right,
      stripRight: strip.getBoundingClientRect().right,
    };
  });
  expect(geometry.scrollLeft).toBeLessThan(0);
  expect(geometry.pinnedRight).toBeLessThanOrEqual(geometry.stripRight + 1);
  expect(geometry.pinnedRight).toBeGreaterThanOrEqual(geometry.stripRight - 4);
});
