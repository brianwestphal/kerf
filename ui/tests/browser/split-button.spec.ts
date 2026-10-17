import { expect, test } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';
import { sampleInsetRing } from './fixtures/focus-ring-inset.js';

// Both halves are native buttons, so the trigger's state reaches the
// accessibility tree directly; the full-width variant fills its parent.
test('SplitButton exposes native halves and follows its controlled state', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=split-button');
    const demo = page.locator('[data-demo="split-button"]');
    const primary = demo.getByRole('button', { name: 'Drive with Codex' });
    const options = demo.getByRole('button', {
      name: 'Choose Drive Provider, Model, and Effort',
    });
    await expect(options).toHaveAttribute('aria-expanded', 'false');
    const split = demo.locator('.kui-split-button').first();
    const geometry = await split.evaluate((group) => {
      const parent = group.parentElement!.getBoundingClientRect();
      const box = group.getBoundingClientRect();
      const trigger = group
        .querySelector('.kui-split-button__options')!
        .getBoundingClientRect();
      return {
        height: box.height,
        width: box.width,
        parent: parent.width,
        trigger: trigger.width,
      };
    });
    expect(geometry.height).toBe(44);
    expect(geometry.width).toBeCloseTo(geometry.parent, 0);
    expect(geometry.trigger).toBe(40);
    // The full-width specimen starts on the same inset as every other
    // example's specimen instead of the demo column's edge.
    const starts = await demo
      .locator('.kui-catalog-example')
      .evaluateAll((examples) =>
        examples.map(
          (example) =>
            example.querySelector('.kui-split-button')!.getBoundingClientRect()
              .left,
        ),
      );
    for (const start of starts) expect(start).toBeCloseTo(starts[0]!, 0);
    const column = await demo.evaluate(
      (element) => element.getBoundingClientRect().left,
    );
    expect(starts[0]! - column).toBe(8);

    await primary.click();
    await expect(split).toHaveAttribute('data-tone', 'neutral');
    await expect(
      demo.getByRole('button', { name: 'Codex Running' }),
    ).toHaveAttribute('aria-busy', 'true');
    await options.click();
    await expect(options).toHaveAttribute('aria-expanded', 'true');
    await options.click();
    await demo.getByRole('button', { name: 'Codex Running' }).click();
    await expect(split).toHaveAttribute('data-tone', 'success');
  }
});

// shape="pill" fully rounds the group's outer ends, as on Button; each half
// rounds only its outer corners, so the divider seam stays square and the
// hover fill and focus ring follow the pill end.
test('a pill SplitButton rounds its outer ends and keeps the seam square', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=split-button');
    const demo = page.locator('[data-demo="split-button"]');
    const pill = demo.locator('.kui-split-button[data-shape="pill"]').first();
    await expect(pill).toBeVisible();
    const shape = await pill.evaluate((group) => {
      const radii = (element: Element) => {
        const style = window.getComputedStyle(element);
        return [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius,
        ];
      };
      const box = group.getBoundingClientRect();
      const trigger = group
        .querySelector('.kui-split-button__options')!
        .getBoundingClientRect();
      return {
        height: box.height,
        trigger: trigger.width,
        group: radii(group),
        primary: radii(group.querySelector('.kui-split-button__primary')!),
        options: radii(group.querySelector('.kui-split-button__options')!),
      };
    });
    expect(shape.height).toBe(44);
    expect(shape.trigger).toBe(40);
    expect(shape.group).toEqual(['22px', '22px', '22px', '22px']);
    expect(shape.primary).toEqual(['22px', '0px', '0px', '22px']);
    expect(shape.options).toEqual(['0px', '22px', '22px', '0px']);
    // The default stays on the shared rounded control radius.
    const rounded = demo.locator('.kui-split-button:not([data-shape])').first();
    await expect(rounded).toHaveCSS('border-top-left-radius', '12px');
  }
});

// The focus ring sits outside the focused half, offset like Button's, so it
// is drawn against the surrounding surface instead of the loud fill: an inset
// ring vanished on the brand fill, whose color can equal the ring's own. On
// every tone, in both schemes, each half draws a solid ring of at least 2px
// that clears 3:1 non-text contrast against the surface it sits on.
test('each SplitButton half draws a visible focus ring outside its fill', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto('/?component=split-button');
    const demo = page.locator('[data-demo="split-button"]');
    const halves = demo.locator(
      '.kui-split-button:not([data-focus-ring-inset]) > button:enabled',
    );
    const count = await halves.count();
    expect(count).toBeGreaterThan(6);
    for (let index = 0; index < count; index += 1) {
      const half = halves.nth(index);
      await page.keyboard.press('Shift');
      await half.focus();
      const ring = await half.evaluate((element) => {
        const context = document
          .createElement('canvas')
          .getContext('2d', { willReadFrequently: true })!;
        context.canvas.width = 1;
        context.canvas.height = 1;
        // Composite colors bottom-up; the canvas does the alpha blending.
        const paint = (colors: string[]) => {
          context.fillStyle = '#000';
          context.fillRect(0, 0, 1, 1);
          for (const color of colors) {
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
          }
          return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        // The surface the group sits on: every ancestor's background color,
        // from the root's opaque canvas up to the group's parent.
        const layers: string[] = [];
        for (
          let ancestor = element.parentElement!.parentElement;
          ancestor;
          ancestor = ancestor.parentElement
        )
          layers.unshift(window.getComputedStyle(ancestor).backgroundColor);
        const surface = paint(layers);
        const style = window.getComputedStyle(element);
        return {
          focusVisible: element.matches(':focus-visible'),
          style: style.outlineStyle,
          width: parseFloat(style.outlineWidth),
          offset: parseFloat(style.outlineOffset),
          color: paint([...layers, style.outlineColor]),
          surface,
        };
      });
      expect(ring.focusVisible).toBe(true);
      expect(ring.style).toBe('solid');
      expect(ring.width).toBeGreaterThanOrEqual(2);
      expect(ring.offset).toBeGreaterThanOrEqual(0);
      expect(contrastRatio(ring.color, ring.surface)).toBeGreaterThanOrEqual(3);
    }
  }
});

// focusRingInset moves each half's ring inside its box so a clipping
// ancestor (the specimen frame clips overflow) cannot crop it. The loud fill
// can share the ring's hue, so a surface-colored line runs inside the ring:
// the ring meets a surface color on both edges and clears 3:1 against each,
// on every tone, in both schemes.
test('an inset SplitButton ring stays inside a clipping container on every tone', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto('/?component=split-button');
    const demo = page.locator('[data-demo="split-button"]');
    const groups = demo.locator(
      '[data-demo-section="focus-ring-inset"] > .kui-split-button',
    );
    await expect(groups).toHaveCount(3);
    for (const tone of ['brand', 'neutral', 'danger']) {
      const group = groups.and(demo.locator(`[data-tone="${tone}"]`));
      await expect(group).toHaveAttribute('data-focus-ring-inset', 'true');
      for (const half of ['primary', 'options']) {
        const button = group.locator(`.kui-split-button__${half}`);
        const ring = await sampleInsetRing(page, button, 4.5);
        expect(ring.clipOverflow).toBe('hidden');
        expect(ring.clipped).toBe(true);
        expect(ring.width).toBe(3);
        expect(ring.offset + ring.width).toBeLessThanOrEqual(0);
        expect(contrastRatio(ring.ringOuter, ring.ringInner)).toBeLessThan(1.1);
        expect(
          contrastRatio(ring.ringOuter, ring.outside),
        ).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(ring.ringInner, ring.line)).toBeGreaterThanOrEqual(
          3,
        );
        expect(contrastRatio(ring.line, ring.fill)).toBeGreaterThan(1.5);
      }
    }
  }
});
