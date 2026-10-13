import { expect, type Locator, type Page, test } from '@playwright/test';

// The snap end room is an in-flow `::after` after the last tab, so it counts
// in the strip's intrinsic and content-based sizes. Measured across engines,
// it changes nothing in an intrinsically sized ancestor. A min-content or
// max-content strip already fits its tabs, which are never shrinkable
// (`min-width: max-content`), so no room is reserved. It does enter a
// content-based flex basis, though. When the strip shares shrinking with a
// shrinkable trailing zone, the room widens the strip's share. That share
// must converge rather than feed back, and the trailing and end zones must
// stay inside the bar.

const frames = (page: Page, count: number) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let left = count;
        const tick = () =>
          left-- > 0 ? window.requestAnimationFrame(tick) : resolve();
        tick();
      }),
    count,
  );

/** Twelve tabs in the catalog's adjacent-trailing bar, inside a probe wrapper. */
const setUp = async (
  page: Page,
  snap: boolean,
  wrapperStyle: string,
  shrinkableTrailing = false,
) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="raw-action-tab-bar"]');
  await bar.scrollIntoViewIfNeeded();
  await bar.evaluate(
    (element, { snap, wrapperStyle, shrinkableTrailing }) => {
      const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
      const tabs = [
        ...strip.querySelectorAll<HTMLElement>(':scope > .kui-app-tab'),
      ];
      for (let index = tabs.length; index < 12; index += 1) {
        const clone = tabs[index % tabs.length]!.cloneNode(true) as HTMLElement;
        clone.querySelectorAll<HTMLElement>('[id]').forEach((node) => {
          node.id = `${node.id}-copy-${index}`;
        });
        clone
          .querySelectorAll<HTMLElement>('[aria-selected]')
          .forEach((node) => node.setAttribute('aria-selected', 'false'));
        strip.append(clone);
      }
      strip.dataset.snapTabs = String(snap);
      const wrapper = document.createElement('div');
      wrapper.style.cssText = wrapperStyle;
      element.before(wrapper);
      wrapper.append(element);
      if (shrinkableTrailing) {
        // The public trailing-flex token, with trailing content that can
        // shrink: the strip then shares shrinking with the trailing zone.
        element.style.setProperty('--kui-tab-bar-trailing-flex', '0 1 auto');
        const trailing = element.querySelector<HTMLElement>(
          '.kui-tab-bar__trailing',
        )!;
        trailing.style.minWidth = '0';
        const field = document.createElement('div');
        field.style.cssText = 'flex: 0 1 400px; min-width: 0; height: 20px';
        trailing.append(field);
      }
    },
    { snap, wrapperStyle, shrinkableTrailing },
  );
  await frames(page, 12);
  return bar;
};

const geometry = (bar: Locator) =>
  bar.evaluate((element) => {
    const strip = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    const box = (selector: string) =>
      element.querySelector(selector)!.getBoundingClientRect();
    return {
      bar: element.getBoundingClientRect().width,
      strip: strip.getBoundingClientRect().width,
      stripRight: box('.kui-tab-bar__tabs').right,
      trailingLeft: box('.kui-tab-bar__trailing').left,
      endRight: box('.kui-tab-bar__end').right,
      barRight: element.getBoundingClientRect().right,
      overflow: strip.scrollWidth - strip.clientWidth,
      extra:
        Number.parseFloat(
          strip.style.getPropertyValue('--kui-tab-bar-snap-end-extra'),
        ) || 0,
    };
  });

for (const wrapperStyle of ['width: max-content', 'width: min-content']) {
  test(`snap reserves no room and adds no width under ${wrapperStyle}`, async ({
    page,
  }) => {
    const plain = await geometry(await setUp(page, false, wrapperStyle));
    const snapped = await geometry(await setUp(page, true, wrapperStyle));
    expect(snapped.extra).toBe(0);
    expect(snapped.overflow).toBeLessThanOrEqual(0);
    expect(Math.abs(snapped.bar - plain.bar)).toBeLessThanOrEqual(1);
  });
}

test('snap room in a shared-shrink strip converges and keeps the zones inside the bar', async ({
  page,
}) => {
  const bar = await setUp(page, true, 'width: 700px', true);
  const settled = await geometry(bar);
  expect(settled.extra).toBeGreaterThan(0);
  await frames(page, 12);
  const later = await geometry(bar);
  expect(later.extra).toBeCloseTo(settled.extra, 0);
  expect(later.strip).toBeCloseTo(settled.strip, 0);
  expect(later.bar).toBeCloseTo(700, 0);
  expect(later.stripRight).toBeLessThanOrEqual(later.trailingLeft + 1);
  expect(later.endRight).toBeLessThanOrEqual(later.barRight + 1);
});
