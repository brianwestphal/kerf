import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

// KF-YHPYXX static-effects switch: an app that detects a low-power device sets
// `data-kui-effects="static"` on the root element, and every backdrop effect
// turns opaque. An overlay Pane header stands in for every surface that reads
// the shared chrome material.

const css = ['foundation', 'pane']
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

async function mount(page: Page): Promise<void> {
  await page.setContent(`
    <body style="margin:0">
      <div class="kui-pane" data-header-presentation="overlay" style="height:300px">
        <div class="kui-pane__header">Header</div>
        <div class="kui-pane__content">Content</div>
      </div>
    </body>`);
  await page.addStyleTag({ content: css });
}

function headerStyle(page: Page) {
  return page.locator('.kui-pane__header').evaluate((header) => {
    const style = window.getComputedStyle(header);
    return {
      filter:
        style.backdropFilter ||
        style.getPropertyValue('-webkit-backdrop-filter'),
      background: style.backgroundColor,
      // The opaque surface, resolved in this page's color scheme.
      surface: (() => {
        const probe = document.createElement('div');
        probe.style.background = 'var(--kui-color-surface)';
        document.body.append(probe);
        const value = window.getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      })(),
    };
  });
}

test('the chrome material is translucent until the app switches effects to static', async ({
  page,
}) => {
  await mount(page);
  const before = await headerStyle(page);
  expect(before.background).not.toBe(before.surface);

  await page.evaluate(() => {
    document.documentElement.dataset.kuiEffects = 'static';
  });
  const after = await headerStyle(page);
  expect(['none', '']).toContain(after.filter);
  expect(after.background).toBe(after.surface);

  await page.evaluate(() => {
    delete document.documentElement.dataset.kuiEffects;
  });
  expect((await headerStyle(page)).background).toBe(before.background);
});
