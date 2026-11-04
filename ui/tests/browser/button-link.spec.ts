import { expect, type Locator, type Page, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';

// KF-RESJ2S: Button's link emphasis draws a <button> with an action or a
// link as inline underlined link text, with no control box, the standard
// focus ring, and AA link contrast in both themes; a link-emphasis Button in
// a tinted ContentItem feed card takes the card's accent link color.

const log = (page: Page) => page.locator('.catalog-log');

async function openDemo(page: Page, component: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/?component=${component}`);
  return page.locator(`[data-demo="${component}"]`);
}

/** The control's text color and the nearest opaque fill behind it, as RGB. */
async function textOnSurface(control: Locator) {
  return control.evaluate((element) => {
    const toRgb = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#fff';
      context.fillRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    // The catalog stage paints a checkerboard, so measure against the page
    // surface token the link sits on in an application.
    const probe = document.createElement('span');
    probe.style.color = 'var(--kui-color-surface)';
    element.parentElement!.append(probe);
    const fill = window.getComputedStyle(probe).color;
    probe.remove();
    return {
      text: toRgb(window.getComputedStyle(element).color),
      surface: toRgb(fill),
    };
  });
}

async function linkLook(control: Locator) {
  return control.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const label = element.querySelector('.kui-button__label')!;
    const probe = document.createElement('span');
    probe.style.color = 'var(--kui-color-text-link)';
    element.parentElement!.append(probe);
    const linkColor = window.getComputedStyle(probe).color;
    probe.remove();
    const box = element.getBoundingClientRect();
    return {
      color: style.color,
      linkColor,
      background: style.backgroundColor,
      border: style.borderTopWidth,
      padding: style.paddingInlineStart,
      decoration: window.getComputedStyle(label).textDecorationLine,
      height: box.height,
      right: box.right,
      viewport: document.documentElement.clientWidth,
    };
  });
}

test('the link emphasis draws a button or a link as inline link text', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [1100, 390]) {
      const demo = await openDemo(page, 'button', width);
      const section = demo.locator('[data-demo-section="link-emphasis"]');
      const notes = section.getByRole('link', { name: 'Read the Notes' });
      const details = section.getByRole('button', { name: 'Show Details' });
      await expect(notes).toHaveAttribute('href', '#button');
      for (const control of [notes, details]) {
        await expect(control).toHaveAttribute('data-emphasis', 'link');
        const look = await linkLook(control);
        expect(look.color).toBe(look.linkColor);
        expect(look.background).toBe('rgba(0, 0, 0, 0)');
        expect(look.border).toBe('0px');
        expect(look.padding).toBe('0px');
        expect(look.decoration).toBe('underline');
        // Inline text, not the 44px control box, and never clipped.
        expect(look.height).toBeGreaterThan(10);
        expect(look.height).toBeLessThan(32);
        expect(look.right).toBeLessThanOrEqual(look.viewport);
        const { text, surface } = await textOnSurface(control);
        expect(
          contrastRatio(text, surface),
          `${colorScheme} ${width}px link text`,
        ).toBeGreaterThanOrEqual(4.5);
      }
      // Hovering paints no fill.
      await details.hover();
      await expect(details).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      // Keyboard focus draws the standard ring around the text.
      await page.mouse.click(1, 1);
      await page.keyboard.press('Shift');
      await details.focus();
      await expect(details).toBeFocused();
      await expect(details).toHaveCSS('outline-style', 'solid');
      await expect(details).toHaveCSS('outline-width', '3px');
      await expect(details).toHaveCSS('outline-offset', '1px');
      // It still acts like the button it is.
      await details.click();
      await expect(log(page)).toHaveText('More actions requested');
      const disabled = section.getByRole('button', { name: 'Unavailable' });
      await expect(disabled).toBeDisabled();
      await expect(disabled).toHaveCSS('opacity', '0.5');
    }
  }
});

test('a feed card links its source with a link-emphasis Button', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    const demo = await openDemo(page, 'content-item', width);
    const card = demo.locator('[data-feed-card="1"]');
    const source = card.getByRole('link', { name: 'Source' });
    await expect(source).toHaveClass(/kui-button/);
    await expect(source).toHaveAttribute('data-emphasis', 'link');
    const look = await linkLook(source);
    // The tinted card's accent re-derives the link color in its scope.
    expect(look.color).toBe(look.linkColor);
    expect(look.decoration).toBe('underline');
    expect(look.right).toBeLessThanOrEqual(look.viewport);
  }
});
