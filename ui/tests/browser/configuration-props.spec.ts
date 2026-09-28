import { expect, type Page, test } from '@playwright/test';

// Props that replace raw `--kui-*` overrides: each must reach the rendered
// style through the component's own token, at the documented default when
// omitted.

const noHorizontalOverflow = (page: Page) =>
  page
    .locator('html')
    .evaluate((element) => element.scrollWidth <= element.clientWidth);

for (const { name, width, height } of [
  { name: 'wide', width: 1100, height: 900 },
  { name: 'narrow', width: 390, height: 844 },
]) {
  test.describe(`${name} viewport`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height });
    });

    test('DisclosureArrow size sets the arrow box', async ({ page }) => {
      await page.goto('/?component=disclosure-arrow');
      const demo = page.locator('[data-demo="disclosure-arrow"]');
      const box = (action: string) =>
        demo
          .locator(
            `[data-action="${action}"] [data-component="disclosure-arrow"]`,
          )
          // Layout size, unaffected by the rotation transform mid-animation.
          .evaluate((element) => ({
            width: (element as HTMLElement).offsetWidth,
            height: (element as HTMLElement).offsetHeight,
          }));
      expect(await box('toggle-disclosure')).toEqual({ width: 18, height: 18 });
      expect(await box('toggle-sized-disclosure')).toEqual({
        width: 24,
        height: 24,
      });
      const sized = demo.locator('[data-action="toggle-sized-disclosure"]');
      await sized.click();
      await expect(sized).toHaveAttribute('aria-expanded', 'true');
      await expect(
        sized.locator('[data-component="disclosure-arrow"]'),
      ).toHaveAttribute('data-direction', 'down');
      expect(await box('toggle-sized-disclosure')).toEqual({
        width: 24,
        height: 24,
      });
      expect(await noHorizontalOverflow(page)).toBe(true);
      await demo.screenshot({
        path: `test-results/configuration-props-disclosure-${name}.png`,
      });
    });

    test('FloatingToolbar keeps its default 16px inset', async ({ page }) => {
      await page.goto('/?component=floating-toolbar');
      const stage = page.locator('[data-demo-floating-toolbar-stage]');
      await stage.locator('[data-action="toggle-floating-toolbar"]').click();
      const toolbar = stage.locator('.kui-floating-toolbar');
      await expect(toolbar).toBeVisible();
      await expect(toolbar).toHaveCSS('bottom', '16px');
      await expect(toolbar).toHaveCSS('right', '16px');
      // The prop writes the same token an ancestor could; setting it on the
      // element moves the toolbar.
      await toolbar.evaluate((element) =>
        (element as HTMLElement).style.setProperty(
          '--kui-floating-toolbar-inset',
          'var(--kui-space-xs)',
        ),
      );
      await expect(toolbar).toHaveCSS('bottom', '8px');
      await toolbar.evaluate((element) =>
        (element as HTMLElement).style.removeProperty(
          '--kui-floating-toolbar-inset',
        ),
      );
      await expect(toolbar).toHaveCSS('bottom', '16px');
      await stage.screenshot({
        path: `test-results/configuration-props-floating-${name}.png`,
      });
    });

    test('ListHeader headingLevel changes semantics, not presentation', async ({
      page,
    }) => {
      await page.goto('/?component=list-header');
      const demo = page.locator('[data-demo="list-header"]');
      const level3 = demo.getByRole('heading', {
        level: 3,
        name: 'Needs attention',
      });
      await expect(level3).toBeVisible();
      const level2 = demo.getByRole('heading', { level: 2, name: 'Featured' });
      const typography = (heading: typeof level3) =>
        heading.evaluate((element) => {
          const style = globalThis.getComputedStyle(element);
          return {
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
            margin: style.margin,
          };
        });
      expect(await typography(level3)).toEqual(await typography(level2));
      await demo.screenshot({
        path: `test-results/configuration-props-list-header-${name}.png`,
      });
    });

    test('TokenSearchField clearIcon replaces the clear glyph', async ({
      page,
    }) => {
      await page.goto('/?component=token-search-field');
      const disabled = page.locator(
        '[data-token-search-id="disabled-search"] .kui-token-search__clear',
      );
      await expect(disabled).toHaveAccessibleName('Clear search');
      await expect(
        disabled.locator('svg[data-lucide="circle-x"]'),
      ).toBeVisible();
      await expect(disabled.locator('svg[data-lucide="x"]')).toHaveCount(0);
      const glyph = await disabled.locator('svg').evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height };
      });
      expect(glyph.width).toBeGreaterThan(0);
      expect(glyph.width).toBe(glyph.height);
      await page
        .locator('[data-token-search-id="disabled-search"]')
        .screenshot({
          path: `test-results/configuration-props-token-search-${name}.png`,
        });
    });

    test('a framed content item paints a border without moving content', async ({
      page,
    }) => {
      await page.goto('/?component=pane');
      const plain = page.locator('.kui-content-item', {
        hasText: 'First content group',
      });
      const framed = page.locator('.kui-content-item--framed');
      await expect(framed).toHaveText('Framed content group');
      const geometry = (item: typeof plain) =>
        item.evaluate((element) => {
          const style = globalThis.getComputedStyle(element);
          return {
            borderWidth: style.borderTopWidth,
            padding: style.padding,
            marginInline: `${style.marginLeft} ${style.marginRight}`,
            left: element.getBoundingClientRect().left,
            color: style.borderTopColor,
          };
        });
      const plainGeometry = await geometry(plain);
      const framedGeometry = await geometry(framed);
      expect(plainGeometry.color).toBe('rgba(0, 0, 0, 0)');
      expect(framedGeometry.color).not.toBe('rgba(0, 0, 0, 0)');
      expect({ ...framedGeometry, color: '' }).toEqual({
        ...plainGeometry,
        color: '',
      });
      await page.locator('[data-demo="pane"]').screenshot({
        path: `test-results/configuration-props-pane-${name}.png`,
      });
    });
  });
}
