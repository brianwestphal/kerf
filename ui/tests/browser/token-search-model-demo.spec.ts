import { expect, test } from '@playwright/test';

test('long suggestions scroll in a rounded list and clear uses a pill highlight', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const suggestions = field.locator('.kui-token-search__suggestions');
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await editor.fill('tag:');
    await expect(suggestions.locator('button')).toHaveCount(9);
    const geometry = await suggestions.evaluate((element) => ({
      radius: Number.parseFloat(
        window.getComputedStyle(element).borderTopLeftRadius,
      ),
      height: element.getBoundingClientRect().height,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(geometry.radius).toBeLessThanOrEqual(20);
    expect(geometry.height).toBeLessThanOrEqual(250);
    expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
    const fieldBox = (await field.boundingBox())!;
    const popupBox = (await suggestions.boundingBox())!;
    expect(fieldBox.height).toBeLessThanOrEqual(50);
    expect(
      popupBox.y >= fieldBox.y + fieldBox.height ||
        popupBox.y + popupBox.height <= fieldBox.y,
    ).toBe(true);
    expect(popupBox.y).toBeGreaterThanOrEqual(8);
    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(836);
    await suggestions.evaluate((element) =>
      element.scrollIntoView({ block: 'center' }),
    );
    await page.screenshot({
      path: testInfo.outputPath(`grammar-long-suggestions-${width}.png`),
    });

    await editor.fill('tag:cl');
    await field.getByRole('button', { name: 'tag:client' }).click();
    const clear = field.getByRole('button', { name: 'Clear search' });
    await clear.hover();
    const radius = await clear.evaluate((element) =>
      Number.parseFloat(window.getComputedStyle(element).borderTopLeftRadius),
    );
    expect(radius).toBeGreaterThanOrEqual(20);
    await field.getByRole('button', { name: 'Clear search' }).click();
  }
});

test('suggestions stay in the viewport and track their field while scrolling', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const suggestions = field.locator('.kui-token-search__suggestions');

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 420 });
    await editor.fill('tag:');
    await field.evaluate((element) => {
      element.style.position = 'fixed';
      element.style.left = '16px';
      element.style.width = 'min(320px, calc(100vw - 32px))';
      element.style.top = '0px';
      const originY = element.getBoundingClientRect().y;
      element.style.top = `${window.innerHeight - element.getBoundingClientRect().height - 8 - originY}px`;
    });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect(suggestions).toBeVisible();
    await expect
      .poll(async () => {
        const fieldBox = (await field.boundingBox())!;
        const popupBox = (await suggestions.boundingBox())!;
        return Math.min(
          Math.abs(popupBox.y + popupBox.height - fieldBox.y),
          Math.abs(popupBox.y - (fieldBox.y + fieldBox.height)),
        );
      })
      .toBeLessThan(8);
    const popupBox = (await suggestions.boundingBox())!;
    const fieldBox = (await field.boundingBox())!;
    expect(fieldBox.y + fieldBox.height).toBeLessThanOrEqual(412);
    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(fieldBox.y);
    expect(popupBox.x).toBeGreaterThanOrEqual(8);
    expect(popupBox.x + popupBox.width).toBeLessThanOrEqual(width - 8);
    expect(popupBox.y).toBeGreaterThanOrEqual(8);
    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(412);
    await page.screenshot({
      path: testInfo.outputPath(`grammar-flipped-${width}.png`),
    });
    await editor.press('ArrowDown');
    await suggestions.locator('button').first().press('Enter');
    await expect(
      field.locator('[data-component="token-search-token"]'),
    ).toHaveCount(1);
    await field.getByRole('button', { name: 'Clear search' }).click();

    await field.evaluate((element) => {
      element.removeAttribute('style');
    });
    await editor.fill('tag:');
    await expect(suggestions).toBeVisible();
    await editor.scrollIntoViewIfNeeded();
    const before = {
      field: (await field.boundingBox())!,
      popup: (await suggestions.boundingBox())!,
    };
    const scrolled = await field.evaluate((element) => {
      let ancestor = element.parentElement;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        const maximum = ancestor.scrollHeight - ancestor.clientHeight;
        if (maximum > 0 && /auto|scroll/.test(style.overflowY)) {
          const current = ancestor.scrollTop;
          ancestor.scrollTop =
            current + 40 <= maximum ? current + 40 : Math.max(0, current - 40);
          return ancestor.scrollTop !== current;
        }
        ancestor = ancestor.parentElement;
      }
      return false;
    });
    expect(scrolled).toBe(true);
    await expect
      .poll(async () =>
        Math.abs((await field.boundingBox())!.y - before.field.y),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(async () => {
        const fieldBox = (await field.boundingBox())!;
        const popupBox = (await suggestions.boundingBox())!;
        return Math.min(
          Math.abs(popupBox.y + popupBox.height - fieldBox.y),
          Math.abs(popupBox.y - (fieldBox.y + fieldBox.height)),
        );
      })
      .toBeLessThan(8);
    expect((await suggestions.boundingBox())!.y).not.toBe(before.popup.y);
    await field.getByRole('button', { name: 'Clear search' }).click();
  }
});

test('a committed chip does not reclaim focus from the next form control', async ({
  page,
}) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const next = page.locator('[data-after-commit-input]');
  await demo.evaluate((element) => {
    const editor = element.querySelector<HTMLElement>(
      '[data-token-search-editor]',
    )!;
    const input = document.createElement('input');
    input.setAttribute('data-after-commit-input', '');
    document.body.append(input);
    editor.focus();
    editor.textContent = 'tag:client ';
    editor.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: ' ',
      }),
    );
    input.focus();
  });
  await expect(
    field.locator('[data-component="token-search-token"]'),
  ).toHaveCount(1);
  await expect(next).toBeFocused();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      ),
  );
  await expect(next).toBeFocused();
});

test('grammar model suggests, commits, edits, removes, and clears in the real catalog', async ({
  page,
}, testInfo) => {
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const chips = field.locator('[data-component="token-search-token"]');
  const result = demo.locator('[data-demo-grammar-result]');

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=token-search-field');
    await editor.fill('tag:cl');
    await expect(editor).toHaveText('tag:cl');
    await expect(
      field.getByRole('button', { name: 'tag:client' }),
    ).toBeVisible();
    await demo.screenshot({
      path: testInfo.outputPath(`grammar-suggestions-${width}.png`),
    });
    await editor.press('ArrowDown');
    await expect(
      field.getByRole('button', { name: 'tag:client' }),
    ).toBeFocused();
    await field.getByRole('button', { name: 'tag:client' }).press('Enter');
    await expect(chips).toHaveCount(1);
    await expect(result).toHaveText('No free text · 1 filters');
    await expect(editor).toBeFocused();
    await editor.pressSequentially('tag:c');
    await expect(
      field.locator('[data-token-search-suggestion="tag:client"]'),
    ).toHaveCount(0);
    for (let index = 0; index < 'tag:c'.length; index++)
      await editor.press('Backspace');
    await expect(chips).toHaveCount(1);
    await demo.screenshot({
      path: testInfo.outputPath(`grammar-chip-${width}.png`),
    });

    await editor.pressSequentially('is:open ');
    await expect(chips).toHaveCount(2);
    await chips
      .first()
      .getByRole('button', { name: 'Edit tag:client' })
      .click();
    await expect(chips).toHaveCount(1);
    await expect(editor).toContainText('tag:client');
    await editor.press('End');
    await editor.press('Space');
    await expect(chips).toHaveCount(2);
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(chips).toHaveCount(0);
    await expect(result).toHaveText('No free text · 0 filters');
    await editor.pressSequentially('plain text');
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(editor).toHaveText('');
  }
});

test('an app helper commits an active grammar value outside suggestions', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const chips = field.locator('[data-component="token-search-token"]');
  const helper = demo.getByRole('button', { name: 'Add release tag' });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await helper.click();
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toHaveAttribute(
      'data-token-value',
      'tag:release',
    );
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(chips).toHaveCount(0);
    await editor.click();
    await editor.pressSequentially('tag:rel');
    await expect(field.locator('[data-token-search-suggestion]')).toHaveCount(
      0,
    );
    await helper.click();
    await expect(chips).toHaveCount(1);
    await expect(chips.first()).toHaveAttribute(
      'data-token-value',
      'tag:release',
    );
    await expect(demo.locator('[data-demo-grammar-result]')).toHaveText(
      'No free text · 1 filters',
    );
    await demo.screenshot({
      path: testInfo.outputPath(`grammar-helper-${width}.png`),
    });
    await helper.click();
    await expect(chips).toHaveCount(1);
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(chips).toHaveCount(0);
  }
});

test('model chip keys and plain-field clear keep the replacement editor focused', async ({
  page,
}) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const chips = field.locator('[data-component="token-search-token"]');
  const helper = demo.getByRole('button', { name: 'Add release tag' });
  const clear = field.getByRole('button', { name: 'Clear search' });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const key of ['Backspace', 'Delete']) {
      await editor.fill('lead');
      await helper.click();
      await expect(chips).toHaveCount(1);
      await editor.evaluate((element, direction) => {
        const chip = element.querySelector(
          '[data-component="token-search-token"]',
        )!;
        const range = document.createRange();
        if (direction === 'Backspace') range.setStartAfter(chip);
        else range.setStartBefore(chip);
        range.collapse(true);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
        (element as HTMLElement).focus();
      }, key);
      await editor.press(key);
      await expect(chips).toHaveCount(0);
      await expect(editor).toBeFocused();
      await editor.pressSequentially('x');
      await expect(editor).toHaveText('lead x');
      await clear.click();
      await expect(editor).toBeFocused();
      await editor.pressSequentially('z');
      await expect(editor).toHaveText('z');
      await clear.click();
    }
  }
});

test('an app helper replaces DOM-owned draft text from saved search state', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: 'Grammar assisted search',
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Search with filters' });
  const helper = demo.getByRole('button', { name: 'Load saved search' });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await editor.fill('draft');
    await expect(editor).toHaveText('draft');
    await helper.click();
    await expect(editor).toHaveText('roadmap');
    await expect(demo.locator('[data-demo-grammar-result]')).toHaveText(
      'roadmap · 0 filters',
    );
    await demo.screenshot({
      path: testInfo.outputPath(`grammar-replaced-${width}.png`),
    });
    await editor.fill('roadmap next');
    await expect(editor).toHaveText('roadmap next');
    await helper.click();
    await expect(editor).toHaveText('roadmap');
    await field.getByRole('button', { name: 'Clear search' }).click();
    await expect(editor).toHaveText('');
  }
});
