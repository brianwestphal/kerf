// Measures an inset focus ring as rendered: the pixels a screenshot paints
// across a focused control's top edge, from the surface above it into its
// fill. Shared by the Button and SplitButton `focusRingInset` specs.
import type { Locator, Page } from '@playwright/test';

type Rgb = [number, number, number];

export interface InsetRingSample {
  /** Computed outline offset and width; the ring's outer edge is their sum. */
  offset: number;
  width: number;
  /** Whether the nearest overflow-clipping ancestor holds the whole box. */
  clipped: boolean;
  clipOverflow: string;
  /** The surface just outside the control, above its top edge. */
  outside: Rgb;
  /** The ring band, 1px and 2px inside the top edge. */
  ringOuter: Rgb;
  ringInner: Rgb;
  /** The surface-colored line inside the ring. */
  line: Rgb;
  /** The control's own fill, below the line. */
  fill: Rgb;
}

/**
 * Focuses `control` from the keyboard modality and samples its top edge at
 * the horizontal middle. `lineDepth` is how far inside the top edge the
 * surface line sits (the ring is 3px; Button's line follows its 1px border).
 */
export async function sampleInsetRing(
  page: Page,
  control: Locator,
  lineDepth: number,
): Promise<InsetRingSample> {
  // The catalog scrolls smoothly, so place the control instantly.
  await control.evaluate((element) =>
    element.scrollIntoView({ block: 'center', behavior: 'instant' }),
  );
  await page.mouse.move(1, 1);
  await page.keyboard.press('Shift');
  await control.focus();
  const measure = () =>
    control.evaluate((element) => {
      const style = window.getComputedStyle(element);
      let clip: Element | null = element.parentElement;
      while (clip && window.getComputedStyle(clip).overflow === 'visible')
        clip = clip.parentElement;
      const rect = element.getBoundingClientRect();
      const clipRect = clip?.getBoundingClientRect();
      return {
        focusVisible: element.matches(':focus-visible'),
        offset: parseFloat(style.outlineOffset),
        width: parseFloat(style.outlineWidth),
        clipOverflow: clip ? window.getComputedStyle(clip).overflow : 'none',
        clipped:
          clipRect !== undefined &&
          rect.left >= clipRect.left - 0.5 &&
          rect.top >= clipRect.top - 0.5 &&
          rect.right <= clipRect.right + 0.5 &&
          rect.bottom <= clipRect.bottom + 0.5,
        x: rect.left + rect.width / 2,
        top: rect.top,
      };
    });
  // A host stylesheet may transition the line in (Web Awesome's native
  // button styles fade box-shadow over 75ms); sample its settled color.
  await control.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const box = await measure();
  const png = await page.screenshot();
  if (!box.focusVisible) throw new Error('control is not :focus-visible');
  const at = (depth: number): [number, number] => [box.x, box.top + depth];
  const [outside, ringOuter, ringInner, line, fill] = await page.evaluate(
    async ({ data, points }) => {
      const image = new window.Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(image, 0, 0);
      const scale = image.width / window.innerWidth;
      return points.map(
        ([x, y]) =>
          [
            ...context
              .getImageData(Math.floor(x * scale), Math.floor(y * scale), 1, 1)
              .data.slice(0, 3),
          ] as [number, number, number],
      );
    },
    {
      data: png.toString('base64'),
      points: [at(-2.5), at(0.5), at(2.5), at(lineDepth), at(lineDepth + 3)],
    },
  );
  return {
    offset: box.offset,
    width: box.width,
    clipped: box.clipped,
    clipOverflow: box.clipOverflow,
    outside: outside!,
    ringOuter: ringOuter!,
    ringInner: ringInner!,
    line: line!,
    fill: fill!,
  };
}
