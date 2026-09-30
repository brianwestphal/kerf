import { expect, type Locator, test } from '@playwright/test';

/**
 * A placeholder component may skeleton only its unknown values; every other
 * piece of chrome — typography, insets, box geometry, radius, borders, icon
 * boxes, opacity — must be byte-identical to the live state. The Loading
 * inspector recipe renders each placeholder-capable component from one loading
 * flag, so toggling it gives the same instance in both states.
 *
 * Each entry names a component's root and the chrome descendants to compare.
 * Value slots (the elements that hold the skeleton) are excluded; a root whose
 * inline width follows its value only compares height.
 */
interface ChromeSpec {
  root: string;
  /** Chrome descendants compared by rect (relative to the root) and style. */
  parts: readonly string[];
  /**
   * Descendants compared by rect only: their styling carries a value (for
   * example the selected segment, since a placeholder's selection is unknown).
   */
  rectParts?: readonly string[];
  /** The root is inline and sized by its value: compare its height only. */
  inlineValue?: boolean;
  /**
   * The root's styling carries a value (the recipe's StateBanner tone follows
   * the loaded status): compare the root's size but not its styles.
   */
  rootRectOnly?: boolean;
}

const CHROME: readonly ChromeSpec[] = [
  { root: '[data-component="toolbar-text"]', parts: [], inlineValue: true },
  {
    root: '.kui-value-table__row',
    parts: ['dt', '.kui-value-table__label', '.kui-value-table__icon'],
  },
  {
    root: '.kui-list-item',
    parts: ['.kui-list-item__icon', '.kui-list-item__label'],
  },
  {
    root: '.kui-segmented-control',
    parts: [
      '[data-segment-value="activity"]',
      '[data-segment-value="activity"] svg',
      '[data-segment-value="files"]',
    ],
    rectParts: ['[data-segment-value="details"]'],
  },
  {
    root: '.kui-state-banner',
    parts: [],
    rectParts: ['.kui-state-banner__icon', '.kui-state-banner__copy'],
    rootRectOnly: true,
  },
];

// Select's placeholder is a separate static box (not the live wa-select), so its
// label, box, chevron, and hint are compared part-by-part in placeholder.spec.ts.
// ListHeader and AppTab are not in the recipe; their own tests below cover them,
// and placeholder-fixture.spec.ts diffs every placeholder component against a
// live render with identical props.

const STYLE_PROPS = [
  'opacity',
  'color',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'background-color',
  'border-top-width',
  'border-top-color',
  'border-top-left-radius',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'min-height',
  // `cursor` is deliberately not compared: a placeholder is inert, so it shows
  // the default cursor where the live control shows a pointer. The test below
  // asserts it never shows `not-allowed` instead.
] as const;

async function chrome(inspector: Locator) {
  return inspector.evaluate(
    (scope, { specs, props }) => {
      const round = (n: number) => Math.round(n * 2) / 2;
      const styles = (element: Element) => {
        const computed = window.getComputedStyle(element);
        return props.map((property) => computed.getPropertyValue(property));
      };
      return specs.map((spec) =>
        [...scope.querySelectorAll(spec.root)].map((root) => {
          const origin = root.getBoundingClientRect();
          const rect = (element: Element) => {
            const bounds = element.getBoundingClientRect();
            return [
              round(bounds.left - origin.left),
              round(bounds.top - origin.top),
              round(bounds.width),
              round(bounds.height),
            ];
          };
          return {
            size: spec.inlineValue
              ? [round(origin.height)]
              : [round(origin.width), round(origin.height)],
            styles: spec.rootRectOnly ? [] : styles(root),
            parts: spec.parts.map((selector) => {
              const part = root.querySelector(selector);
              return part ? { rect: rect(part), styles: styles(part) } : null;
            }),
            rectParts: (spec.rectParts ?? []).map((selector) => {
              const part = root.querySelector(selector);
              return part ? rect(part) : null;
            }),
          };
        }),
      );
    },
    { specs: CHROME, props: STYLE_PROPS },
  );
}

test('placeholder components keep the live chrome; only values are skeletons', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=recipe-loading-inspector');
  const inspector = page.locator('[data-recipe="recipe-loading-inspector"]');
  await expect(inspector).toHaveAttribute('data-inspector-loading', 'true');
  await page.evaluate(() => document.fonts.ready);

  const loading = await chrome(inspector);
  expect(loading.map((instances) => instances.length)).toEqual([1, 4, 2, 1, 1]);
  // A placeholder is loading, not unavailable: nothing advertises `not-allowed`.
  const roots = CHROME.map((spec) => spec.root).join(', ');
  expect(
    await inspector.evaluate(
      (scope, selector) =>
        [...scope.querySelectorAll(selector)]
          .flatMap((root) => [root, ...root.querySelectorAll('*')])
          .filter(
            (element) =>
              window.getComputedStyle(element).cursor === 'not-allowed',
          )
          .map((element) => element.className),
      roots,
    ),
  ).toEqual([]);

  await inspector.getByRole('button', { name: 'Show loaded' }).click();
  await expect(inspector).toHaveAttribute('data-inspector-loading', 'false');
  expect(await chrome(inspector)).toEqual(loading);
});

test('a placeholder neutralizes generic disabled chrome, including Web Awesome’s native button:disabled', async ({
  page,
}) => {
  await page.goto('/?component=skeleton');
  await expect(page.locator('[data-demo="skeleton"]')).toBeVisible();
  const styles = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = `
      <button type="button" disabled data-probe="plain">Plain</button>
      <button type="button" disabled data-placeholder="true" data-probe="root">Root</button>
      <div data-placeholder="true">
        <button type="button" disabled data-probe="descendant">Descendant</button>
        <button type="button" disabled data-probe="hidden" style="opacity: 0">Hidden</button>
      </div>`;
    document.body.append(host);
    const read = (probe: string) => {
      const computed = window.getComputedStyle(
        host.querySelector(`[data-probe="${probe}"]`)!,
      );
      return { opacity: computed.opacity, cursor: computed.cursor };
    };
    const result = {
      plain: read('plain'),
      root: read('root'),
      descendant: read('descendant'),
      hidden: read('hidden'),
    };
    host.remove();
    return result;
  });
  // Outside a placeholder, Web Awesome's native disabled dimming still applies.
  expect(styles.plain.opacity).toBe('0.5');
  // A placeholder is loading, not unavailable: full opacity, inert cursor.
  expect(styles.root).toEqual({ opacity: '1', cursor: 'default' });
  expect(styles.descendant).toEqual({ opacity: '1', cursor: 'default' });
  // The neutralizer never overrides a component's own opacity (for example a
  // control hidden until interaction).
  expect(styles.hidden.opacity).toBe('0');
});

test('a placeholder ListHeader keeps its action at the live tone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=list-header');
  const demo = page.locator('[data-demo="list-header"]');
  await expect(demo).toBeVisible();
  const read = (selector: string) =>
    demo
      .locator(selector)
      .first()
      .evaluate((action) => {
        const computed = window.getComputedStyle(action);
        const box = action.getBoundingClientRect();
        return {
          opacity: computed.opacity,
          color: computed.color,
          size: [box.width, box.height],
        };
      });
  const live = await read(
    '.kui-list-header:not([data-placeholder]) .kui-list-header__action:not(:disabled)',
  );
  const placeholder = await read(
    '.kui-list-header[data-placeholder="true"] .kui-list-header__action',
  );
  expect(placeholder).toEqual(live);
  // Hovering a placeholder's inert action gives no feedback.
  const action = demo
    .locator(
      '.kui-list-header[data-placeholder="true"] .kui-list-header__action',
    )
    .first();
  await action.hover({ force: true });
  expect(
    await action.evaluate(
      (element) => window.getComputedStyle(element).backgroundColor,
    ),
  ).toBe('rgba(0, 0, 0, 0)');
});

test('a placeholder AppTab keeps the live pill tone; only the name is a skeleton', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=tabs');
  const demo = page.locator('[data-demo="tabs"]');
  await expect(demo).toBeVisible();
  const read = (selector: string) =>
    demo
      .locator(selector)
      .first()
      .evaluate((tab) => {
        const pick = (element: Element) => {
          const computed = window.getComputedStyle(element);
          return {
            opacity: computed.opacity,
            color: computed.color,
            background: computed.backgroundColor,
            radius: computed.borderTopLeftRadius,
            height: element.getBoundingClientRect().height,
          };
        };
        const select = tab.querySelector('.kui-app-tab__select')!;
        return {
          root: pick(tab),
          select: pick(select),
          cursor: window.getComputedStyle(select).cursor,
        };
      });
  // Web Awesome's native `button:disabled` used to dim the placeholder pill
  // to 50% with a not-allowed cursor.
  const placeholder = await read('.kui-app-tab[data-placeholder="true"]');
  const live = await read('.kui-app-tab[data-tab-id="beta"]');
  expect(placeholder.root).toEqual(live.root);
  expect(placeholder.select).toEqual(live.select);
  expect(placeholder.cursor).toBe('default');
});
