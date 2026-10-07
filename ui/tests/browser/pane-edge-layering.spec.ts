import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/pane-edge-layering.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

test('keeps Workbench and Pane focus outlines and scrolling controls above an edge-to-edge matrix', async ({
  page,
  browserName,
}) => {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  );
  const css = result.outputFiles.find((file) => file.path.endsWith('.css'));
  if (!javascript || !css) throw new Error('Pane fixture emitted no JS or CSS');

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await page.setContent(
      '<!doctype html><html><body><div class="kui-app-root" data-fixture-root></div></body></html>',
    );
    await page.addStyleTag({
      content: css.text.replace(
        /remify\(([\d.]+)px\)/g,
        (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
      ),
    });
    await page.addStyleTag({
      content: `
        html, body, .kui-app-root { height: 100%; margin: 0; }
        .kui-pane { --kui-pane-scrollbar-gutter: stable; }
        .edge-list { min-height: 1200px; }
        .edge-matrix {
          position: relative;
          width: calc(100% + var(--kui-pane-content-inset-inline-start) + var(--kui-pane-content-inset-inline-end));
          margin-inline-start: calc(-1 * var(--kui-pane-content-inset-inline-start));
          margin-inline-end: calc(-1 * var(--kui-pane-content-inset-inline-end));
          overflow-x: auto;
          background: #fff;
        }
        .edge-matrix__wide { display: flex; align-items: center; gap: 24px; width: 1500px; height: 180px; padding: 24px; box-sizing: border-box; background: #fff; }
        .edge-matrix__filler { height: 1000px; }
      `,
    });
    await page.addScriptTag({ content: javascript.text });

    const main = page.locator('[data-workbench-main]');
    const pane = main.locator(':scope > [data-component="pane"]');
    const content = pane.locator(':scope > .kui-pane__content');
    const matrix = content.locator('[data-edge-matrix]');
    await expect(main).toHaveAttribute('data-outlined', 'true');
    await expect(pane).toHaveAttribute('data-outlined', 'true');
    await expect(pane).toHaveAttribute('data-deep-inset', 'true');
    await expect(pane).toHaveAttribute('data-appearance', 'sunken');
    for (const region of [main, pane]) {
      const ring = await region.evaluate((element) => {
        const style = window.getComputedStyle(element, '::after');
        return {
          outlineStyle: style.outlineStyle,
          pointerEvents: style.pointerEvents,
        };
      });
      expect(ring).toEqual({ outlineStyle: 'solid', pointerEvents: 'none' });
    }
    const geometry = await pane.evaluate((element) => {
      const content = element.querySelector<HTMLElement>('.kui-pane__content')!;
      const matrix = element.querySelector<HTMLElement>('[data-edge-matrix]')!;
      const paneRect = element.getBoundingClientRect();
      const matrixRect = matrix.getBoundingClientRect();
      return {
        start: matrixRect.left - paneRect.left,
        end: paneRect.right - matrixRect.right,
        gutter: content.offsetWidth - content.clientWidth,
        scrollbarGutter: window.getComputedStyle(content).scrollbarGutter,
      };
    });
    expect(Math.abs(geometry.start)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.end - geometry.gutter)).toBeLessThanOrEqual(1);
    expect(geometry.scrollbarGutter).toBe('stable');
    if (browserName === 'chromium')
      await main.screenshot({
        path: `test-results/pane-edge-layering-top-${width}.png`,
      });

    await page.evaluate(() => {
      (window as unknown as { edgeCellClicks: number }).edgeCellClicks = 0;
      document
        .querySelector('[data-edge-cell]')!
        .addEventListener('click', () => {
          (window as unknown as { edgeCellClicks: number }).edgeCellClicks += 1;
        });
    });
    await matrix.locator('[data-edge-cell]').click();
    expect(
      await page.evaluate(
        () => (window as unknown as { edgeCellClicks: number }).edgeCellClicks,
      ),
    ).toBe(1);
    await matrix.locator('[data-edge-select]').selectOption('Approved');
    await expect(matrix.locator('[data-edge-select]')).toHaveValue('Approved');
    await matrix.evaluate((element) => {
      element.scrollLeft = 150;
    });
    expect(await matrix.evaluate((element) => element.scrollLeft)).toBe(150);
    await content.evaluate((element) => {
      element.scrollTop = 120;
    });
    expect(await content.evaluate((element) => element.scrollTop)).toBe(120);
    if (browserName === 'chromium')
      await main.screenshot({
        path: `test-results/pane-edge-layering-scrolled-${width}.png`,
      });
  }
});
