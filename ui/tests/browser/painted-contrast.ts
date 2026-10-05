import type { Locator } from '@playwright/test';

import { contrastRatio } from '../../evaluator/index.mjs';

/**
 * Text over solid CSS color layers, including translucent ancestor fills.
 * Canvas resolves the browser's color syntax; background images, filters, and
 * group opacity need a separate visual review and are outside this measurement.
 */
export async function minPaintedTextContrast(
  locator: Locator,
): Promise<number> {
  const colors = await locator.evaluateAll((elements) => {
    const context = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Contrast measurement requires a canvas');
    context.canvas.width = 1;
    context.canvas.height = 1;
    const paint = (color: string) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
    };
    const pixel = () => [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    return elements.map((element) => {
      const ancestors: Element[] = [];
      for (let node: Element | null = element; node;) {
        ancestors.unshift(node);
        const root = node.getRootNode();
        node =
          node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
      }
      context.clearRect(0, 0, 1, 1);
      // The browser canvas behind a document with no explicit root fill.
      paint('Canvas');
      for (const node of ancestors)
        paint(window.getComputedStyle(node).backgroundColor);
      const background = pixel();
      paint(window.getComputedStyle(element).color);
      return { foreground: pixel(), background };
    });
  });
  if (colors.length === 0)
    throw new Error('No elements to measure for contrast');
  return Math.min(
    ...colors.map(({ foreground, background }) => {
      const ratio = contrastRatio(foreground, background);
      if (ratio === null) throw new Error('Invalid painted contrast colors');
      return ratio;
    }),
  );
}
