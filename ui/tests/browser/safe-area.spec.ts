import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// Playwright cannot give a page real device safe areas, so the fixture page
// simulates them through the `--kui-safe-area-*` overrides that stand in for
// `env(safe-area-inset-*)`. Distinct left/right values catch a swapped side.
const INSETS = { top: 44, bottom: 34, left: 47, right: 43 };

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/safe-area-layouts.tsx')],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

type Scenario =
  | 'pane'
  | 'pane-bare'
  | 'workbench'
  | 'nav-stack'
  | 'tab-scaffold'
  | 'split-view'
  | 'split-view-resizable'
  | 'collapsible';

interface SafeAreaFixture {
  show(scenario: Scenario): void;
  collapseLeft(value: boolean): void;
  collapseDrawer(value: boolean): void;
}

async function mountFixture(
  page: Page,
  scenario: Scenario,
  insets: typeof INSETS | null = INSETS,
): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Safe-area fixture emitted no JS');
  const overrides = insets
    ? `--kui-safe-area-block-start:${String(insets.top)}px;--kui-safe-area-block-end:${String(insets.bottom)}px;--kui-safe-area-inline-start:${String(insets.left)}px;--kui-safe-area-inline-end:${String(insets.right)}px`
    : '';
  // The root is a grid so a lone Pane fills it the way a mounted shell would.
  await page.setContent(
    `<!doctype html><html style="${overrides}"><body><div class="kui-app-root" style="display:grid" data-safe-area-root></div></body></html>`,
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
  await call(page, 'show', scenario);
}

async function call<M extends keyof SafeAreaFixture>(
  page: Page,
  method: M,
  value: Parameters<SafeAreaFixture[M]>[0],
): Promise<void> {
  await page.evaluate(
    ([name, argument]) => {
      const api = (
        globalThis as unknown as {
          safeAreaFixture: Record<string, (value: unknown) => void>;
        }
      ).safeAreaFixture;
      api[name](argument);
    },
    [method, value] as const,
  );
}

/** Padding (px) of the first element matching `selector`, as [top, right, bottom, left]. */
function padding(page: Page, selector: string): Promise<number[]> {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return [
        style.paddingTop,
        style.paddingRight,
        style.paddingBottom,
        style.paddingLeft,
      ].map((value) => parseFloat(value));
    });
}

function box(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
      };
    });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
});

test('a Pane paints edge to edge while its slots pad the touched sides', async ({
  page,
}) => {
  await mountFixture(page, 'pane');
  const pane = '[data-safe-pane="Inbox"]';
  expect(await box(page, pane)).toMatchObject({
    top: 0,
    left: 0,
    right: 1180,
    bottom: 820,
  });
  // The header hands its sole Toolbar the inline edges: the toolbar box and its
  // divider still reach both screen edges while its zones clear the insets.
  const toolbar = `${pane} .kui-pane__header > [data-component="toolbar"]`;
  expect(await box(page, toolbar)).toMatchObject({ left: 0, right: 1180 });
  expect(await padding(page, `${pane} .kui-pane__header`)).toEqual([
    INSETS.top,
    0,
    0,
    0,
  ]);
  expect(await padding(page, toolbar)).toEqual([
    8,
    8 + INSETS.right,
    8,
    8 + INSETS.left,
  ]);
  expect(await padding(page, `${pane} .kui-pane__footer`)).toEqual([
    0,
    0,
    INSETS.bottom,
    0,
  ]);
  // The header and footer own the block edges, so the content pads inline only.
  expect(await padding(page, `${pane} .kui-pane__content`)).toEqual([
    0,
    INSETS.right,
    0,
    INSETS.left,
  ]);
  const item = await box(page, '[data-safe-item="Inbox-1"]');
  expect(item.left).toBe(INSETS.left + 8);
  expect(item.right).toBe(1180 - INSETS.right - 8);
});

test('scroll padding lets the first and last content clear the unsafe block edges', async ({
  page,
}) => {
  await mountFixture(page, 'pane-bare');
  const content = '[data-safe-pane="Inbox"] .kui-pane__content';
  expect(await padding(page, content)).toEqual([
    INSETS.top,
    INSETS.right,
    INSETS.bottom,
    INSETS.left,
  ]);
  const scrollPadding = await page
    .locator(content)
    .evaluate((element) => [
      window.getComputedStyle(element).scrollPaddingTop,
      window.getComputedStyle(element).scrollPaddingBottom,
    ]);
  expect(scrollPadding).toEqual([
    `${String(INSETS.top)}px`,
    `${String(INSETS.bottom)}px`,
  ]);

  // At rest the first item sits below the top inset.
  expect((await box(page, '[data-safe-item="Inbox-1"]')).top).toBe(INSETS.top);

  // Content scrolls under the unsafe area...
  await page.locator(content).evaluate((element) => {
    element.scrollTop = 200;
  });
  const underTop = await page.locator('[data-safe-item]').evaluateAll(
    (elements, top) =>
      elements.some((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top < top && bounds.bottom > 0;
      }),
    INSETS.top,
  );
  expect(underTop).toBe(true);

  // ...and the last item can always be scrolled clear of the bottom inset.
  await page.locator(content).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const last = await box(page, '[data-safe-item="Inbox-30"]');
  expect(last.bottom).toBeLessThanOrEqual(820 - INSETS.bottom + 0.5);
  expect(last.bottom).toBeGreaterThan(820 - INSETS.bottom - 8.5);
});

test('Workbench rails extend through the unsafe area and the center regains an edge when a rail collapses', async ({
  page,
}) => {
  await mountFixture(page, 'workbench');
  const left = '[data-workbench-rail="left"]';
  const right = '[data-workbench-rail="right"]';
  const main = '[data-workbench-main]';
  const drawer = '[data-workbench-drawer] .kui-workbench__panel-content';

  // Surfaces and separators: rails span the full height and grow by the inset.
  expect(await box(page, left)).toMatchObject({
    top: 0,
    bottom: 820,
    left: 0,
    width: 280 + INSETS.left,
  });
  expect(await box(page, right)).toMatchObject({
    top: 0,
    bottom: 820,
    right: 1180,
    width: 280 + INSETS.right,
  });
  expect((await box(page, '[data-workbench-drawer]')).height).toBe(
    220 + INSETS.bottom,
  );

  // The left rail's sole-child Pane owns its insets; never the interior edge.
  expect(
    await padding(
      page,
      `${left} [data-safe-pane="Navigator"] .kui-pane__content`,
    ),
  ).toEqual([INSETS.top, 0, INSETS.bottom, INSETS.left]);
  expect(await padding(page, `${left} .kui-workbench__panel-content`)).toEqual([
    0, 0, 0, 0,
  ]);
  expect(await padding(page, `${right} .kui-workbench__panel-content`)).toEqual(
    [INSETS.top, INSETS.right, INSETS.bottom, 0],
  );
  // Main touches only the top edge while both rails and the drawer are open.
  expect(await padding(page, main)).toEqual([INSETS.top, 0, 0, 0]);
  expect(await padding(page, drawer)).toEqual([0, 0, INSETS.bottom, 0]);
  const firstInspector = await box(page, '[data-safe-item="Inspector-1"]');
  expect(firstInspector.left).toBe(1180 - 280 - INSETS.right + 1 + 8);

  // Collapsing the left rail hands the inline-start edge back to the center.
  await call(page, 'collapseLeft', true);
  await expect
    .poll(() => padding(page, main))
    .toEqual([INSETS.top, 0, 0, INSETS.left]);
  expect(await padding(page, drawer)).toEqual([
    0,
    0,
    INSETS.bottom,
    INSETS.left,
  ]);
  expect((await box(page, '[data-safe-item="Editor-1"]')).left).toBe(
    INSETS.left + 8,
  );

  // Collapsing the drawer hands the bottom edge to the main area.
  await call(page, 'collapseDrawer', true);
  await expect
    .poll(() => padding(page, main))
    .toEqual([INSETS.top, 0, INSETS.bottom, INSETS.left]);

  await call(page, 'collapseLeft', false);
  await expect
    .poll(() => padding(page, main))
    .toEqual([INSETS.top, 0, INSETS.bottom, 0]);
});

test('NavStack chrome, views, and bottom toolbar split the edges without double insets', async ({
  page,
}) => {
  await mountFixture(page, 'nav-stack');
  const chrome = '[data-nav-stack-chrome]';
  expect(await box(page, chrome)).toMatchObject({
    top: 0,
    left: 0,
    right: 1180,
  });
  expect(await padding(page, chrome)).toEqual([
    INSETS.top,
    8 + INSETS.right,
    0,
    8 + INSETS.left,
  ]);
  expect((await box(page, chrome)).height).toBe(44 + INSETS.top);
  expect(await padding(page, '.kui-nav-stack__view')).toEqual([
    0,
    INSETS.right,
    0,
    INSETS.left,
  ]);
  const bottom = '[data-nav-stack-bottom]';
  expect(await box(page, bottom)).toMatchObject({
    bottom: 820,
    left: 0,
    right: 1180,
  });
  expect(await padding(page, bottom)).toEqual([
    0,
    INSETS.right,
    INSETS.bottom,
    INSETS.left,
  ]);
  // The bottom toolbar sits inside its padded footer, so it adds no inset.
  expect(await padding(page, `${bottom} [data-component="toolbar"]`)).toEqual([
    8, 8, 8, 8,
  ]);
});

test('TabScaffold scenes take the top edge and its bar takes the bottom', async ({
  page,
}) => {
  await mountFixture(page, 'tab-scaffold');
  expect(await padding(page, '[data-tab-scaffold-scene="home"]')).toEqual([
    INSETS.top,
    INSETS.right,
    0,
    INSETS.left,
  ]);
  const bar = '.kui-tab-scaffold__bar';
  expect(await box(page, bar)).toMatchObject({
    bottom: 820,
    left: 0,
    right: 1180,
  });
  expect(await padding(page, bar)).toEqual([
    4,
    INSETS.right,
    4 + INSETS.bottom,
    INSETS.left,
  ]);
});

test('SplitView pads only the outer edges of each pane', async ({ page }) => {
  await mountFixture(page, 'split-view');
  const list = '[data-split-list]';
  expect(await box(page, list)).toMatchObject({
    top: 0,
    bottom: 820,
    left: 0,
    width: 320 + INSETS.left,
  });
  expect(await padding(page, list)).toEqual([
    INSETS.top,
    0,
    INSETS.bottom,
    INSETS.left,
  ]);
  // The detail's sole child is a Pane, so the Pane owns the insets and the
  // interior edge beside the list gets none.
  expect(await padding(page, '[data-split-detail]')).toEqual([0, 0, 0, 0]);
  expect(
    await padding(
      page,
      '[data-safe-pane="Message"] [data-component="toolbar"]',
    ),
  ).toEqual([8, 8 + INSETS.right, 8, 8]);
  expect(
    await padding(page, '[data-safe-pane="Message"] .kui-pane__content'),
  ).toEqual([0, INSETS.right, 0, 0]);

  await mountFixture(page, 'split-view-resizable');
  expect((await box(page, '[data-component="resizable-region"]')).width).toBe(
    300 + INSETS.left,
  );
  expect(await padding(page, list)).toEqual([
    INSETS.top,
    0,
    INSETS.bottom,
    INSETS.left,
  ]);
  expect((await box(page, '[data-safe-item="Threads-1"]')).width).toBe(
    300 - 16,
  );
});

test('a standalone CollapsiblePanel hands its edge to its sibling when it collapses', async ({
  page,
}) => {
  await mountFixture(page, 'collapsible');
  const rail = '[data-collapsible-panel="safe-rail"]';
  const main = '[data-safe-pane="Main"]';
  expect(await box(page, rail)).toMatchObject({
    left: 0,
    top: 0,
    bottom: 820,
    width: 240 + INSETS.left,
  });
  expect(
    await padding(page, `${rail} [data-safe-pane="Rail"] .kui-pane__content`),
  ).toEqual([INSETS.top, 0, INSETS.bottom, INSETS.left]);
  expect(await padding(page, `${main} .kui-pane__content`)).toEqual([
    0,
    INSETS.right,
    0,
    0,
  ]);
  expect(await padding(page, `${main} [data-component="toolbar"]`)).toEqual([
    8,
    8 + INSETS.right,
    8,
    8,
  ]);

  await call(page, 'collapseLeft', true);
  await expect
    .poll(() => padding(page, `${main} .kui-pane__content`))
    .toEqual([0, INSETS.right, 0, INSETS.left]);
  expect(await padding(page, `${main} [data-component="toolbar"]`)).toEqual([
    8,
    8 + INSETS.right,
    8,
    8 + INSETS.left,
  ]);
  expect(await box(page, rail)).toMatchObject({ width: 0 });
});

test('without device insets every layout keeps its unpadded geometry', async ({
  page,
}) => {
  for (const scenario of ['pane', 'workbench', 'nav-stack'] as const) {
    await mountFixture(page, scenario, null);
    for (const selector of [
      '.kui-pane__content',
      '[data-workbench-main]',
      '.kui-nav-stack__view',
    ]) {
      if ((await page.locator(selector).count()) === 0) continue;
      expect(await padding(page, selector)).toEqual([0, 0, 0, 0]);
    }
  }
  await mountFixture(page, 'workbench', null);
  expect((await box(page, '[data-workbench-rail="left"]')).width).toBe(280);
});
