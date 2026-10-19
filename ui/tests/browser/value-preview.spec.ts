import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(import.meta.dirname, 'fixtures/value-preview-consumer.tsx'),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = ['foundation', 'sunken-panel', 'value-preview']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

test('ValuePreview preserves and bounds multiline values at wide and narrow sizes', async ({
  page,
}, testInfo) => {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setContent(
    '<body style="margin:0;padding:16px"><div data-app style="max-width:440px"></div></body>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
  const remote = page.locator('[data-component="value-preview"]');
  await expect(remote).toBeVisible();
  await expect(remote).toHaveAttribute('aria-label', 'Their Latest Version');
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const state = await remote.evaluate((output) => {
      const style = window.getComputedStyle(output);
      const panel = output.closest('[data-component="sunken-panel"]')!;
      return {
        value: output.textContent,
        height: output.getBoundingClientRect().height,
        scrollHeight: output.scrollHeight,
        horizontalOverflow: output.scrollWidth - output.clientWidth,
        panelPadding: window.getComputedStyle(panel).padding,
        whiteSpace: style.whiteSpace,
        wrap: style.overflowWrap,
        fontSize: style.fontSize,
      };
    });
    expect(state.value).toContain('A title with a deliberate line break\n');
    expect(state.value).toContain('recorded-source-'.repeat(18));
    expect(state.height).toBeGreaterThanOrEqual(48);
    expect(state.height).toBeLessThanOrEqual(97);
    expect(state.scrollHeight).toBeGreaterThan(state.height);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(state.whiteSpace).toBe('pre-wrap');
    expect(state.wrap).toBe('anywhere');
    expect(state.fontSize).toBe('12px');
    expect(state.panelPadding).toBe('8px');
    await page.locator('[data-app]').screenshot({
      path: testInfo.outputPath(`value-preview-${width}.png`),
    });
    await remote.focus();
    await expect(remote).toBeFocused();
    await remote.press('PageDown');
    await expect
      .poll(() => remote.evaluate((output) => output.scrollTop))
      .toBeGreaterThan(0);
    await remote.evaluate((output) => {
      output.scrollTop = 0;
    });
  }
});

test('catalog composes ValuePreview inside SunkenPanel', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=value-preview');
  const demo = page.locator('[data-demo="value-preview"]');
  await expect(demo).toBeVisible();
  const values = demo.locator('[data-component="value-preview"]');
  await expect(values).toHaveCount(4);
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await demo.scrollIntoViewIfNeeded();
    const remote = values.first();
    await expect(remote).toHaveAttribute('aria-label', 'Their Latest Version');
    await expect(remote).toHaveText(
      /A title with a deliberate line break\nSecond line/,
    );
    const bounds = await remote.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      scrollHeight: element.scrollHeight,
      overflow: element.scrollWidth - element.clientWidth,
      parent: element.parentElement?.dataset.component,
    }));
    expect(bounds.height).toBeLessThanOrEqual(97);
    expect(bounds.scrollHeight).toBeGreaterThan(bounds.height);
    expect(bounds.overflow).toBeLessThanOrEqual(1);
    expect(bounds.parent).toBe('sunken-panel');
    if (testInfo.project.name === 'chromium') {
      await demo.screenshot({
        path: testInfo.outputPath(`value-preview-catalog-${width}.png`),
      });
    }
  }
});
