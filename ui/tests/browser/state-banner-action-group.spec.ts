import { expect, test } from '@playwright/test';

/**
 * A side-placed StateBanner action that holds several controls (a wrapping
 * Row of buttons) must never overlap the copy. On a narrow banner, whether
 * the viewport is a phone or the banner sits in a narrow container on a wide
 * screen, the action drops to its own trailing row below the copy so the
 * title keeps the banner's full width; on a roomy banner it stays beside the
 * copy.
 *
 * The regression: the action's `auto` track took the buttons' side-by-side
 * width and the `minmax(0, 1fr)` copy track ended early, so the wrapped title
 * ran underneath the buttons at 390px.
 */
const cases = [
  { name: 'wide viewport', width: 1280, sidebar: false, beside: true },
  { name: 'phone viewport', width: 390, sidebar: false, beside: false },
  {
    name: 'narrow container in a wide viewport',
    width: 1280,
    sidebar: true,
    beside: false,
  },
] as const;

for (const { name, width, sidebar, beside } of cases) {
  test(`StateBanner side action group never overlaps the copy: ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=state-banner');
    const examples = page.locator('[data-demo-state-banner-action-group]');
    await expect(examples).toHaveCount(2);
    const banner = examples
      .nth(sidebar ? 1 : 0)
      .locator('[data-component="state-banner"]');
    await banner.scrollIntoViewIfNeeded();
    await expect(banner).toBeVisible();

    const geometry = await banner.evaluate((element) => {
      const rect = (selector?: string) => {
        const box = (
          selector ? element.querySelector(selector)! : element
        ).getBoundingClientRect();
        return {
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          left: box.left,
        };
      };
      const title = element.querySelector('.kui-state-banner__copy > strong')!;
      const range = document.createRange();
      range.selectNodeContents(title);
      const lines = [...range.getClientRects()].map((line) => ({
        top: line.top,
        right: line.right,
        bottom: line.bottom,
        left: line.left,
      }));
      const buttons = [
        ...element.querySelectorAll('.kui-state-banner__action wa-button'),
      ].map((button) => {
        const box = button.getBoundingClientRect();
        return {
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          left: box.left,
        };
      });
      return {
        banner: rect(),
        copy: rect('.kui-state-banner__copy'),
        action: rect('.kui-state-banner__action'),
        lines,
        buttons,
      };
    });

    const overlaps = (
      a: { top: number; right: number; bottom: number; left: number },
      b: { top: number; right: number; bottom: number; left: number },
    ) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5;

    // The copy and the action never share any area.
    expect(overlaps(geometry.copy, geometry.action)).toBe(false);
    // Every title line is clear of every button and inside the banner.
    for (const line of geometry.lines) {
      for (const button of geometry.buttons) {
        expect(overlaps(line, button)).toBe(false);
      }
      expect(line.left).toBeGreaterThanOrEqual(geometry.banner.left);
      expect(line.right).toBeLessThanOrEqual(geometry.banner.right + 0.5);
    }
    // Both buttons stay inside the banner.
    for (const button of geometry.buttons) {
      expect(button.left).toBeGreaterThanOrEqual(geometry.banner.left);
      expect(button.right).toBeLessThanOrEqual(geometry.banner.right + 0.5);
    }

    if (beside) {
      // A roomy banner keeps the side layout.
      expect(geometry.action.left).toBeGreaterThanOrEqual(
        geometry.copy.right - 0.5,
      );
      expect(geometry.action.top).toBeLessThan(geometry.copy.bottom);
    } else {
      // A narrow banner gives the action its own trailing row.
      expect(geometry.action.top).toBeGreaterThanOrEqual(
        geometry.copy.bottom - 0.5,
      );
    }
  });
}
