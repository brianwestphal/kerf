import { expect, type Locator, type Page, test } from '@playwright/test';

// The hero lags the Pane's own scroller by the subtle factor (35%) on a
// scroll-driven timeline, and its statically blurred copy and dim layer fade
// in over the same range, capped once the image block has scrolled past. All
// of it is static (and sharp) without scroll-driven animation support, under
// reduced motion, and under the document's static-effects switch.

async function heroScroller(page: Page): Promise<Locator> {
  await page.goto('/?component=backdrop-image');
  const pane = page.locator('[data-backdrop-demo="hero"]');
  await pane.scrollIntoViewIfNeeded();
  return pane.locator('.kui-pane__content');
}

interface Sample {
  /** The moving layer's vertical translation, in px. */
  offset: number;
  /** The blurred copy's opacity, to two decimals. */
  blur: number;
  /** The dim layer's opacity, to two decimals. */
  dim: number;
  /** The blurred copy's filter, which must never change. */
  filter: string;
}

async function samplesAt(
  scroller: Locator,
  tops: readonly number[],
): Promise<Sample[]> {
  const samples: Sample[] = [];
  for (const top of tops) {
    samples.push(
      await scroller.evaluate(async (element, scrollTop) => {
        element.scrollTop = scrollTop;
        await new Promise((resolve) =>
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(resolve),
          ),
        );
        const style = (selector: string) =>
          window.getComputedStyle(element.querySelector(selector)!);
        const transform = style('.kui-backdrop-image__layers').transform;
        const round = (value: string) => Math.round(Number(value) * 100) / 100;
        return {
          offset:
            transform === 'none'
              ? 0
              : Math.round(new DOMMatrixReadOnly(transform).m42),
          blur: round(style('.kui-backdrop-image__blurred').opacity),
          dim: round(style('.kui-backdrop-image__dim').opacity),
          filter: style('.kui-backdrop-image__blurred').filter,
        };
      }, top),
    );
  }
  return samples;
}

test('BackdropImage parallax and blur follow the Pane scroller', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const scroller = await heroScroller(page);
  const supported = await page.evaluate(() =>
    CSS.supports('animation-timeline: view()'),
  );
  const samples = await samplesAt(scroller, [0, 100, 160, 420]);
  // Without scroll-driven animations the image is static and sharp.
  expect(samples.map(({ offset }) => offset)).toEqual(
    supported ? [0, 35, 56, 112] : [0, 0, 0, 0],
  );
  // The blurred copy and dim layer ramp linearly over the 320px block.
  expect(samples.map(({ blur }) => blur)).toEqual(
    supported ? [0, 0.31, 0.5, 1] : [0, 0, 0, 0],
  );
  expect(samples.map(({ dim }) => dim)).toEqual(
    supported ? [0, 0.31, 0.5, 1] : [0, 0, 0, 0],
  );
  // The blur is set once (24px default, in rem) and never animates.
  expect(new Set(samples.map(({ filter }) => filter))).toEqual(
    new Set(['blur(24px)']),
  );
  expect(
    await scroller.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .flatMap((animation) =>
          (animation.effect as KeyframeEffect)
            .getKeyframes()
            .flatMap((frame) => Object.keys(frame)),
        )
        .filter(
          (key) =>
            !['offset', 'easing', 'composite', 'computedOffset'].includes(key),
        )
        .sort(),
    ),
  ).toEqual(
    supported
      ? ['opacity', 'opacity', 'opacity', 'opacity', 'transform', 'transform']
      : [],
  );
  // The image never uses a fixed background or a script-driven transform.
  const attachment = await scroller.evaluate(
    (element) =>
      window.getComputedStyle(
        element.querySelector('.kui-backdrop-image__media')!,
      ).backgroundAttachment,
  );
  expect(attachment).toBe('scroll');
});

const STATIC: Sample[] = [0, 160, 420].map(() => ({
  offset: 0,
  blur: 0,
  dim: 0,
  filter: 'blur(24px)',
}));

test('BackdropImage is static and sharp under reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const scroller = await heroScroller(page);
  expect(await samplesAt(scroller, [0, 160, 420])).toEqual(STATIC);
});

test('BackdropImage is static and sharp under the static-effects switch', async ({
  page,
}) => {
  const scroller = await heroScroller(page);
  await page.evaluate(() =>
    document.documentElement.setAttribute('data-kui-effects', 'static'),
  );
  expect(await samplesAt(scroller, [0, 160, 420])).toEqual(STATIC);
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
