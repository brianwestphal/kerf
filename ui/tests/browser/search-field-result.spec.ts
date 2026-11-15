import { expect, type Locator, type Page, test } from '@playwright/test';

// KF-8CDT8B: SearchField's `resultText` readout sits inside the field before
// Clear in standalone and toolbar-group fields, never takes the editor's
// floor, and is announced politely once it settles.

const parts = (field: Locator) =>
  field.evaluate((element) => {
    const box = (selector: string | null) => {
      const node =
        selector === null
          ? (element as HTMLElement)
          : element.querySelector<HTMLElement>(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        visible: window.getComputedStyle(node).display !== 'none',
        clipped: node.scrollWidth > node.clientWidth + 0.5,
      };
    };
    return {
      field: box(null),
      editor: box(':scope > .kui-search-field__editor'),
      result: box(':scope > .kui-search-field__result'),
      text: box(
        ':scope > .kui-search-field__result > .kui-search-field__result-text',
      ),
      clear: box(':scope > .kui-search-field__clear'),
    };
  });

const setUp = async (page: Page, width: number) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/?component=search-field');
  const example = page.locator('[data-demo-find-readout=""]');
  await example.scrollIntoViewIfNeeded();
  return {
    example,
    standalone: example.locator('[data-search-field-id="find-readout-search"]'),
    group: example.locator(
      '[data-search-field-id="find-readout-group-search"]',
    ),
  };
};

test('the readout counts matches inside the field and steps with Enter', async ({
  page,
}, testInfo) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const { example, standalone, group } = await setUp(page, 1280);
    const result = standalone.locator('.kui-search-field__result');
    const live = standalone.locator('.kui-search-field__result-live');
    const editor = standalone.locator('.kui-search-field__editor');

    // Empty: no readout, no description text yet.
    await expect(result).toBeHidden();
    await expect(editor).toHaveAttribute(
      'aria-describedby',
      'find-readout-search-result',
    );

    await editor.click();
    await page.keyboard.type('release');
    await expect(result).toHaveText('1 of 4');
    await expect(result).toBeVisible();
    await expect(live).toHaveText('1 of 4');
    await page.keyboard.press('Enter');
    await expect(result).toHaveText('2 of 4');
    await expect(live).toHaveText('2 of 4');
    await page.keyboard.type('z');
    await expect(result).toHaveText('No matches');

    // The readout sits between the editor and Clear.
    const standaloneParts = await parts(standalone);
    expect(standaloneParts.result!.left).toBeGreaterThanOrEqual(
      standaloneParts.editor!.right,
    );
    expect(standaloneParts.clear!.left).toBeGreaterThanOrEqual(
      standaloneParts.result!.right,
    );

    // Toolbar-group presentation: the same readout inside the inset field.
    await group.locator('.kui-search-field__expand').click();
    const groupEditor = group.locator('.kui-search-field__editor');
    await expect(groupEditor).toBeFocused();
    await page.keyboard.type('notes');
    const groupResult = group.locator('.kui-search-field__result');
    await expect(groupResult).toHaveText('1 of 3');
    // The group opens with a width transition; measure once it settles.
    await expect
      .poll(async () => (await parts(group)).text!.clipped)
      .toBe(false);
    const groupParts = await parts(group);
    expect(groupParts.result!.left).toBeGreaterThanOrEqual(
      groupParts.editor!.right,
    );
    expect(groupParts.result!.right).toBeLessThanOrEqual(
      groupParts.clear!.left,
    );
    await example.screenshot({
      path: testInfo.outputPath(`search-field-result-${scheme}-1280.png`),
    });

    // Clearing hides the readout again.
    await standalone.locator('.kui-search-field__clear').click();
    await expect(result).toBeHidden();
  }
});

test('at a narrow width the readout gives way before the editor', async ({
  page,
}, testInfo) => {
  const { example, standalone } = await setUp(page, 390);
  const editor = standalone.locator('.kui-search-field__editor');
  await editor.click();
  await page.keyboard.type('release');
  await expect(standalone.locator('.kui-search-field__result')).toHaveText(
    '1 of 4',
  );
  // Squeeze the field until the readout cannot fit beside the editor floor.
  for (const width of [220, 150]) {
    await standalone.evaluate((element, value) => {
      element.style.width = `${value}px`;
    }, width);
    const measured = await parts(standalone);
    expect(measured.editor!.width).toBeGreaterThanOrEqual(63.5);
    // The readout shows readable text or nothing, never a sliver of a glyph.
    const shown = await standalone
      .locator('.kui-search-field__result-text')
      .evaluate((text) => {
        const box = text.getBoundingClientRect();
        const clip = text.parentElement!.getBoundingClientRect();
        return box.top < clip.bottom - 1 ? box.width : 0;
      });
    expect(shown === 0 || shown >= 30).toBe(true);
    expect(measured.result!.right).toBeLessThanOrEqual(measured.clear!.left);
    expect(measured.clear!.right).toBeLessThanOrEqual(measured.field!.right);
    await example.screenshot({
      path: testInfo.outputPath(`search-field-result-narrow-${width}.png`),
    });
  }
  // Wide again: the whole readout returns.
  await standalone.evaluate((element) => element.style.removeProperty('width'));
  await expect
    .poll(async () => (await parts(standalone)).text!.clipped)
    .toBe(false);
});
