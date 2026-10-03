import { expect, test } from '@playwright/test';

test('whole-tab snapping keeps scrolling peers clear of the pinned tab', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  for (const direction of ['ltr', 'rtl']) {
    await page.goto('/?component=tab-bar');
    const bar = page.locator('[data-tab-bar-id="pinned-tab-bar"]');
    await bar.scrollIntoViewIfNeeded();
    await bar.evaluate(
      (element, dir) => element.setAttribute('dir', dir),
      direction,
    );
    const strip = bar.locator('.kui-tab-bar__tabs');
    await expect(strip).toHaveAttribute('data-snap-tabs', 'true');
    const tabs = strip.getByRole('tab');
    const last = tabs.last();
    await bar.evaluate((element) => {
      const buttons = element.querySelectorAll<HTMLElement>('[role="tab"]');
      buttons.forEach((button, index) =>
        button.setAttribute(
          'aria-selected',
          String(index === buttons.length - 1),
        ),
      );
    });
    const geometry = () =>
      bar.evaluate((element) => {
        const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
        const pinned = element.querySelector<HTMLElement>(
          '[data-pinned="true"]',
        )!;
        const peers = [
          ...strip.querySelectorAll<HTMLElement>(
            ':scope > .kui-app-tab:not([data-pinned="true"])',
          ),
        ];
        const pinnedBox = pinned.getBoundingClientRect();
        const peerBoxes = peers.map((peer) => peer.getBoundingClientRect());
        const rtl = window.getComputedStyle(strip).direction === 'rtl';
        const edge = rtl ? pinnedBox.left : pinnedBox.right;
        const slivers = peerBoxes.filter(
          (box) => box.left < edge - 1 && box.right > edge + 1,
        );
        return {
          aligned: Math.abs(
            rtl
              ? peerBoxes.at(-1)!.right - edge
              : peerBoxes.at(-1)!.left - edge,
          ),
          leadingAlignment: Math.min(
            ...peerBoxes.map((box) =>
              Math.abs(rtl ? box.right - edge : box.left - edge),
            ),
          ),
          slivers: slivers.length,
          scrollLeft: strip.scrollLeft,
          scrollWidth: strip.scrollWidth,
          clientWidth: strip.clientWidth,
        };
      });
    expect((await geometry()).scrollWidth).toBeGreaterThan(
      (await geometry()).clientWidth,
    );
    await expect.poll(async () => (await geometry()).aligned).toBeLessThan(2);
    expect((await geometry()).slivers).toBe(0);
    await bar.screenshot({
      path: testInfo.outputPath(`snap-last-${direction}.png`),
    });
    await tabs.first().evaluate((button) => {
      const strip = button.closest<HTMLElement>('[data-kui-tab-list]')!;
      strip
        .querySelectorAll<HTMLElement>('[role="tab"]')
        .forEach((tab) =>
          tab.setAttribute('aria-selected', String(tab === button)),
        );
    });
    expect((await geometry()).slivers).toBe(0);
    const beforeSwipe = (await geometry()).scrollLeft;
    await strip.evaluate((element, dir) => {
      element.scrollBy({ left: dir === 'rtl' ? 45 : -45, behavior: 'smooth' });
    }, direction);
    await expect
      .poll(async () => (await geometry()).scrollLeft, { timeout: 3000 })
      .not.toBe(beforeSwipe);
    await expect
      .poll(async () => (await geometry()).leadingAlignment)
      .toBeLessThan(2);
    await expect.poll(async () => (await geometry()).slivers).toBe(0);
    await expect(last).toBeVisible();
  }
});

test('pinned leading tab stays in the tablist and visible while peers scroll', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=tab-bar');
    const bar = page.locator('[data-tab-bar-id="pinned-tab-bar"]');
    await bar.scrollIntoViewIfNeeded();
    const strip = bar.locator('.kui-tab-bar__tabs');
    const pinned = bar.locator('.kui-app-tab[data-pinned="true"]');
    const buttons = strip.getByRole('tab');
    await expect(buttons).toHaveCount(9);
    await expect(pinned).toHaveAttribute('data-pinned', 'true');
    await expect(buttons.first()).toHaveAccessibleName('Project grid');
    await expect(buttons.first()).toHaveAttribute('aria-selected', 'true');

    const before = await strip.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(before.scrollWidth).toBeGreaterThan(before.clientWidth);
    for (const offset of [0, 32, 64, 96, 128, before.scrollWidth]) {
      await strip.evaluate((element, next) => {
        element.scrollLeft = next;
      }, offset);
      const edgeTabId = await bar.evaluate((element) => {
        const tab = element.querySelector<HTMLElement>('[data-pinned="true"]')!;
        const box = tab.getBoundingClientRect();
        return document
          .elementFromPoint(box.left + 2, box.top + box.height / 2)
          ?.closest('[data-tab-id]')
          ?.getAttribute('data-tab-id');
      });
      expect(edgeTabId).toBe('project-grid');
      if (offset === 64)
        await bar.screenshot({
          path: testInfo.outputPath(`pinned-offset-64-${width}.png`),
        });
    }
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
        backingStart:
          tabBox.left +
          Number.parseFloat(window.getComputedStyle(tab, '::before').left),
        radius: window.getComputedStyle(tab).borderTopRightRadius,
        backingRadius: window.getComputedStyle(tab, '::before')
          .borderTopRightRadius,
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
    expect(position.tabLeft).toBeLessThanOrEqual(position.stripLeft + 6);
    expect(position.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(position.position).toBe('sticky');
    expect(position.backingStart).toBeLessThanOrEqual(position.stripLeft + 1);
    expect(position.backingRadius).toBe(position.radius);
    expect(position.topmostTabId).toBe('project-grid');
    await expect(strip).toHaveAttribute('data-scroll-overflow', /l/);
    const divider = await bar.evaluate((element) => {
      const tab = element.querySelector<HTMLElement>('[data-pinned="true"]')!;
      const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
      const tabBox = tab.getBoundingClientRect();
      const backing = window.getComputedStyle(tab, '::before');
      return {
        position: tabBox.right - Number.parseFloat(backing.right),
        tabRight: tabBox.right,
        color: backing.borderRightColor,
        stripColor: window.getComputedStyle(strip).borderLeftColor,
        barColor: window.getComputedStyle(element, '::before').backgroundColor,
      };
    });
    expect(divider.position).toBeGreaterThanOrEqual(divider.tabRight);
    expect(divider.position).toBeLessThanOrEqual(divider.tabRight + 2);
    expect(divider.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(divider.stripColor).toBe('rgba(0, 0, 0, 0)');
    expect(divider.barColor).toBe('rgba(0, 0, 0, 0)');
    await bar.screenshot({
      path: testInfo.outputPath(`pinned-tab-${width}.png`),
    });

    await buttons.last().focus();
    await buttons.last().press('Home');
    await expect(buttons.first()).toBeFocused();
    await buttons.first().press('ArrowRight');
    await expect(buttons.nth(1)).toBeFocused();
    // WebKit can finish the strip's snap after the keyboard event resolves.
    await expect
      .poll(async () =>
        bar.evaluate((element) => {
          const pinnedTab = element.querySelector<HTMLElement>(
            '[data-pinned="true"]',
          )!;
          const peer = element.querySelector<HTMLElement>(
            '[data-tab-id="pinned-claude-1"]',
          )!;
          return (
            peer.getBoundingClientRect().left -
            pinnedTab.getBoundingClientRect().right
          );
        }),
      )
      .toBeGreaterThanOrEqual(-1.5);
  }
});

test('pinned tab stays at the inline start in a right-to-left strip', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="pinned-tab-bar"]');
  await bar.scrollIntoViewIfNeeded();
  await bar.evaluate((element) => {
    element.setAttribute('dir', 'rtl');
  });
  const maxScroll = await bar.evaluate((element) => {
    const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    return strip.scrollWidth - strip.clientWidth;
  });
  for (const offset of [0, -maxScroll / 2, -maxScroll, 0, -maxScroll]) {
    await bar.evaluate((element, next) => {
      element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!.scrollLeft =
        next;
    }, offset);
    await expect
      .poll(() =>
        bar.evaluate((element) => {
          const strip =
            element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
          const pinned = element.querySelector<HTMLElement>(
            '[data-pinned="true"]',
          )!;
          return Math.abs(
            pinned.getBoundingClientRect().right -
              (strip.getBoundingClientRect().right - 5),
          );
        }),
      )
      .toBeLessThanOrEqual(2);
    const edgeTabId = await bar.evaluate((element) => {
      const pinned = element.querySelector<HTMLElement>(
        '[data-pinned="true"]',
      )!;
      const box = pinned.getBoundingClientRect();
      return document
        .elementFromPoint(box.right - 2, box.top + box.height / 2)
        ?.closest('[data-tab-id]')
        ?.getAttribute('data-tab-id');
    });
    expect(edgeTabId).toBe('project-grid');
  }
  const geometry = await bar.evaluate((element) => {
    const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    const pinned = element.querySelector<HTMLElement>('[data-pinned="true"]')!;
    return {
      scrollLeft: strip.scrollLeft,
      pinnedRight: pinned.getBoundingClientRect().right,
      stripRight: strip.getBoundingClientRect().right,
      backingEnd:
        pinned.getBoundingClientRect().right -
        Number.parseFloat(window.getComputedStyle(pinned, '::before').right),
      radius: window.getComputedStyle(pinned).borderTopLeftRadius,
      backingRadius: window.getComputedStyle(pinned, '::before')
        .borderTopLeftRadius,
    };
  });
  expect(geometry.scrollLeft).toBeLessThan(0);
  expect(geometry.pinnedRight).toBeLessThanOrEqual(geometry.stripRight + 1);
  expect(geometry.pinnedRight).toBeGreaterThanOrEqual(geometry.stripRight - 6);
  expect(geometry.backingEnd).toBeGreaterThanOrEqual(geometry.stripRight - 1);
  expect(geometry.backingRadius).toBe(geometry.radius);
  const strip = bar.locator('.kui-tab-bar__tabs');
  await expect(strip).toHaveAttribute('data-scroll-overflow', /r/);
  const divider = await bar.evaluate((element) => {
    const tab = element.querySelector<HTMLElement>('[data-pinned="true"]')!;
    const backing = window.getComputedStyle(tab, '::before');
    return {
      color: backing.borderLeftColor,
      stripColor: window.getComputedStyle(
        element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!,
      ).borderRightColor,
      barColor: window.getComputedStyle(element, '::before').backgroundColor,
    };
  });
  expect(divider.color).not.toBe('rgba(0, 0, 0, 0)');
  expect(divider.stripColor).toBe('rgba(0, 0, 0, 0)');
  expect(divider.barColor).toBe('rgba(0, 0, 0, 0)');
  await bar.screenshot({ path: testInfo.outputPath('pinned-rtl-390.png') });
  const buttons = bar.getByRole('tab');
  // A controlled render may replace the inline correction while keeping the
  // same tab node. Selection mutation must restore the pinned edge.
  await bar.evaluate((element) => {
    const pinned = element.querySelector<HTMLElement>('[data-pinned="true"]')!;
    pinned.style.translate = '';
    const button = pinned.querySelector<HTMLButtonElement>('[role="tab"]')!;
    button.setAttribute('aria-selected', 'false');
    button.setAttribute('aria-selected', 'true');
  });
  await expect
    .poll(() =>
      bar.evaluate((element) => {
        const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
        const pinned = element.querySelector<HTMLElement>(
          '[data-pinned="true"]',
        )!;
        return Math.abs(
          pinned.getBoundingClientRect().right -
            (strip.getBoundingClientRect().right - 5),
        );
      }),
    )
    .toBeLessThanOrEqual(2);
  await buttons.last().focus();
  await buttons.last().press('Home');
  await expect(buttons.first()).toBeFocused();
  await buttons.first().press('ArrowRight');
  await expect(buttons.nth(1)).toBeFocused();
});
