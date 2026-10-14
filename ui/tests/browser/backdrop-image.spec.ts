import { expect, type Locator, type Page, test } from '@playwright/test';

// The hero lags the Pane's own scroller by the subtle factor (35%) on a
// scroll-driven timeline, capped once the image block has scrolled past; it is
// static without scroll-driven animation support, under reduced motion, and
// under the document's static-effects switch.

async function heroScroller(page: Page): Promise<Locator> {
  await page.goto('/?component=backdrop-image');
  const pane = page.locator('[data-backdrop-demo="hero"]');
  await pane.scrollIntoViewIfNeeded();
  return pane.locator('.kui-pane__content');
}

/** The layer's vertical translation, in px, at each scroll offset. */
async function offsetsAt(
  scroller: Locator,
  tops: readonly number[],
): Promise<number[]> {
  const offsets: number[] = [];
  for (const top of tops) {
    offsets.push(
      await scroller.evaluate(async (element, scrollTop) => {
        element.scrollTop = scrollTop;
        await new Promise((resolve) =>
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(resolve),
          ),
        );
        const layers = element.querySelector(
          '.kui-backdrop-image__layers',
        ) as HTMLElement;
        const transform = window.getComputedStyle(layers).transform;
        return transform === 'none'
          ? 0
          : Math.round(new DOMMatrixReadOnly(transform).m42);
      }, top),
    );
  }
  return offsets;
}

test('BackdropImage parallax follows the Pane scroller', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const scroller = await heroScroller(page);
  const supported = await page.evaluate(() =>
    CSS.supports('animation-timeline: view()'),
  );
  const offsets = await offsetsAt(scroller, [0, 100, 160, 420]);
  // Without scroll-driven animations the image is static.
  expect(offsets).toEqual(supported ? [0, 35, 56, 112] : [0, 0, 0, 0]);
  // The image never uses a fixed background or a script-driven transform.
  const attachment = await scroller.evaluate(
    (element) =>
      window.getComputedStyle(
        element.querySelector('.kui-backdrop-image__media')!,
      ).backgroundAttachment,
  );
  expect(attachment).toBe('scroll');
});

test('BackdropImage is static under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const scroller = await heroScroller(page);
  expect(await offsetsAt(scroller, [0, 160, 420])).toEqual([0, 0, 0]);
});

test('BackdropImage is static under the static-effects switch', async ({
  page,
}) => {
  const scroller = await heroScroller(page);
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-kui-effects', 'static'),
  );
  expect(await offsetsAt(scroller, [0, 160, 420])).toEqual([0, 0, 0]);
});

test('BackdropImage drops the fade for increased contrast', async ({
  page,
}) => {
  await page.goto('/?component=backdrop-image');
  const hero = page.locator('[data-backdrop-demo="hero"]');
  const read = () =>
    hero.evaluate((element) => {
      const root = element.querySelector('.kui-backdrop-image')!;
      return {
        mask: window.getComputedStyle(
          root.querySelector('.kui-backdrop-image__backdrop')!,
        ).maskImage,
        overlay: window.getComputedStyle(
          root.querySelector('.kui-backdrop-image__overlay')!,
        ).backgroundColor,
        surface: window.getComputedStyle(root).backgroundColor,
      };
    });
  const normal = await read();
  expect(normal.mask).toContain('linear-gradient');
  expect(normal.overlay).toBe('rgba(0, 0, 0, 0)');
  // Firefox re-evaluates the media query only on a fresh load.
  await page.emulateMedia({ contrast: 'more' });
  await page.reload();
  const solid = await read();
  expect(solid.mask).toBe('none');
  expect(solid.overlay).toBe(solid.surface);
});
