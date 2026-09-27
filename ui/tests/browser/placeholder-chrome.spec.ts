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
  /** The root is inline and sized by its value: compare its height only. */
  inlineValue?: boolean;
}

const CHROME: readonly ChromeSpec[] = [
  { root: '[data-component="toolbar-text"]', parts: [], inlineValue: true },
  {
    root: '.kui-value-table__row',
    parts: ['dt', '.kui-value-table__label', '.kui-value-table__icon'],
  },
];

// Components whose placeholder currently drifts from the live chrome and are
// therefore not yet in CHROME. Move each into CHROME with its fix:
// - ListItem / ListActionRow: `:disabled` dims the row (opacity 0.58 + quiet
//   color) and dropping `description` changes the row height.
// - SegmentedControl: `:disabled` opacity 0.45; icon choices become 4em text
//   skeletons, widening every segment.
// - ListHeader: the action button (0.48) and toggle title (Web Awesome native
//   0.5) dim, taking the label with them in toggle mode.
// - AppTab: Web Awesome native `button:disabled` dims the pill to 0.5.
// - StateBanner: a placeholder always adds a detail skeleton, even without
//   `detail`.
// - Select: the hint row is 12px / 4px gap instead of the live 14px / 7px.

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
  'cursor',
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
            styles: styles(root),
            parts: spec.parts.map((selector) => {
              const part = root.querySelector(selector);
              return part ? { rect: rect(part), styles: styles(part) } : null;
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
  expect(loading.map((instances) => instances.length)).toEqual([1, 4]);

  await inspector.getByRole('button', { name: 'Show loaded' }).click();
  await expect(inspector).toHaveAttribute('data-inspector-loading', 'false');
  expect(await chrome(inspector)).toEqual(loading);
});
