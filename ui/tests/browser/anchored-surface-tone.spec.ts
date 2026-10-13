import { expect, type Locator, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';
import { minPaintedTextContrast } from './painted-contrast.js';

// The dark tone is the loud, inverse tone of a dark ToolbarControlGroup: a
// popup anchored to dark media chrome is dark beside a light page and light
// beside a dark one, matching the group that opened it. It flips only the
// surface's color-scheme, so the content's text, borders, and focus rings
// resolve the shared light-dark() tokens to the other side by inheritance;
// nothing styles the children from the surface.

const surface = '[data-component="anchored-surface"]';

/** The focused element's outline color painted over the surface fill. */
async function focusRingContrast(control: Locator): Promise<number> {
  const colors = await control.evaluate((element) => {
    const context = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true })!;
    context.canvas.width = 1;
    context.canvas.height = 1;
    const paint = (color: string) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
    };
    const pixel = () => [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    paint('Canvas');
    // The ring sits outside the control, over the surface's own fill.
    paint(
      window.getComputedStyle(
        element.closest('[data-component="anchored-surface"]')!,
      ).backgroundColor,
    );
    const background = pixel();
    const style = window.getComputedStyle(element);
    if (style.outlineStyle === 'none' || parseFloat(style.outlineWidth) === 0)
      throw new Error('The focused control draws no focus ring');
    paint(style.outlineColor);
    return { foreground: pixel(), background };
  });
  return contrastRatio(colors.foreground, colors.background)!;
}

/** Average channel brightness (0-255) of the colors that define each side. */
async function tones(page: Page) {
  return page.evaluate((selector) => {
    const brightness = (color: string) => {
      const context = document.createElement('canvas').getContext('2d')!;
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      return (r! + g! + b!) / 3;
    };
    const element = document.querySelector(selector)!;
    const row = element.querySelector('.kui-list-item')!;
    const anchor = document.querySelector(
      '[data-anchored-surface-trigger="media"]',
    )!;
    return {
      colorScheme: window.getComputedStyle(element).colorScheme,
      rowScheme: window.getComputedStyle(row).colorScheme,
      fill: brightness(window.getComputedStyle(element).backgroundColor),
      text: brightness(window.getComputedStyle(row).color),
      anchorIcon: brightness(window.getComputedStyle(anchor).color),
      page: brightness(window.getComputedStyle(document.documentElement).color),
    };
  }, surface);
}

// `preference` is the emulated OS scheme; `toggle` switches the catalog's
// explicit theme (an html `color-scheme` class) away from it, so both the
// `light dark` preference path and an explicit page scheme are covered.
for (const [preference, toggle, pageScheme] of [
  ['light', false, 'light'],
  ['dark', false, 'dark'],
  ['light', true, 'dark'],
] as const)
  for (const width of [1280, 390])
    test(`${pageScheme} page (${preference} preference${toggle ? ', explicit theme' : ''}) ${width}px: the dark tone inverts and keeps AA text and focus rings`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ colorScheme: preference });
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/?component=anchored-surface');
      if (toggle) {
        await page.locator('html').evaluate((html) => {
          html.classList.remove('demo-light');
          html.classList.add('demo-dark');
        });
      }
      const trigger = page.getByRole('button', { name: 'Volume' });
      await trigger.click();
      const volume = page.locator(surface);
      await expect(volume).toBeVisible();
      await expect(volume).toHaveAttribute('data-tone', 'dark');
      await expect(volume).toHaveAttribute('aria-label', 'Volume');

      // The opposite of the page's scheme, already on open (no color
      // transition running in the content), on the same side as the dark
      // control group's icon color: popup and anchor read as one tone.
      const inverse = pageScheme === 'light' ? 'dark' : 'light';
      const measured = await tones(page);
      expect(measured.colorScheme).toBe(inverse);
      expect(measured.rowScheme).toBe(inverse);
      if (inverse === 'dark') {
        expect(measured.fill).toBeLessThan(80);
        expect(measured.text).toBeGreaterThan(180);
      } else {
        expect(measured.fill).toBeGreaterThan(180);
        expect(measured.text).toBeLessThan(80);
      }
      expect(measured.anchorIcon > 128).toBe(measured.text > 128);
      expect(measured.page > 128).not.toBe(measured.text > 128);

      // Text: the mute row's label meets AA over the surface fill.
      const mute = volume.getByRole('button', { name: 'Mute' });
      await expect(mute).toBeFocused(); // the first focusable descendant
      expect(
        await minPaintedTextContrast(volume.locator('.kui-list-item__label')),
      ).toBeGreaterThanOrEqual(4.5);

      // Keyboard focus ring: non-text contrast of at least 3:1.
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(mute).toBeFocused();
      expect(await focusRingContrast(mute)).toBeGreaterThanOrEqual(3);
      // Content arriving after open (the slider renders a microtask later)
      // grows the above-placed surface upward: it never covers its anchor.
      const [surfaceBox, anchorBox] = await Promise.all([
        volume.boundingBox(),
        trigger.boundingBox(),
      ]);
      expect(surfaceBox!.y + surfaceBox!.height).toBeLessThanOrEqual(
        anchorBox!.y + 1,
      );

      // Capture the anchor at rest beside its open popup, not hovered.
      await page.mouse.move(width - 4, 796);
      await page.screenshot({
        path: `test-results/anchored-surface-dark-tone-${pageScheme}${toggle ? '-explicit' : ''}-${width}-${testInfo.project.name}.png`,
      });

      // The mute row works and the slider follows it.
      await mute.click();
      await expect(mute).toHaveAttribute('aria-pressed', 'true');
      await expect(volume.locator('wa-slider')).toHaveAttribute('disabled', '');
      await mute.click();
      await expect(mute).toHaveAttribute('aria-pressed', 'false');

      await page.keyboard.press('Escape');
      await expect(volume).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

// KF-49W7J2: an open dark-tone surface follows a live scheme switch, both
// an explicit app theme toggled on an ancestor and the OS preference.
test('an open dark-tone surface follows a live theme switch and OS preference change', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?component=anchored-surface');
  await page.getByRole('button', { name: 'Volume' }).click();
  const volume = page.locator(surface);
  await expect(volume).toBeVisible();
  const scheme = () =>
    volume.evaluate((element) => window.getComputedStyle(element).colorScheme);
  expect(await scheme()).toBe('dark');

  // The app's explicit theme flips while the popup is open.
  await page.locator('html').evaluate((html) => {
    html.classList.remove('demo-light');
    html.classList.add('demo-dark');
  });
  await expect.poll(scheme).toBe('light');
  // A live switch runs the content's color transitions, as the page's do.
  await expect
    .poll(async () => {
      const flipped = await tones(page);
      return { fill: flipped.fill > 180, text: flipped.text < 80 };
    })
    .toEqual({ fill: true, text: true });
  expect(
    await minPaintedTextContrast(volume.locator('.kui-list-item__label')),
  ).toBeGreaterThanOrEqual(4.5);

  // Back to following the OS preference, which then changes.
  await page.locator('html').evaluate((html) => {
    html.classList.remove('demo-dark');
  });
  await expect.poll(scheme).toBe('dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(scheme).toBe('light');
  await expect(volume).toBeVisible();
});

test('the default tone follows the page scheme and sets no tone', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/?component=anchored-surface');
  await page.getByRole('button', { name: 'Explain This Field' }).click();
  const help = page.locator(surface);
  await expect(help).toBeVisible();
  await expect(help).not.toHaveAttribute('data-tone');
  expect(
    await help.evaluate(
      (element) => window.getComputedStyle(element).colorScheme,
    ),
  ).toBe('light dark');
});
