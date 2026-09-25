import { expect, test } from '@playwright/test';

test('select-all deletion keeps a controlled search open before delayed frames and across refills', async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: /^\s*Adoption knobs\s*$/,
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Filter records' });
  const chips = editor.locator('[data-component="token-search-token"]');
  const outside = page.locator('[data-action="toggle-theme"]').first();
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const key of ['Backspace', 'Delete']) {
      // A chip can open the field while the adopted transient signal is false.
      if (await editor.isVisible()) await editor.focus();
      await outside.focus();
      await expect(field).toHaveAttribute('data-expanded', 'false');
      await demo
        .getByRole('button', { name: 'status:open', exact: true })
        .click();
      await expect(editor).toBeFocused();
      await page.keyboard.type(' between ');
      await demo.getByRole('button', { name: 'owner:me', exact: true }).click();
      await expect(editor).toBeFocused();
      await page.keyboard.type(' after');
      await expect(chips).toHaveCount(2);
      await page.evaluate(() => {
        const requestFrame = window.requestAnimationFrame.bind(window);
        const callbacks: FrameRequestCallback[] = [];
        window.requestAnimationFrame = (callback) => -callbacks.push(callback);
        Object.assign(window, {
          flushTokenSearchFrames: () => {
            window.requestAnimationFrame = requestFrame;
            for (const callback of callbacks) callback(performance.now());
          },
        });
      });
      await editor.press('ControlOrMeta+A');
      await page.keyboard.press(key);
      await expect(field).toHaveAttribute('data-expanded', 'true');
      await expect(editor).toBeFocused();
      await expect(chips).toHaveCount(0);
      await expect(editor).toHaveText('');
      await page.keyboard.type('refilled');
      await expect(editor).toHaveText('refilled');
      // Flushing old frames cannot collapse a new select-all range into a caret.
      await editor.press('ControlOrMeta+A');
      await page.evaluate(() => {
        (
          window as unknown as { flushTokenSearchFrames(): void }
        ).flushTokenSearchFrames();
      });
      await page.keyboard.type('replacement');
      await expect(editor).toHaveText('replacement');
      await expect(page.locator('[data-demo-adoption-readout]')).toContainText(
        '"replacement" · 0 filters',
      );
      if (browserName === 'chromium')
        await demo.screenshot({
          path: testInfo.outputPath(`select-all-${width}-${key}.png`),
          animations: 'disabled',
        });
      await editor.press('ControlOrMeta+A');
      await page.keyboard.press(key);
      await expect(editor).toBeFocused();
      await expect(editor).toHaveText('');
      await editor.press('Escape');
      await expect(
        field.getByRole('button', { name: 'Open filter' }),
      ).toBeFocused();
    }
  }
});

// KF-17GS8R: the "Adoption knobs" TokenSearchField demo exercises the opt-in
// wireTokenSearchFields hooks a real app reaches for — a focusout keep-open
// exception, the atomic-chip keyboard, and the onEdit readout — across all three
// engines.
test('the adoption-knobs demo drives keep-open, chip keyboard, and onEdit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=token-search-field');

  const field = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: /^\s*Adoption knobs\s*$/,
      }),
    })
    .locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Filter records' });
  const readout = page.locator('[data-demo-adoption-readout]');
  const chips = field.locator('[data-component="token-search-token"]');
  const suggestion = (name: string) =>
    page.locator('[data-token-search-keep-open] wa-button', { hasText: name });

  // Starts expanded and empty (the app owns `expanded`).
  await expect(field).toHaveAttribute('data-expanded', 'true');
  await expect(chips).toHaveCount(0);

  // onEdit fires on input and drives the readout.
  await editor.click();
  await editor.pressSequentially('urgent');
  await expect(readout).toContainText('Editing');
  await expect(readout).toContainText('urgent');

  // Empty the field so collapse-on-empty-blur is armed.
  await editor.evaluate((element) => {
    element.textContent = '';
    element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'deleteContentBackward',
      }),
    );
  });
  await expect(field).toHaveAttribute('data-expanded', 'true');

  // Keep-open exception: focus moving into the data-token-search-keep-open
  // suggestions surface does NOT collapse the empty field.
  await editor.click();
  await suggestion('status:open').focus();
  await expect(field).toHaveAttribute('data-expanded', 'true');
  await expect(chips).toHaveCount(0);

  // Contrast: focus moving to a non-exempt control DOES collapse the empty field.
  await editor.click();
  await page.locator('[data-action="toggle-theme"]').first().focus();
  await expect(field).toHaveAttribute('data-expanded', 'false');

  // Consecutive native suggestion activations stay owned by the keep-open
  // surface even when WebKit omits focusout.relatedTarget. Repeat the exact
  // empty-editor transition so a collapse between pointerdown and click cannot
  // pass once and hide as timing noise.
  await field.getByRole('button', { name: 'Open filter' }).click();
  for (let repetition = 0; repetition < 5; repetition += 1) {
    if (repetition > 0) {
      await field.getByRole('button', { name: 'Clear search' }).click();
      await expect(chips).toHaveCount(0);
    }
    await suggestion('status:open').click();
    await expect(chips).toHaveCount(1);
    await suggestion('owner:me').click();
    await expect(chips).toHaveCount(2);
  }

  // Chip keyboard: caret at the end (after the last chip) → Backspace removes it.
  await editor.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    (element as HTMLElement).focus();
  });
  await page.keyboard.press('Backspace');
  await expect(chips).toHaveCount(1);
  await expect(readout).toContainText('Removed');

  // ArrowRight moves the caret past a leading chip: from the editor start it hops
  // over the chip, so the chip then sits before the caret.
  await editor.evaluate((element) => {
    const range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    (element as HTMLElement).focus();
  });
  await page.keyboard.press('ArrowRight');
  const chipBehindCaret = await editor.evaluate((element) => {
    const selection = document.getSelection()!;
    const caret = selection.getRangeAt(0);
    const before = document.createRange();
    before.setStart(element, 0);
    before.setEnd(caret.startContainer, caret.startOffset);
    return (
      before
        .cloneContents()
        .querySelector('[data-component="token-search-token"]') !== null
    );
  });
  expect(chipBehindCaret).toBe(true);
});

test('managed clear keeps immediate typing and later focus ownership before delayed frames', async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto('/?component=token-search-field');
  const demo = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: /^\s*Adoption knobs\s*$/,
      }),
    });
  const field = demo.locator('[data-component="token-search-field"]');
  const editor = field.getByRole('searchbox', { name: 'Filter records' });
  const clear = field.getByRole('button', { name: 'Clear search' });
  const outside = page.locator('[data-action="toggle-theme"]').first();
  // Exercise next-input-before-frame deterministically without slowing input or
  // waiting for the helper to focus. Native pointer delivery is unchanged.
  await page.evaluate(() => {
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Map<number, FrameRequestCallback>();
    let clearing = false;
    let sequence = 0;
    document.addEventListener(
      'click',
      (event) => {
        clearing =
          event.target instanceof Element &&
          Boolean(event.target.closest('.kui-token-search__clear'));
      },
      true,
    );
    window.addEventListener('click', () => {
      clearing = false;
    });
    window.requestAnimationFrame = (callback) => {
      if (!clearing) return request(callback);
      pending.set(--sequence, callback);
      return sequence;
    };
    window.cancelAnimationFrame = (id) => {
      if (!pending.delete(id)) cancel(id);
    };
    Object.assign(window, {
      flushClearFrames: () => {
        const callbacks = [...pending.values()];
        pending.clear();
        for (const callback of callbacks) callback(performance.now());
      },
    });
  });
  const flushFrames = () =>
    page.evaluate(() => {
      (window as unknown as { flushClearFrames(): void }).flushClearFrames();
    });
  for (const width of [1100, 390, 1100]) {
    await page.setViewportSize({ width, height: 844 });
    for (const query of ['continued', 'create', 'continued again']) {
      await demo
        .getByRole('button', { name: 'status:open', exact: true })
        .click();
      await expect(
        editor.locator('[data-component="token-search-token"]'),
      ).toHaveCount(1);
      await editor.focus();
      await clear.click();
      await page.keyboard.type(query);
      expect(
        await editor.evaluate((node) => ({
          focused: document.activeElement === node,
          text: node.textContent,
        })),
      ).toEqual({ focused: true, text: query });
      await expect(field).toHaveAttribute('data-expanded', 'true');
      await expect(
        editor.locator('[data-component="token-search-token"]'),
      ).toHaveCount(0);
      await expect(page.locator('[data-demo-adoption-readout]')).toContainText(
        `"${query}" · 0 filters`,
      );
      await page.keyboard.press('ControlOrMeta+A');
      await flushFrames();
      await page.keyboard.type('replacement');
      await expect(editor).toHaveText('replacement');
      if (browserName === 'chromium')
        await demo.screenshot({
          path: testInfo.outputPath(`clear-focus-${width}.png`),
          animations: 'disabled',
        });
      // A real handoff after clear owns focus even when old frames finally run.
      await clear.click();
      await outside.focus();
      await flushFrames();
      await expect(outside).toBeFocused();
      await expect(field).toHaveAttribute('data-expanded', 'false');
    }
  }
});
