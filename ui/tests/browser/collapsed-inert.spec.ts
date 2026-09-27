import { resolve } from 'node:path';

import { expect, type Locator, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

// A collapsed CollapsiblePanel or ResizableRegion is itself inert and
// aria-hidden (no empty landmark stays behind), so Tab never reaches controls that slid
// out of view (focusing one scrolled the clipped panel and exposed a control
// inside an aria-hidden subtree). The slide-out still animates, wireSidebar's
// focus hand-off still lands on a reachable control, and restore controls stay
// outside the inert subtree.

const fixtureBundle = build({
  entryPoints: [resolve(import.meta.dirname, 'fixtures/collapsed-inert.tsx')],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

async function mountFixture(page: Page): Promise<void> {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Inert fixture emitted no JS/CSS');
  await page.setContent(
    '<!doctype html><html><body style="margin:0"><div data-inert-host></div></body></html>',
  );
  await page.addStyleTag({
    content: css.text.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });
  await page.addScriptTag({ content: javascript.text });
  await expect(page.locator('[data-collapsible-panel="nav"]')).toHaveCount(1);
}

const nav = (page: Page) => page.locator('[data-collapsible-panel="nav"]');
const output = (page: Page) =>
  page.locator('[data-component="resizable-region"][data-region-id="output"]');
const outputContent = (page: Page) =>
  output(page).locator('> .kui-resizable-region__content');
const button = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true });
// The rail's own collapse toggle and the work area's expand toggle share an
// action (and, while collapsed, a label), so each is located by placement.
const hideNav = (page: Page) => nav(page).locator('[data-action="toggle-nav"]');
const showNav = (page: Page) => page.locator('main [data-action="toggle-nav"]');

/** Whether focus sits anywhere inside a collapsed panel or region. */
const focusInCollapsed = (page: Page) =>
  page.evaluate(
    () =>
      document.activeElement?.closest(
        '[data-collapsible-panel][data-collapsed="true"], [data-component="resizable-region"][data-collapsed="true"]',
      ) != null,
  );

// WebKit on macOS leaves buttons out of the plain Tab order (the platform's
// "Press Tab to highlight each item" default); Option+Tab walks every control.
const tabKey = (browserName: string, shift = false) =>
  `${browserName === 'webkit' ? 'Alt+' : ''}${shift ? 'Shift+' : ''}Tab`;

/** Walk Tab and Shift+Tab from `start`, asserting focus never enters a collapsed panel. */
async function expectTabSkipsCollapsed(
  page: Page,
  start: Locator,
  browserName: string,
) {
  for (const key of [tabKey(browserName), tabKey(browserName, true)]) {
    await start.focus();
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press(key);
      expect(await focusInCollapsed(page)).toBe(false);
    }
  }
}

/** Click `control` and report whether `selector`'s element was animating right after. */
const clickAndSampleAnimation = (control: Locator, selector: string) =>
  control.evaluate((element: HTMLElement, contentSelector) => {
    const content = element
      .closest('[data-collapsible-panel], [data-component="resizable-region"]')!
      .querySelector(contentSelector)!;
    element.click();
    return content
      .getAnimations()
      .some((animation) => animation.playState === 'running');
  }, selector);

for (const width of [1280, 390]) {
  test.describe(`at ${String(width)}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await mountFixture(page);
    });

    test('a collapsed CollapsiblePanel is inert and wireSidebar hands focus across it', async ({
      page,
      browserName,
    }) => {
      if (width === 1280) {
        // Wide: the rail starts open and inline. Hiding it from its own
        // header still slides the content out, and focus moves to the main
        // area's expand toggle rather than the now-inert collapse toggle.
        await expect(nav(page)).toHaveAttribute('data-collapsed', 'false');
        await expect(nav(page)).not.toHaveAttribute('inert');
        const hide = hideNav(page);
        await hide.focus();
        expect(
          await clickAndSampleAnimation(
            hide,
            '.kui-collapsible-panel__content',
          ),
        ).toBe(true);
      }
      // Narrow (compact), the wire collapses the overlay rail at wire-up.
      await expect(nav(page)).toHaveAttribute('data-collapsed', 'true');
      await expect(nav(page)).toHaveAttribute('inert', '');
      await expect(nav(page)).toHaveAttribute('aria-hidden', 'true');
      const show = showNav(page);
      if (width === 1280) await expect(show).toBeFocused();
      await expectTabSkipsCollapsed(page, show, browserName);
      expect(await nav(page).evaluate((element) => element.scrollLeft)).toBe(0);

      // Showing it makes the content reachable again and focus moves in.
      await show.focus();
      await page.keyboard.press('Enter');
      await expect(nav(page)).toHaveAttribute('data-collapsed', 'false');
      await expect(nav(page)).not.toHaveAttribute('inert');
      await expect(hideNav(page)).toBeFocused();
      await page.keyboard.press(tabKey(browserName));
      await expect(button(page, 'Inbox')).toBeFocused();

      // Collapse again from inside: focus returns to the expand toggle.
      if (width === 390) await page.keyboard.press('Escape');
      else await hideNav(page).click();
      await expect(nav(page)).toHaveAttribute('inert', '');
      await expect(showNav(page)).toBeFocused();
    });

    test('a collapsed ResizableRegion is inert and hidden while its restore control stays reachable', async ({
      page,
      browserName,
    }) => {
      await expect(outputContent(page)).not.toHaveAttribute('inert');
      const hide = button(page, 'Hide output');
      await hide.focus();
      expect(
        await clickAndSampleAnimation(hide, '.kui-resizable-region__content'),
      ).toBe(true);
      await expect(output(page)).toHaveAttribute('data-collapsed', 'true');
      await expect(outputContent(page)).toHaveAttribute('inert', '');
      // The labeled region itself leaves the accessibility tree, so no empty
      // region landmark stays behind.
      await expect(output(page)).toHaveAttribute('aria-hidden', 'true');
      await expect(output(page)).toHaveAttribute('inert', '');
      await expect(
        page.getByRole('region', { name: 'Output', exact: true }),
      ).toHaveCount(0);
      const show = button(page, 'Show output');
      await expect(show).toBeFocused();
      await expectTabSkipsCollapsed(page, show, browserName);
      await expectTabSkipsCollapsed(page, button(page, 'After'), browserName);

      await show.press('Enter');
      await expect(output(page)).toHaveAttribute('data-collapsed', 'false');
      await expect(outputContent(page)).not.toHaveAttribute('inert');
      await expect(
        page.getByRole('region', { name: 'Output', exact: true }),
      ).toHaveCount(1);
      await expect(button(page, 'Hide output')).toBeFocused();
    });
  });
}

test('a wide-to-compact crossing collapses the rail and rescues focus from inside it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await mountFixture(page);
  await button(page, 'Projects').focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav(page)).toHaveAttribute('data-collapsed', 'true');
  await expect(nav(page)).toHaveAttribute('inert', '');
  await expect(showNav(page)).toBeFocused();
});
