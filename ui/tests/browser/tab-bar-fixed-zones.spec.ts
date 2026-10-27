import { expect, test } from '@playwright/test';

test('whole-tab snapping aligns ordinary tabs with the strip edge', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 900 });
  for (const direction of ['ltr', 'rtl']) {
    await page.goto('/?component=tab-bar');
    const bar = page.locator('[data-tab-bar-id="overflow-tab-bar"]');
    await bar.scrollIntoViewIfNeeded();
    await bar.evaluate(
      (element, dir) => element.setAttribute('dir', dir),
      direction,
    );
    const strip = bar.locator('.kui-tab-bar__tabs');
    // Exercise optional snapping on the ordinary overflow strip.
    await strip.evaluate((element) => {
      element.dataset.snapTabs = 'true';
    });
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
        const peers = [
          ...strip.querySelectorAll<HTMLElement>(':scope > .kui-tab-bar-item'),
        ];
        const stripBox = strip.getBoundingClientRect();
        const peerBoxes = peers.map((peer) => peer.getBoundingClientRect());
        const rtl = window.getComputedStyle(strip).direction === 'rtl';
        const edge = rtl ? stripBox.right : stripBox.left;
        const slivers = peerBoxes.filter(
          // Match the alignment tolerance: a 1px strip border and subpixel
          // layout can cross a tab's transparent rounded edge.
          (box) => box.left < edge - 2 && box.right > edge + 2,
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
    await expect.poll(async () => (await geometry()).slivers).toBe(0);
    await expect
      .poll(async () => Math.abs((await geometry()).scrollLeft))
      .toBeLessThan(2);
    const beforeSwipe = (await geometry()).scrollLeft;
    await strip.evaluate((element, dir) => {
      element.scrollTo({
        left: ((dir === 'rtl' ? -1 : 1) * element.scrollWidth) / 2,
        behavior: 'smooth',
      });
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

for (const direction of ['ltr', 'rtl']) {
  test(`fixed leading, trailing, and end controls stay outside scrolling tabs (${direction})`, async ({
    page,
  }, testInfo) => {
    await page.goto('/?component=tab-bar');
    const bar = page.locator('[data-tab-bar-id="raw-action-tab-bar"]');
    await bar.evaluate((el, dir) => el.setAttribute('dir', dir), direction);
    const strip = bar.locator('[data-kui-tab-list]');
    const leading = bar.getByRole('button', {
      name: 'Project Grid',
      exact: true,
    });
    for (const width of [1440, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await bar.scrollIntoViewIfNeeded();
      await expect(leading).toBeVisible();
      await expect(bar.locator('[data-pinned]')).toHaveCount(0);
      await expect(
        strip.getByRole('button', { name: 'Project Grid', exact: true }),
      ).toHaveCount(0);
      const before = await leading.boundingBox();
      await strip.evaluate(
        (el) =>
          (el.scrollLeft =
            window.getComputedStyle(el).direction === 'rtl'
              ? -el.scrollWidth
              : el.scrollWidth),
      );
      const after = await leading.boundingBox();
      expect(after!.x).toBeCloseTo(before!.x, 1);
      for (const name of ['Project Grid', 'Add Tab', 'New Ticket…']) {
        const button = bar.getByRole('button', { name, exact: true });
        await expect(button).toBeVisible();
        await button.click();
        await expect(page.locator('.catalog-log')).toHaveText(
          name === 'New Ticket…'
            ? 'Add action requested'
            : 'More actions requested',
        );
      }
      const box = await bar.boundingBox();
      const controls = await bar
        .locator(
          '.kui-tab-bar__leading, .kui-tab-bar__trailing, .kui-tab-bar__end',
        )
        .evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right };
          }),
        );
      for (const c of controls) {
        expect(c.left).toBeGreaterThanOrEqual(box!.x - 1);
        expect(c.right).toBeLessThanOrEqual(box!.x + box!.width + 1);
      }
      if (testInfo.project.name === 'chromium')
        await bar.screenshot({
          path: testInfo.outputPath(
            `KF-K6GKN3-fixed-zones-${direction}-${width}.png`,
          ),
        });
    }
  });
}
