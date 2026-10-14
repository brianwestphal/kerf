/**
 * Real-browser spec for `presentation: 'bottom-sheet'` on `kerfjs/overlay`
 * (docs/19 §19.9). kerf ships no CSS, so each test installs the recipe from
 * `docs/8-api-reference.md` › `overlay` and checks what only a real engine can
 * show: the plain `<div>` and the native `<dialog>` host both rest flush on the
 * bottom edge, and a real `visualViewport` event reaches the wrapper as
 * `--kerf-keyboard-inset`, which the recipe turns into block-end padding.
 * Playwright cannot raise a virtual keyboard, so the keyboard is simulated by
 * reporting a taller layout viewport (`innerHeight`) than the visual one and
 * firing the visual viewport's own `resize` event.
 */
import { expect, type Page, test } from '@playwright/test';

const RECIPE = `
div.kerf-overlay[data-presentation="bottom-sheet"] {
  position: fixed; inset: 0; display: flex;
  align-items: flex-end; justify-content: center;
  background: rgb(0 0 0 / 0.35);
}
div.kerf-overlay[data-presentation="bottom-sheet"] > *,
dialog.kerf-overlay[data-presentation="bottom-sheet"] {
  box-sizing: border-box;
  inline-size: min(100%, 40rem);
  max-inline-size: 100%;
  margin: 0;
  border: 0;
  border-radius: 12px 12px 0 0;
  padding: 16px 16px calc(16px + max(env(safe-area-inset-bottom), var(--kerf-keyboard-inset, 0px)));
  background: white;
  font: 16px system-ui, sans-serif;
}
dialog.kerf-overlay[data-presentation="bottom-sheet"] { margin: auto auto 0; }
dialog.kerf-overlay[data-presentation="bottom-sheet"]::backdrop { background: rgb(0 0 0 / 0.35); }
.kerf-confirm__actions { display: flex; gap: 8px; justify-content: flex-end; }
`;

async function open(page: Page, native: boolean): Promise<void> {
  await page.addStyleTag({ content: RECIPE });
  await page.evaluate((nativeHost) => {
    const { confirm } = (window as any).kerfOverlay;
    (window as any)._answer = confirm('Discard this draft?', {
      title: 'Discard draft',
      presentation: 'bottom-sheet',
      native: nativeHost,
    });
  }, native);
}

/** The sheet panel: the `<dialog>` itself, or the plain wrapper's child. */
const panelRect = (page: Page) =>
  page.evaluate(() => {
    const wrapper = document.querySelector(
      '[data-presentation="bottom-sheet"]',
    ) as HTMLElement;
    const panel =
      wrapper.tagName === 'DIALOG'
        ? wrapper
        : (wrapper.firstElementChild as HTMLElement);
    const r = panel.getBoundingClientRect();
    return {
      tag: wrapper.tagName,
      left: r.left,
      width: r.width,
      bottom: r.bottom,
      layoutHeight: document.documentElement.clientHeight,
      layoutWidth: document.documentElement.clientWidth,
      padding: window.getComputedStyle(panel).paddingBottom,
      inset: wrapper.style.getPropertyValue('--kerf-keyboard-inset'),
    };
  });

const shot = async (page: Page, name: string): Promise<void> => {
  const dir = process.env.KERF_SHOT_DIR;
  if (dir !== undefined)
    await page.screenshot({
      path: `${dir}/${test.info().project.name}-${name}.png`,
    });
};

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

for (const native of [false, true]) {
  const host = native ? 'native <dialog>' : 'plain <div>';

  test(`${host}: a phone-width sheet runs full width, flush to the bottom edge`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await open(page, native);
    const rect = await panelRect(page);
    expect(rect.tag).toBe(native ? 'DIALOG' : 'DIV');
    expect(Math.abs(rect.bottom - rect.layoutHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(rect.width - rect.layoutWidth)).toBeLessThanOrEqual(1);
    expect(rect.inset).toBe('');
    await shot(page, `${native ? 'native' : 'plain'}-phone`);
  });

  test(`${host}: a wide-screen sheet is capped and centered on the bottom edge`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await open(page, native);
    const rect = await panelRect(page);
    expect(Math.abs(rect.bottom - rect.layoutHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(rect.width - 640)).toBeLessThanOrEqual(1);
    expect(
      Math.abs(rect.left - (rect.layoutWidth - rect.width) / 2),
    ).toBeLessThanOrEqual(1);
    await shot(page, `${native ? 'native' : 'plain'}-wide`);
  });

  test(`${host}: a keyboard overlap from visualViewport pads the sheet, and clears on hide and close`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await open(page, native);
    // Keyboard appears mid-dialog: the layout viewport now reports 300px more
    // than the visual viewport covers.
    await page.evaluate(() => {
      const viewport = window.visualViewport as VisualViewport;
      const layoutHeight = window.innerHeight;
      (window as any)._keyboard = 300;
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        get: () => layoutHeight + (window as any)._keyboard,
      });
      viewport.dispatchEvent(new Event('resize'));
    });
    let rect = await panelRect(page);
    expect(rect.inset).toBe('300px');
    expect(rect.padding).toBe('316px');
    await shot(page, `${native ? 'native' : 'plain'}-keyboard`);

    // Keyboard hides.
    await page.evaluate(() => {
      (window as any)._keyboard = 0;
      window.visualViewport?.dispatchEvent(new Event('resize'));
    });
    rect = await panelRect(page);
    expect(rect.inset).toBe('');
    expect(rect.padding).toBe('16px');

    // Close through the dialog's own OK; the sheet and its watch go away.
    await page.click('[data-confirm="ok"]');
    expect(await page.evaluate(() => (window as any)._answer)).toBe(true);
    await expect(page.locator('[data-presentation]')).toHaveCount(0);
  });
}
