import { expect, type Page, test } from '@playwright/test';

const smallFields = [
  ['wa-input', 'input'],
  ['wa-number-input', 'input'],
  ['wa-time-input', 'input'],
  ['wa-textarea', 'textarea'],
  ['wa-select', 'display-input'],
] as const;

async function readWebAwesomeSizes(page: Page) {
  return page.evaluate(async (fields) => {
    const specimen = document.createElement('div');
    specimen.setAttribute('data-mobile-editable-specimen', '');
    specimen.style.display = 'grid';
    specimen.style.gap = '8px';
    specimen.style.width = 'min(100%, 390px)';
    document.body.append(specimen);

    const sizes: Record<string, number> = {};
    for (const [tag, part] of fields) {
      if (!customElements.get(tag)) throw new Error(`${tag} is not registered`);
      await customElements.whenDefined(tag);
      const host = document.createElement(tag);
      host.setAttribute('size', 'small');
      host.setAttribute('label', tag);
      host.setAttribute('placeholder', 'Example');
      specimen.append(host);
      await (host as HTMLElement & { updateComplete?: Promise<unknown> })
        .updateComplete;
      const editor = host.shadowRoot?.querySelector(`[part~="${part}"]`);
      if (!editor) throw new Error(`${tag} has no ${part} part`);
      sizes[tag] = parseFloat(window.getComputedStyle(editor).fontSize);
    }

    return sizes;
  }, smallFields);
}

async function readTokenSize(page: Page) {
  return page
    .locator('[data-demo-token-form] [data-token-search-editor]')
    .evaluate((editor) => parseFloat(window.getComputedStyle(editor).fontSize));
}

test('editable text keeps compact desktop typography', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=wa-input');
  await expect(page.locator('wa-input').first()).toBeVisible();
  const webAwesome = await readWebAwesomeSizes(page);
  for (const size of Object.values(webAwesome)) expect(size).toBeLessThan(16);
  await page.goto('/?component=token-search-field');
  expect(await readTokenSize(page)).toBeLessThan(16);
  await page.locator('[data-demo-token-form]').screenshot({
    path: `test-results/mobile-editable-font-desktop-${testInfo.project.name}.png`,
  });
});

test.describe('coarse touch', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('small editable text has a 16px floor without disabling zoom', async ({
    page,
  }, testInfo) => {
    await page.goto('/?component=wa-input');
    await expect(page.locator('wa-input').first()).toBeVisible();
    expect(
      await page.evaluate(
        () => window.matchMedia('(hover: none) and (pointer: coarse)').matches,
      ),
    ).toBe(true);

    const webAwesome = await readWebAwesomeSizes(page);
    for (const size of Object.values(webAwesome))
      expect(size).toBeGreaterThanOrEqual(16);
    await page.locator('[data-mobile-editable-specimen]').screenshot({
      path: `test-results/mobile-editable-webawesome-touch-${testInfo.project.name}.png`,
    });
    await page.goto('/?component=token-search-field');
    expect(await readTokenSize(page)).toBeGreaterThanOrEqual(16);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      'width=device-width, initial-scale=1.0',
    );

    const editor = page.locator(
      '[data-demo-token-form] [data-token-search-editor]',
    );
    await editor.focus();
    await expect(editor).toBeFocused();
    await page.locator('[data-demo-token-form]').screenshot({
      path: `test-results/mobile-editable-font-touch-${testInfo.project.name}.png`,
    });
  });
});
