/**
 * KF-16YSSH: characterize the CSS Anchor Positioning recipes against the
 * shipped JS geometry before selecting any CSS-backed autoReposition mode.
 * The negative cases deliberately pin why that mode remains disabled.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

type Case = {
  anchorX: number;
  anchorY: number;
  popupWidth: number;
  popupHeight: number;
  placement?: 'bottom' | 'top';
  align?: 'start' | 'end';
  recipe?: 'area' | 'inset';
};

async function measure(page: Page, input: Case) {
  return page.evaluate((scenario) => {
    const { positionAnchored } = (window as any).kerfOverlay;
    const {
      anchorX,
      anchorY,
      popupWidth,
      popupHeight,
      placement = 'bottom',
      align = 'start',
      recipe = 'area',
    } = scenario;
    const anchor = document.createElement('button');
    anchor.style.cssText = `position:absolute;left:${anchorX}px;top:${anchorY}px;width:80px;height:20px;anchor-name:--parity`;
    const css = document.createElement('div');
    css.style.cssText =
      `position:fixed;position-anchor:--parity;inset:auto;width:${popupWidth}px;` +
      `height:${popupHeight}px;position-try-fallbacks:flip-block;` +
      (recipe === 'area'
        ? `position-area:${placement} ${align === 'start' ? 'span-right' : 'span-left'};margin:4px 0`
        : `margin:0;${align === 'start' ? 'left:anchor(left)' : 'right:anchor(right)'};` +
          (placement === 'bottom'
            ? 'top:calc(anchor(bottom) + 4px)'
            : 'bottom:calc(anchor(top) + 4px)'));
    const js = document.createElement('div');
    js.style.cssText = `width:${popupWidth}px;height:${popupHeight}px`;
    document.body.append(anchor, css, js);
    positionAnchored(js, anchor, { placement, align, gap: 4 });
    const read = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const result = { css: read(css), js: read(js), anchor: read(anchor) };
    anchor.remove();
    css.remove();
    js.remove();
    return result;
  }, input);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as any).kerfReady === true);
  await page.addStyleTag({ content: 'body { margin: 0 }' });
});

test('the candidate syntax and ordinary edge/flip geometry work in three engines', async ({
  page,
}) => {
  const support = await page.evaluate(() =>
    [
      'anchor-name: --parity',
      'position-anchor: --parity',
      'position-area: bottom span-right',
      'position-area: top span-left',
      'top: anchor(bottom)',
      'position-try-fallbacks: flip-block',
    ].map((declaration) => CSS.supports(declaration)),
  );
  expect(support).toEqual([true, true, true, true, true, true]);

  const scenarios = [
    { anchorX: 30, anchorY: 40, popupWidth: 100, popupHeight: 80 },
    { anchorX: 30, anchorY: 550, popupWidth: 100, popupHeight: 80 },
    {
      anchorX: 30,
      anchorY: 40,
      popupWidth: 100,
      popupHeight: 80,
      placement: 'top',
      align: 'end',
    },
    {
      anchorX: 30,
      anchorY: 550,
      popupWidth: 100,
      popupHeight: 80,
      placement: 'top',
      align: 'end',
    },
  ] as const;
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 600 });
    for (const scenario of scenarios) {
      const { css, js } = await measure(page, scenario);
      expect(Math.abs(css.x - js.x)).toBeLessThan(1.5);
      expect(Math.abs(css.y - js.y)).toBeLessThan(1.5);
    }
  }
});

test('position-area shifts over the anchor when neither vertical side fits', async ({
  page,
}) => {
  const { css, js, anchor } = await measure(page, {
    anchorX: 30,
    anchorY: 260,
    popupWidth: 100,
    popupHeight: 500,
  });
  // JS retains the requested bottom side; CSS safe-overflow shifts upward.
  expect(js.y).toBeCloseTo(anchor.y + anchor.height + 4, 0);
  expect(js.y - css.y).toBeGreaterThan(150);
});

test('position-area shifts a wide end-aligned popup into its trigger', async ({
  page,
}) => {
  const { css, js, anchor } = await measure(page, {
    anchorX: 30,
    anchorY: 550,
    popupWidth: 350,
    popupHeight: 80,
    align: 'end',
  });
  expect(js.y + js.height).toBeCloseTo(anchor.y - 4, 0);
  expect(css.y - js.y).toBeGreaterThan(40);
  expect(css.y + css.height).toBeGreaterThan(anchor.y);
});

test('explicit anchor() insets miss the horizontal clamp and block a wide popup flip', async ({
  page,
}) => {
  const { css, js } = await measure(page, {
    anchorX: 30,
    anchorY: 550,
    popupWidth: 350,
    popupHeight: 80,
    align: 'end',
    recipe: 'inset',
  });
  expect(css.y - js.y).toBeGreaterThan(100);
  expect(js.x).toBe(0);
  expect(css.x).toBeLessThan(-200);
});
