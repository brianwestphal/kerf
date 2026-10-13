import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// With a back control, a NavStack title centers on the bar like a platform
// navigation bar: centered while the sides leave room, shifted away from a
// wider side when they do not, and truncated before it reaches a control. At
// the root (no back control) the title leads, left-aligned.

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/nav-stack-centered-title.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page, width: number): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('NavStack fixture emitted no JS');
  await page.setViewportSize({ width, height: 900 });
  await page.setContent(
    '<!doctype html><html><body><div class="kui-app-root" data-fixture-root></div></body></html>',
  );
  // The fixture resolves package CSS from source, so apply the pixel-first
  // remify() authoring transform the package build performs.
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await page.locator('[data-case="long"] [data-nav-back]').waitFor();
}

interface Rect {
  left: number;
  right: number;
}

interface Measure {
  toolbar: Rect;
  title: Rect;
  titleZone: 'leading' | 'center';
  back: Rect | null;
  trailing: Rect;
  whole: boolean;
  ellipsis: boolean;
}

function measure(page: Page, name: string): Promise<Measure> {
  return page
    .locator(
      `[data-case="${name}"] [data-nav-stack-chrome] > [data-component="toolbar"]`,
    )
    .evaluate((toolbar) => {
      const rect = (element: Element): Rect => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right };
      };
      const style = window.getComputedStyle(toolbar);
      const content = rect(toolbar);
      content.left += parseFloat(style.paddingLeft);
      content.right -= parseFloat(style.paddingRight);
      const title = toolbar.querySelector('.kui-toolbar-text')!;
      const text = title.querySelector('.kui-toolbar-text__text')!;
      const back = toolbar.querySelector('[data-nav-back]');
      return {
        toolbar: content,
        title: rect(text),
        titleZone: title.parentElement!.classList.contains(
          'kui-toolbar__center',
        )
          ? 'center'
          : 'leading',
        back: back
          ? rect(back.closest('[data-component="toolbar-control-group"]')!)
          : null,
        trailing: rect(
          toolbar.querySelector(
            ':scope > .kui-toolbar__trailing > [data-component="toolbar-control-group"]',
          )!,
        ),
        whole: text.scrollWidth <= text.clientWidth + 0.5,
        ellipsis: window.getComputedStyle(text).textOverflow === 'ellipsis',
      };
    });
}

const middle = (rect: Rect) => (rect.left + rect.right) / 2;

for (const width of [1100, 390, 320]) {
  test(`a pushed view centers its title without covering a control at ${String(width)}px`, async ({
    page,
    browserName,
  }) => {
    await mountFixture(page, width);
    if (browserName === 'chromium')
      await page.screenshot({
        path: `test-results/nav-stack-centered-title-${String(width)}.png`,
        fullPage: true,
      });

    const root = await measure(page, 'root');
    expect(root.back).toBeNull();
    expect(root.titleZone).toBe('leading');

    for (const name of ['short', 'wide-side', 'long']) {
      const m = await measure(page, name);
      expect(m.titleZone, name).toBe('center');
      const back = m.back!;
      // The back control and trailing group keep their whole width …
      expect(back.right - back.left, `${name}: back squeezed`).toBeGreaterThan(
        40,
      );
      expect(back.left, `${name}: back clipped`).toBeGreaterThanOrEqual(
        m.toolbar.left - 0.5,
      );
      expect(m.trailing.right, `${name}: trailing clipped`).toBeLessThanOrEqual(
        m.toolbar.right + 0.5,
      );
      // … and the title stays between them.
      expect(m.title.left, `${name}: title over back`).toBeGreaterThanOrEqual(
        back.right - 0.5,
      );
      expect(m.title.right, `${name}: title over trailing`).toBeLessThanOrEqual(
        m.trailing.left + 0.5,
      );
      if (!m.whole) expect(m.ellipsis, `${name}: no ellipsis`).toBe(true);
      expect(
        m.title.right - m.title.left,
        `${name}: title vanished`,
      ).toBeGreaterThan(0);
    }

    // A short title with room on both sides sits on the bar's center line.
    const short = await measure(page, 'short');
    expect(short.whole).toBe(true);
    expect(middle(short.title)).toBeCloseTo(middle(short.toolbar), 0);

    // At a phone width an overlong title truncates instead of pushing a
    // control aside; at a roomy width it fits whole, centered on the bar.
    const long = await measure(page, 'long');
    if (width <= 390) expect(long.whole).toBe(false);
    else {
      expect(long.whole).toBe(true);
      expect(middle(long.title)).toBeCloseTo(middle(long.toolbar), 0);
    }
  });
}

test('a centered title keeps the root title color', async ({ page }) => {
  await mountFixture(page, 390);
  const color = (name: string) =>
    page
      .locator(`[data-case="${name}"] .kui-toolbar-text`)
      .evaluate((title) => window.getComputedStyle(title).color);
  const root = await color('root');
  for (const name of ['short', 'wide-side', 'long'])
    expect(await color(name), name).toBe(root);
});

test('a wider trailing side shifts the title toward the back control', async ({
  page,
}) => {
  await mountFixture(page, 390);
  const m = await measure(page, 'wide-side');
  // There is not room to center on the bar, so the title sits as close to the
  // middle as the three trailing actions allow, against their group.
  expect(middle(m.title)).toBeLessThan(middle(m.toolbar));
});
