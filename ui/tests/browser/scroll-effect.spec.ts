import { expect, type Locator, type Page, test } from '@playwright/test';

// ScrollEffect runs each preset on the wrapper's own view timeline (only
// transform and opacity animate) and is static, with its content at rest,
// in every fallback the shared scroll-effect layer owns.

type Preset = 'reveal' | 'fade' | 'scale' | 'parallax' | 'dim';

interface Sample {
  /** The layer's opacity, or the dim overlay's, to two decimals. */
  opacity: number;
  /** The layer's transform scale, to two decimals. */
  scale: number;
  /** The layer's vertical translation, in px. */
  offset: number;
}

async function playground(page: Page, preset: Preset): Promise<Locator> {
  await page.goto('/?component=scroll-effect');
  const select = page.locator('kui-select[name="scroll-effect-preset"]');
  await select.evaluate((element, value) => {
    (element as HTMLElement & { value: string }).value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, preset);
  const pane = page.locator('[data-scroll-effect-demo="playground"]');
  await expect(
    pane.locator('[data-scroll-effect-target] [data-kui-scroll-effect]'),
  ).toHaveCount(1);
  await pane.scrollIntoViewIfNeeded();
  return pane.locator('.kui-pane__content');
}

/**
 * Scroll so the target's top sits at `fraction` of the scroller's height from
 * its top (1 = just entering at the bottom, 0 = at the top edge, negative =
 * partly scrolled out), then sample the animated element.
 */
async function sampleAt(
  scroller: Locator,
  fraction: number,
  preset: Preset,
): Promise<Sample> {
  return scroller.evaluate(
    async (element, [where, kind]) => {
      const target = element.querySelector<HTMLElement>(
        '[data-scroll-effect-target]',
      )!;
      const top =
        target.getBoundingClientRect().top -
        element.getBoundingClientRect().top +
        element.scrollTop;
      element.scrollTop = top - Number(where) * element.clientHeight;
      await new Promise((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(resolve),
        ),
      );
      const layer = target.querySelector<HTMLElement>(
        kind === 'dim' ? '.kui-scroll-effect__dim' : '[data-kui-scroll-effect]',
      )!;
      const style = window.getComputedStyle(layer);
      const matrix =
        style.transform === 'none'
          ? new DOMMatrixReadOnly()
          : new DOMMatrixReadOnly(style.transform);
      const round = (value: number) => Math.round(value * 100) / 100;
      return {
        opacity: round(Number(style.opacity)),
        scale: round(matrix.a),
        offset: Math.round(matrix.m42),
      };
    },
    [fraction, preset] as const,
  );
}

const supported = (page: Page) =>
  page.evaluate(() => CSS.supports('animation-timeline: view()'));

test.describe('ScrollEffect presets animate on the view timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
  });

  test('reveal fades in over entry', async ({ page }) => {
    const scroller = await playground(page, 'reveal');
    test.skip(!(await supported(page)), 'no scroll-driven animations');
    const start = await sampleAt(scroller, 1.02, 'reveal');
    const middle = await sampleAt(scroller, 0.95, 'reveal');
    const end = await sampleAt(scroller, 0.5, 'reveal');
    expect(start.opacity).toBe(0);
    expect(middle.opacity).toBeGreaterThan(0);
    expect(middle.opacity).toBeLessThan(1);
    expect(end.opacity).toBe(1);
  });

  test('fade fades out over exit', async ({ page }) => {
    const scroller = await playground(page, 'fade');
    test.skip(!(await supported(page)), 'no scroll-driven animations');
    expect((await sampleAt(scroller, 0.5, 'fade')).opacity).toBe(1);
    const middle = await sampleAt(scroller, -0.03, 'fade');
    expect(middle.opacity).toBeGreaterThan(0);
    expect(middle.opacity).toBeLessThan(1);
  });

  test('scale grows from its start factor over entry', async ({ page }) => {
    const scroller = await playground(page, 'scale');
    test.skip(!(await supported(page)), 'no scroll-driven animations');
    expect((await sampleAt(scroller, 1.02, 'scale')).scale).toBe(0.85);
    const middle = await sampleAt(scroller, 0.95, 'scale');
    expect(middle.scale).toBeGreaterThan(0.85);
    expect(middle.scale).toBeLessThan(1);
    expect((await sampleAt(scroller, 0.5, 'scale')).scale).toBe(1);
  });

  test('parallax lags the scroll over exit', async ({ page }) => {
    const scroller = await playground(page, 'parallax');
    test.skip(!(await supported(page)), 'no scroll-driven animations');
    expect((await sampleAt(scroller, 0.5, 'parallax')).offset).toBe(0);
    const leaving = await sampleAt(scroller, -0.05, 'parallax');
    expect(leaving.offset).toBeGreaterThan(0);
  });

  test('dim darkens over exit toward its peak', async ({ page }) => {
    const scroller = await playground(page, 'dim');
    test.skip(!(await supported(page)), 'no scroll-driven animations');
    expect((await sampleAt(scroller, 0.5, 'dim')).opacity).toBe(0);
    const leaving = await sampleAt(scroller, -0.05, 'dim');
    expect(leaving.opacity).toBeGreaterThan(0);
    expect(leaving.opacity).toBeLessThanOrEqual(0.6);
  });

  test('only transform and opacity animate', async ({ page }) => {
    await page.goto('/?component=scroll-effect');
    test.skip(!(await supported(page)), 'no scroll-driven animations');
    const keys = await page
      .locator('[data-scroll-effect-demo="feed"]')
      .evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .flatMap((animation) =>
            (animation.effect as KeyframeEffect)
              .getKeyframes()
              .flatMap((frame) => Object.keys(frame)),
          )
          .filter(
            (key) =>
              !['offset', 'easing', 'composite', 'computedOffset'].includes(
                key,
              ),
          ),
      );
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys)).toEqual(new Set(['opacity', 'transform']));
  });
});

const AT_REST: Sample = { opacity: 1, scale: 1, offset: 0 };
const fallbacks: [string, (page: Page) => Promise<void>][] = [
  ['reduced motion', (page) => page.emulateMedia({ reducedMotion: 'reduce' })],
  ['increased contrast', (page) => page.emulateMedia({ contrast: 'more' })],
  ['forced colors', (page) => page.emulateMedia({ forcedColors: 'active' })],
];

test.describe('ScrollEffect is static in every fallback', () => {
  for (const [name, apply] of fallbacks)
    test(`under ${name}`, async ({ page }) => {
      await apply(page);
      for (const preset of ['reveal', 'scale', 'parallax', 'dim'] as const) {
        const scroller = await playground(page, preset);
        for (const where of [1.02, 0.5, -0.05])
          expect(await sampleAt(scroller, where, preset)).toEqual(
            preset === 'dim' ? { ...AT_REST, opacity: 0 } : AT_REST,
          );
      }
    });

  test('without scroll-driven animation support', async ({ page }) => {
    await page.goto('/?component=scroll-effect');
    test.skip(await supported(page), 'this engine has scroll timelines');
    for (const preset of ['reveal', 'scale', 'parallax', 'dim'] as const) {
      const scroller = await playground(page, preset);
      for (const where of [1.02, 0.5, -0.05])
        expect(await sampleAt(scroller, where, preset)).toEqual(
          preset === 'dim' ? { ...AT_REST, opacity: 0 } : AT_REST,
        );
    }
  });

  test('under the static-effects switch', async ({ page }) => {
    for (const preset of ['reveal', 'scale', 'parallax', 'dim'] as const) {
      const scroller = await playground(page, preset);
      await page.evaluate(() =>
        document.documentElement.setAttribute('data-kui-effects', 'static'),
      );
      for (const where of [1.02, 0.5, -0.05])
        expect(await sampleAt(scroller, where, preset)).toEqual(
          preset === 'dim' ? { ...AT_REST, opacity: 0 } : AT_REST,
        );
    }
  });
});

test('the Reset control returns the playground to reveal and fade', async ({
  page,
}) => {
  await playground(page, 'dim');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(
    page.locator('[data-scroll-effect-target] [data-kui-scroll-effect]'),
  ).toHaveCount(2);
});
