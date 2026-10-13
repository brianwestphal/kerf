import { expect, type Locator, type Page, test } from '@playwright/test';

// The snap mode reserves end room so the last tab can settle at the strip's
// start. That room must stay inside the scroll container: it may lengthen the
// scrollable overflow, never the strip's own box, or an adjacent trailing
// action and the end zone are pushed out of the bar (the twelve-tab drawer
// report this spec reproduces).

// Each case first settles the snap measurement on a wide bar, then narrows it:
// a drawer that opens or loses room to a sibling panel after its tabs were
// measured. `width` narrows the bar inside the wide catalog; `undefined`
// narrows the viewport to a phone and leaves the bar at its natural width.
const setUp = async (page: Page, tabCount: number) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="raw-action-tab-bar"]');
  await bar.scrollIntoViewIfNeeded();
  const strip = bar.locator('.kui-tab-bar__tabs');
  await bar.evaluate((element, tabCount) => {
    element.style.width = '1100px';
    const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    const tabs = [
      ...strip.querySelectorAll<HTMLElement>(':scope > .kui-app-tab'),
    ];
    for (const tab of tabs.slice(tabCount)) tab.remove();
    for (let index = tabs.length; index < tabCount; index += 1) {
      const clone = tabs[index % tabs.length]!.cloneNode(true) as HTMLElement;
      clone.querySelectorAll<HTMLElement>('[id]').forEach((node) => {
        node.id = `${node.id}-copy-${index}`;
      });
      clone
        .querySelectorAll<HTMLElement>('[aria-selected]')
        .forEach((node) => node.setAttribute('aria-selected', 'false'));
      strip.append(clone);
    }
    strip.dataset.snapTabs = 'true';
  }, tabCount);
  await expect(strip).toHaveAttribute('data-snap-tabs', 'true');
  await expect(strip.locator(':scope > .kui-app-tab')).toHaveCount(tabCount);
  await settle(page);
  return { bar, strip };
};

const narrow = async (page: Page, bar: Locator, width: number | undefined) => {
  if (width === undefined) {
    await page.setViewportSize({ width: 390, height: 900 });
    await bar.evaluate((element) => element.style.removeProperty('width'));
  } else
    await bar.evaluate((element, width) => {
      element.style.width = `${width}px`;
    }, width);
  await bar.scrollIntoViewIfNeeded();
  await settle(page);
};

const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let frames = 6;
        const tick = () =>
          frames-- > 0 ? window.requestAnimationFrame(tick) : resolve();
        tick();
      }),
  );

const geometry = (bar: Locator) =>
  bar.evaluate((element) => {
    const box = (selector: string) =>
      element.querySelector(selector)!.getBoundingClientRect();
    const reachable = (selector: string) => {
      const target = element.querySelector<HTMLElement>(selector)!;
      const bounds = target.getBoundingClientRect();
      const hit = document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      );
      return hit !== null && (target === hit || target.contains(hit));
    };
    const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    return {
      bar: element.getBoundingClientRect().toJSON() as DOMRect,
      strip: box('.kui-tab-bar__tabs').toJSON() as DOMRect,
      trailing: box('.kui-tab-bar__trailing').toJSON() as DOMRect,
      end: box('.kui-tab-bar__end').toJSON() as DOMRect,
      trailingReachable: reachable('.kui-tab-bar__trailing > wa-button'),
      endReachable: reachable('.kui-tab-bar__end > wa-button'),
      extra:
        Number.parseFloat(
          strip.style.getPropertyValue('--kui-tab-bar-snap-end-extra'),
        ) || 0,
      scrollWidth: strip.scrollWidth,
      clientWidth: strip.clientWidth,
    };
  });

const expectAllocated = async (bar: Locator) => {
  const measured = await geometry(bar);
  expect(measured.strip.right).toBeLessThanOrEqual(measured.trailing.left + 1);
  expect(measured.trailing.right).toBeLessThanOrEqual(measured.end.left + 1);
  expect(measured.end.right).toBeLessThanOrEqual(measured.bar.right + 1);
  expect(measured.trailingReachable).toBe(true);
  expect(measured.endReachable).toBe(true);
  return measured;
};

for (const [label, width] of [
  ['an 816px bar', 816],
  ['a 390px viewport', undefined],
] as const) {
  test(`snap end room stays inside the strip with twelve tabs in ${label}`, async ({
    page,
  }, testInfo) => {
    const { bar, strip } = await setUp(page, 12);
    expect((await geometry(bar)).extra).toBeGreaterThan(0);
    await narrow(page, bar, width);
    const measured = await expectAllocated(bar);
    expect(measured.scrollWidth).toBeGreaterThan(measured.clientWidth);
    // The measurement must be stable: the extra cannot keep feeding back into
    // a larger strip on later frames.
    await settle(page);
    expect((await geometry(bar)).extra).toBeCloseTo(measured.extra, 0);

    // An 816px strip still reserves room so the last tab can settle at the
    // strip's start; a phone strip narrower than the last tab needs none.
    if (width !== undefined) expect(measured.extra).toBeGreaterThan(0);
    if (measured.extra > 0) {
      await strip.evaluate((element) => {
        element.scrollTo({ left: element.scrollWidth, behavior: 'instant' });
      });
      await expect
        .poll(() =>
          strip.evaluate((element) => {
            const last = element
              .querySelectorAll<HTMLElement>(':scope > .kui-app-tab')
              .item(11);
            return Math.abs(
              last.getBoundingClientRect().left -
                element.getBoundingClientRect().left,
            );
          }),
        )
        .toBeLessThan(2);
    }
    await expectAllocated(bar);

    await bar.locator('.kui-tab-bar__trailing > wa-button').click();
    await bar.locator('.kui-tab-bar__end > wa-button').click();
    if (testInfo.project.name === 'chromium')
      await bar.screenshot({
        path: testInfo.outputPath(`snap-twelve-${width ?? 'phone'}.png`),
      });
  });
}

test('snap mode reserves no end room when a few tabs fit', async ({ page }) => {
  const { bar } = await setUp(page, 3);
  await narrow(page, bar, 816);
  const measured = await expectAllocated(bar);
  expect(measured.extra).toBe(0);
  expect(measured.scrollWidth).toBeLessThanOrEqual(measured.clientWidth);
});
