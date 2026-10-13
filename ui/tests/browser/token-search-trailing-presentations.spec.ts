import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { build } from 'esbuild';

const fixtureBundle = build({
  entryPoints: [
    resolve(
      import.meta.dirname,
      'fixtures/token-search-trailing-presentations.tsx',
    ),
  ],
  bundle: true,
  format: 'iife',
  outdir: 'out',
  platform: 'browser',
  write: false,
});

const css = [
  'foundation',
  'lucide-icon',
  'toolbar-control-group',
  'token-search-field',
]
  .map((name) =>
    readFileSync(
      resolve(import.meta.dirname, `../../dist/styles/${name}.css`),
      'utf8',
    ),
  )
  .join('\n');

async function mountFixture(page: Page) {
  const result = await fixtureBundle;
  const javascript = result.outputFiles.find((file) =>
    file.path.endsWith('.js'),
  )!;
  await page.setContent(
    '<body style="margin:16px"><div data-app></div></body>',
  );
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: javascript.text });
}

const chrome = (page: Page, presentation: string, selector: string) =>
  page
    .locator(`[data-case="${presentation}"] ${selector}`)
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = globalThis.getComputedStyle(element);
      return {
        width: rect.width,
        height: rect.height,
        top: Math.round(rect.top),
        radius: style.borderTopLeftRadius,
        cursor: style.cursor,
        background: style.backgroundColor,
      };
    });

for (const presentation of ['standalone', 'form-field', 'toolbar-group']) {
  test(`${presentation} trailing help toggle matches the clear button and reports its state`, async ({
    page,
  }) => {
    await mountFixture(page);
    const field = page.locator(`[data-case="${presentation}"]`);
    const help = field.getByRole('button', { name: 'Search Help' });
    await expect(help).toHaveAttribute('aria-expanded', 'false');
    await expect(help).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(help).toHaveAttribute('data-action', 'toggle-help');

    const clear = await chrome(page, presentation, '.kui-token-search__clear');
    const rest = await chrome(
      page,
      presentation,
      '.kui-token-search__trailing-action',
    );
    // Same compact slot, row, shape, and cursor as the clear button.
    expect(rest).toMatchObject({
      width: clear.width,
      height: clear.height,
      top: clear.top,
      radius: clear.radius,
      cursor: 'pointer',
    });
    expect(rest.width).toBe(24);
    expect(rest.background).toBe('rgba(0, 0, 0, 0)');

    await help.click();
    await expect(help).toHaveAttribute('aria-expanded', 'true');
    // The open state keeps the hover fill after the pointer leaves.
    await page.mouse.move(0, 0);
    const expanded = await chrome(
      page,
      presentation,
      '.kui-token-search__trailing-action',
    );
    expect(expanded.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(expanded.width).toBe(rest.width);

    await help.focus();
    await help.press('Enter');
    await expect(help).toHaveAttribute('aria-expanded', 'false');
  });
}
