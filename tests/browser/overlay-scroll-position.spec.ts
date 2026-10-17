/**
 * Real-browser spec: repositioning a `fitHeight` surface keeps its own scroll
 * position. To honor the element's own `max-height`, `positionAnchored()`
 * briefly swaps the published `--kerf-anchor-available-height` for an
 * unbounded room around a computed-style read. WebKit lays the element out
 * for that read when a descendant is a size container (`container-type`, as a
 * kerf ui `Toolbar` sets), and that layout clamps the scroller back to the
 * top. Every scroll inside the surface repositions it, so in Safari a
 * scrolled popup jumped back to its first row, wheel scrolling included.
 */
import { expect, test } from '@playwright/test';

const RECIPE = `
body { margin: 0; font: 16px system-ui, sans-serif; }
#anchor { position: absolute; left: 40px; top: 300px; }
.scroller {
  box-sizing: border-box;
  max-height: min(calc(100dvh - 16px), var(--kerf-anchor-available-height));
  overflow: auto;
  background: white;
  border: 1px solid #888;
}
.scroller .bar { container-type: inline-size; height: 32px; }
.scroller .row { height: 40px; }
@container (min-width: 100px) { .scroller .bar span { font-weight: 600; } }
`;

const ROWS = Array.from(
  { length: 15 },
  (_, index) => `<div class="row">row ${index}</div>`,
).join('');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
  await page.addStyleTag({ content: RECIPE });
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'anchor';
    anchor.textContent = 'anchor';
    document.body.append(anchor);
  });
});

test('positionAnchored(): fitHeight keeps the scroll position of a surface holding a size container', async ({
  page,
}) => {
  const result = await page.evaluate((rows) => {
    const { positionAnchored } = (window as any).kerfOverlay;
    const anchor = document.getElementById('anchor') as HTMLElement;
    const el = document.createElement('div');
    el.className = 'scroller';
    el.innerHTML = `<div class="bar"><span>toolbar</span></div>${rows}`;
    document.body.append(el);
    positionAnchored(el, anchor, { fitHeight: true });
    el.scrollTop = 200;
    const before = el.scrollTop;
    // Do what Safari's container-query resolution does for the cap read: lay
    // the element out in the middle of it. Reading the scroll position there
    // forces that layout in any engine, and shows what it did.
    const atRead: number[] = [];
    const real = window.getComputedStyle.bind(window);
    window.getComputedStyle = ((target: Element, pseudo?: string | null) => {
      const style = real(target, pseudo);
      if (target !== el) return style;
      return new Proxy(style, {
        get: (base, key) => {
          if (key === 'maxHeight') atRead.push(el.scrollTop);
          const value = Reflect.get(base, key);
          return typeof value === 'function' ? value.bind(base) : value;
        },
      });
    }) as typeof window.getComputedStyle;
    try {
      positionAnchored(el, anchor, { fitHeight: true });
    } finally {
      window.getComputedStyle = real;
    }
    return {
      before,
      atRead,
      after: el.scrollTop,
      scrolls: el.scrollHeight > el.clientHeight,
    };
  }, ROWS);
  expect(result.before).toBe(200);
  // The interim layout kept the box, so it never clamped the scroller.
  expect(result.atRead).toEqual([200]);
  expect(result.after).toBe(200);
  expect(result.scrolls).toBe(true);
});

test('popover(): scrolling a fitHeight popover holding a size container stays where it was scrolled', async ({
  page,
}) => {
  await page.evaluate((rows) => {
    const { popover } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    const anchor = document.getElementById('anchor') as HTMLElement;
    const handle = popover(
      anchor,
      raw(`<div class="bar"><span>toolbar</span></div>${rows}`),
      { className: 'scroller', fitHeight: true, dismiss: false },
    );
    (window as any)._pop = handle;
  }, ROWS);
  const scroller = page.locator('.scroller');
  await expect(scroller).toBeVisible();
  // Real wheel input: each scroll event repositions the popover.
  await scroller.hover();
  await page.mouse.wheel(0, 200);
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(100);
  // Let the scroll events (and the repositions they trigger) settle.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(resolve),
        ),
      ),
  );
  const settled = await scroller.evaluate((el) => el.scrollTop);
  expect(settled).toBeGreaterThan(100);
  // A programmatic scroll is kept too, through the repositions it triggers.
  await scroller.evaluate((el) => {
    el.scrollTop = 150;
  });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(resolve),
        ),
      ),
  );
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(150);
});
