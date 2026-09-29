import { resolve } from 'node:path';

import { expect, type Locator, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// Scroll dividers: the line between pinned chrome and scrolling content shows
// only while content is scrolled away from that edge — the near edge hides at
// the scroll start, the far edge at the scroll end and whenever nothing
// overflows. wireScrollDividers reports the state; each component draws its
// own line, and no state moves the chrome, the content, or a tab.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/scroll-dividers.tsx')],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page, width = 1100): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css)
    throw new Error('Scroll-divider fixture emitted no JS');
  await page.setViewportSize({ width, height: 900 });
  await page.setContent(
    '<!doctype html><html><body><div class="kui-app-root" data-fixture-root></div></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await page.locator('[data-case="targets"] [data-component="list"]').waitFor();
}

/** Whether an inset-shadow divider (or a pseudo-element's fill) is showing. */
async function shows(locator: Locator, pseudo?: '::before' | '::after') {
  return locator.evaluate((element, which) => {
    const style = window.getComputedStyle(element, which ?? null);
    const paint = which ? style.backgroundColor : style.boxShadow;
    // A multi-sided divider is several inset shadows: any opaque one shows.
    return (
      paint.match(/rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\)/g) ?? []
    ).some((color) => !/^rgba\([^)]*,\s*0\)$|\/\s*0\)$/.test(color));
  }, pseudo);
}

async function scroll(
  scroller: Locator,
  to: 'start' | 'middle' | 'end',
  axis: 'block' | 'inline' = 'block',
) {
  await scroller.evaluate(
    (element, [position, direction]) => {
      const vertical = direction === 'block';
      const max = vertical
        ? element.scrollHeight - element.clientHeight
        : element.scrollWidth - element.clientWidth;
      const rtl = window.getComputedStyle(element).direction === 'rtl';
      const amount =
        position === 'start' ? 0 : position === 'middle' ? max / 2 : max;
      if (vertical) element.scrollTop = amount;
      else element.scrollLeft = rtl ? -amount : amount;
    },
    [to, axis] as const,
  );
  // Scroll events are dispatched with the next rendering update.
  await scroller.evaluate(
    () =>
      new Promise((done) =>
        window.requestAnimationFrame(() => done(undefined)),
      ),
  );
}

/**
 * Whether a TabBar shows its overflow divider on the strip's left or right
 * edge: a rail draws a line with the bar's pseudo-element on that edge; a
 * bordered (segmented or inspector) track colors that side of its border.
 */
async function stripEdge(bar: Locator, side: 'left' | 'right') {
  const presentation = await bar.getAttribute('data-presentation');
  if (presentation !== 'rail') {
    return bar.locator('.kui-tab-bar__tabs').evaluate((strip, which) => {
      const style = window.getComputedStyle(strip);
      return (
        (which === 'left' ? style.borderLeftColor : style.borderRightColor) !==
        style.borderTopColor
      );
    }, side);
  }
  const rtl =
    (await bar.getAttribute('dir')) === 'rtl' ||
    (await bar.evaluate(
      (element) => window.getComputedStyle(element).direction,
    )) === 'rtl';
  const pseudo = (side === 'left') !== rtl ? '::before' : '::after';
  return shows(bar, pseudo);
}

const rects = (locator: Locator, selectors: string[]) =>
  locator.evaluate(
    (element, list) =>
      list.map((selector) => {
        const box = element.querySelector(selector)!.getBoundingClientRect();
        return [box.left, box.top, box.width, box.height].map(Math.round);
      }),
    selectors,
  );

test.describe('scroll dividers', () => {
  test('a Pane shows each chrome divider only while content hides beyond it, without moving anything', async ({
    page,
  }) => {
    await mountFixture(page);
    const pane = page.locator(
      '[data-case="pane-scroll"] [data-component="pane"]',
    );
    const header = pane.locator(':scope > .kui-pane__header');
    const footer = pane.locator(':scope > .kui-pane__footer');
    const content = pane.locator(':scope > .kui-pane__content');
    const parts = [
      ':scope > .kui-pane__header',
      ':scope > .kui-pane__content',
      ':scope > .kui-pane__footer',
    ];
    const geometry = await rects(pane, parts);

    expect(await shows(header)).toBe(false);
    expect(await shows(footer)).toBe(true);

    await scroll(content, 'middle');
    expect(await content.getAttribute('data-scroll-overflow')).toBe('tb');
    expect(await shows(header)).toBe(true);
    expect(await shows(footer)).toBe(true);
    expect(await rects(pane, parts)).toEqual(geometry);

    await scroll(content, 'end');
    expect(await shows(header)).toBe(true);
    expect(await shows(footer)).toBe(false);
    expect(await rects(pane, parts)).toEqual(geometry);

    await scroll(content, 'start');
    expect(await shows(header)).toBe(false);
    expect(await shows(footer)).toBe(true);
  });

  test('content that fits shows no divider; always and none override the scroll state', async ({
    page,
  }) => {
    await mountFixture(page);
    const chrome = (name: string, slot: 'header' | 'footer') =>
      page.locator(
        `[data-case="${name}"] [data-component="pane"] > .kui-pane__${slot}`,
      );
    expect(await shows(chrome('pane-fits', 'header'))).toBe(false);
    expect(await shows(chrome('pane-fits', 'footer'))).toBe(false);
    expect(await shows(chrome('pane-always', 'header'))).toBe(true);
    expect(await shows(chrome('pane-always', 'footer'))).toBe(true);
    const none = page.locator(
      '[data-case="pane-none"] [data-component="pane"] > .kui-pane__content',
    );
    await scroll(none, 'middle');
    expect(await none.getAttribute('data-scroll-overflow')).toBe('tb');
    expect(await shows(chrome('pane-none', 'header'))).toBe(false);
    expect(await shows(chrome('pane-none', 'footer'))).toBe(false);
  });

  test('a Workbench draws one divider under its header chrome and over its footer chrome, and rails follow their own scroll', async ({
    page,
  }) => {
    await mountFixture(page);
    const bench = page.locator('[data-case="workbench"]');
    const main = bench.locator(
      '[data-workbench-main] > [data-component="pane"]',
    );
    const mainContent = main.locator(':scope > .kui-pane__content');
    const mainHeader = main.locator(':scope > .kui-pane__header');
    const mainFooter = main.locator(':scope > .kui-pane__footer');
    // No toolbar or header list draws a divider of its own any more.
    for (const toolbar of await main
      .locator('[data-component="toolbar"], [data-component="list"]')
      .all())
      expect(await toolbar.getAttribute('divider-sides')).toBeNull();
    expect(await shows(mainHeader)).toBe(false);
    expect(await shows(mainFooter)).toBe(true);
    await scroll(mainContent, 'end');
    expect(await shows(mainHeader)).toBe(true);
    expect(await shows(mainFooter)).toBe(false);

    const rail = bench.locator('#bench-left-rail [data-component="pane"]');
    const railHeader = rail.locator(':scope > .kui-pane__header');
    expect(await shows(railHeader)).toBe(false);
    await scroll(rail.locator(':scope > .kui-pane__content'), 'middle');
    expect(await shows(railHeader)).toBe(true);
  });

  for (const presentation of ['rail', 'segmented', 'inspector'] as const) {
    test(`a ${presentation} TabBar marks each side of its strip with tabs out of view, without moving a tab`, async ({
      page,
    }) => {
      await mountFixture(page);
      const bar = page.locator(
        `[data-case="tabs-${presentation}"] .kui-tab-bar`,
      );
      const strip = bar.locator('.kui-tab-bar__tabs');
      const parts = [
        '.kui-tab-bar__leading',
        '.kui-tab-bar__tabs',
        '.kui-tab-bar__trailing',
      ];
      const geometry = await rects(bar, parts);
      const gap = await bar.evaluate((element) => {
        const leading = element
          .querySelector('.kui-tab-bar__leading')!
          .getBoundingClientRect();
        const tabs = element
          .querySelector('.kui-tab-bar__tabs')!
          .getBoundingClientRect();
        const trailing = element
          .querySelector('.kui-tab-bar__trailing')!
          .getBoundingClientRect();
        return [tabs.left - leading.right, trailing.left - tabs.right].map(
          Math.round,
        );
      });
      // The divider pseudo-elements take no room: zones keep the 8px gap.
      expect(gap).toEqual([8, 8]);

      expect(await strip.getAttribute('data-scroll-overflow')).toBe('r');
      expect(await stripEdge(bar, 'left')).toBe(false);
      expect(await stripEdge(bar, 'right')).toBe(true);

      await scroll(strip, 'middle', 'inline');
      expect(await stripEdge(bar, 'left')).toBe(true);
      expect(await stripEdge(bar, 'right')).toBe(true);
      expect(await rects(bar, parts)).toEqual(geometry);

      await scroll(strip, 'end', 'inline');
      expect(await stripEdge(bar, 'left')).toBe(true);
      expect(await stripEdge(bar, 'right')).toBe(false);

      // The strip itself never moves or resizes.
      const edges = await bar.evaluate((element) => {
        const tabs = element
          .querySelector('.kui-tab-bar__tabs')!
          .getBoundingClientRect();
        return { left: Math.round(tabs.left), right: Math.round(tabs.right) };
      });
      expect(edges.left).toBe(geometry[1]![0]);
      expect(edges.right).toBe(geometry[1]![0]! + geometry[1]![2]!);

      // Wide enough for every tab: no divider on either side.
      await bar.evaluate((element) => {
        element.parentElement!.style.width = '1600px';
      });
      await expect(strip).not.toHaveAttribute('data-scroll-overflow');
      expect(await stripEdge(bar, 'left')).toBe(false);
      expect(await stripEdge(bar, 'right')).toBe(false);
    });
  }

  test('a right-to-left strip draws the divider on the side with hidden tabs', async ({
    page,
  }) => {
    await mountFixture(page);
    const bar = page.locator('[data-case="tabs-rtl"] .kui-tab-bar');
    const strip = bar.locator('.kui-tab-bar__tabs');
    // At the start (the right edge) tabs are hidden on the left, which is the
    // strip's inline end: the ::after line, drawn on the left.
    expect(await strip.getAttribute('data-scroll-overflow')).toBe('l');
    expect(await shows(bar, '::before')).toBe(false);
    expect(await shows(bar, '::after')).toBe(true);
    expect(await stripEdge(bar, 'left')).toBe(true);
    await scroll(strip, 'end', 'inline');
    expect(await strip.getAttribute('data-scroll-overflow')).toBe('r');
    expect(await shows(bar, '::before')).toBe(true);
    expect(await shows(bar, '::after')).toBe(false);
    expect(await stripEdge(bar, 'right')).toBe(true);
  });

  test('app-owned targets let a Toolbar and a List draw their facing divider, and disposal clears it', async ({
    page,
  }) => {
    await mountFixture(page);
    const top = page.locator('#target-top');
    const bottom = page.locator('#target-bottom');
    const scroller = page.locator('#target-scroller');
    expect(await shows(top)).toBe(false);
    expect(await shows(bottom)).toBe(true);
    await scroll(scroller, 'middle');
    expect(await shows(top)).toBe(true);
    await scroll(scroller, 'end');
    expect(await shows(bottom)).toBe(false);
    await page.evaluate(() =>
      (
        window as unknown as { disposeScrollDividers: () => void }
      ).disposeScrollDividers(),
    );
    expect(await shows(top)).toBe(false);
    expect(await page.locator('[data-scroll-overflow]').count()).toBe(0);
    expect(await page.locator('[data-scroll-divider]').count()).toBe(0);
  });
});
