import { expect, test } from '@playwright/test';

/**
 * A segmented TabBar's tabs sit inside a pill track. With fill allocation the
 * first and last tabs reach the track's ends, so their outer corners must be
 * concentric with it: inset from the track's ends by the same distance as from
 * its top and bottom, and rounded to the track's radius less that inset. A
 * segment-radius corner there left the track's curve visibly unmatched.
 */
test('a filled segmented TabBar ends its strip concentric with the pill track', async ({
  page,
}) => {
  await page.goto('/?component=tab-bar');
  const bar = page.locator('[data-tab-bar-id="segmented-tab-bar"]');
  await bar.scrollIntoViewIfNeeded();
  const geometry = await bar.evaluate((element) => {
    const track = element.querySelector<HTMLElement>('.kui-tab-bar__tabs')!;
    const tabs = [
      ...track.querySelectorAll<HTMLElement>(
        ':scope > [data-component="app-tab"]',
      ),
    ];
    const first = tabs[0]!;
    const last = tabs[tabs.length - 1]!;
    const trackRect = track.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const radius = (tab: HTMLElement, corner: string) =>
      Math.min(
        parseFloat(window.getComputedStyle(tab).getPropertyValue(corner)),
        tab.getBoundingClientRect().height / 2,
      );
    return {
      trackRadius: Math.min(
        parseFloat(window.getComputedStyle(track).borderTopLeftRadius),
        trackRect.height / 2,
      ),
      topInset: firstRect.top - trackRect.top,
      bottomInset: trackRect.bottom - firstRect.bottom,
      startInset: firstRect.left - trackRect.left,
      endInset: trackRect.right - lastRect.right,
      firstOuter: radius(first, 'border-top-left-radius'),
      firstOuterBottom: radius(first, 'border-bottom-left-radius'),
      lastOuter: radius(last, 'border-top-right-radius'),
      lastOuterBottom: radius(last, 'border-bottom-right-radius'),
      firstInner: radius(first, 'border-top-right-radius'),
      lastInner: radius(last, 'border-top-left-radius'),
    };
  });

  expect(Math.abs(geometry.topInset - geometry.bottomInset)).toBeLessThan(0.5);
  expect(Math.abs(geometry.startInset - geometry.topInset)).toBeLessThan(0.5);
  expect(Math.abs(geometry.endInset - geometry.topInset)).toBeLessThan(0.5);
  const concentric = geometry.trackRadius - geometry.topInset;
  for (const corner of [
    geometry.firstOuter,
    geometry.firstOuterBottom,
    geometry.lastOuter,
    geometry.lastOuterBottom,
  ]) {
    expect(Math.abs(corner - concentric)).toBeLessThan(0.5);
  }
  // The corners between tabs keep the smaller segment radius.
  expect(geometry.firstInner).toBeLessThan(concentric / 2);
  expect(geometry.lastInner).toBeLessThan(concentric / 2);
});
