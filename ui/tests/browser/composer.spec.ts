import { expect, type Page, test } from '@playwright/test';

/** Resolve a theme color token to the computed color it paints. */
async function tokenColor(page: Page, token: string) {
  return page.evaluate((name) => {
    const probe = document.createElement('div');
    probe.style.borderTopColor = `var(${name})`;
    probe.style.borderTopStyle = 'solid';
    document.body.append(probe);
    const color = window.getComputedStyle(probe).borderTopColor;
    probe.remove();
    return color;
  }, token);
}

test('Composer frames a growing field above a hint and a trailing send action', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=composer');
    const root = page.locator('[data-demo="composer"] .kui-composer').first();
    const field = root.getByRole('textbox', { name: 'Message' });
    await expect(field).toHaveAccessibleDescription(
      'Answers use the latest nightly build.',
    );

    const frame = () =>
      root.evaluate((element) => {
        const style = window.getComputedStyle(element);
        const textarea = element.querySelector('textarea')!;
        const box = element.getBoundingClientRect();
        const fieldBox = textarea.getBoundingClientRect();
        const hint = element
          .querySelector('.kui-composer__hint')!
          .getBoundingClientRect();
        const send = element
          .querySelector('.kui-composer__trailing > *')!
          .getBoundingClientRect();
        const fieldStyle = window.getComputedStyle(textarea);
        return {
          border: style.borderTopColor,
          borderWidth: style.borderTopWidth,
          radius: style.borderTopLeftRadius,
          shadow: style.boxShadow,
          fieldBorder: fieldStyle.borderTopWidth,
          fieldHeight: fieldBox.height,
          fieldScrolls: textarea.scrollHeight > textarea.clientHeight + 1,
          lineHeight: Number.parseFloat(fieldStyle.lineHeight),
          textStart: Math.round(fieldBox.left - box.left),
          hintStart: Math.round(hint.left - box.left),
          sendEnd: Math.round(box.right - send.right),
          rowBelowField:
            hint.top >= fieldBox.bottom && send.top >= fieldBox.bottom,
        };
      });

    // Raised frame: the standard border, large radius, and a shadow; the
    // field itself is borderless and its text starts at the frame padding.
    const rest = await frame();
    expect(rest.border).toBe(
      await tokenColor(page, '--kui-color-neutral-border-normal'),
    );
    expect(rest.borderWidth).toBe('1px');
    expect(rest.radius).toBe('12px');
    expect(rest.shadow).not.toBe('none');
    expect(rest.fieldBorder).toBe('0px');
    expect(rest.textStart).toBe(9);
    expect(rest.hintStart).toBe(9);
    expect(rest.sendEnd).toBe(9);
    expect(rest.rowBelowField).toBe(true);

    // Focus within turns the frame's border brand.
    await field.focus();
    await expect
      .poll(async () => (await frame()).border)
      .toBe(await tokenColor(page, '--kui-color-brand-border-loud'));

    // One line at rest; it grows with each line up to eight, then scrolls.
    const oneLine = rest.fieldHeight;
    await field.fill('One\nTwo\nThree');
    const three = await frame();
    expect(three.fieldHeight).toBeCloseTo(oneLine + 2 * rest.lineHeight, 0);
    expect(three.fieldScrolls).toBe(false);
    await field.fill(
      Array.from({ length: 14 }, (_, index) => `Line ${index}`).join('\n'),
    );
    const capped = await frame();
    expect(capped.fieldHeight).toBeCloseTo(oneLine + 7 * rest.lineHeight, 0);
    expect(capped.fieldScrolls).toBe(true);

    // Send reads the field, clears it, and the field shrinks back.
    await root.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Sent: Line 0')).toBeVisible();
    await expect(field).toHaveValue('');
    await expect
      .poll(async () => Math.round((await frame()).fieldHeight))
      .toBe(Math.round(oneLine));

    // Leaving the composer restores the neutral border.
    await page.mouse.click(4, 4);
    await expect
      .poll(async () => (await frame()).border)
      .toBe(await tokenColor(page, '--kui-color-neutral-border-normal'));
  }
});

test('Composer minRows starts the field taller', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=composer');
  const field = page.getByRole('textbox', { name: 'Prompt' });
  const metrics = await field.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    line: Number.parseFloat(window.getComputedStyle(element).lineHeight),
  }));
  // Three lines plus the field's 4px block padding on each side.
  expect(metrics.height).toBeCloseTo(3 * metrics.line + 8, 0);
});

test('Composer submitOnEnter sends on Enter, keeps Shift+Enter newlines, and waits out IME composition', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=composer');
  const log = page.locator('output.catalog-log');
  const field = page.getByRole('textbox', { name: 'Message' });
  await expect(field).toHaveAttribute('aria-keyshortcuts', 'Enter');
  const initialLog = (await log.textContent()) ?? '';
  await field.focus();

  // An empty or whitespace-only Enter neither sends nor inserts a newline.
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('');
  await page.keyboard.type('   ');
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('   ');
  await expect(log).toHaveText(initialLog);

  // Shift+Enter inserts a newline; Enter sends through the Send action.
  await field.fill('');
  await page.keyboard.type('First');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('Second');
  await expect(field).toHaveValue('First\nSecond');
  await page.keyboard.press('Enter');
  await expect(log).toHaveText('Sent: First\nSecond');
  await expect(field).toHaveValue('');
  await expect(field).toBeFocused();

  // Cmd/Ctrl+Enter also sends.
  await page.keyboard.type('Shortcut');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(log).toHaveText('Sent: Shortcut');
  await expect(field).toHaveValue('');

  // While an IME composition is open, Enter commits it instead of sending.
  await page.keyboard.type('nihon');
  await field.evaluate((element) =>
    element.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true, data: '' }),
    ),
  );
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('nihon\n');
  await expect(log).toHaveText('Sent: Shortcut');
  // A keyCode 229 Enter after compositionend (WebKit's order) and an Enter
  // flagged isComposing are left to the input method too.
  const ime = await field.evaluate((element) => {
    element.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: 'にほん' }),
    );
    const committing = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(committing, 'keyCode', { value: 229 });
    element.dispatchEvent(committing);
    const composing = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      isComposing: true,
    });
    element.dispatchEvent(composing);
    return [committing.defaultPrevented, composing.defaultPrevented];
  });
  expect(ime).toEqual([false, false]);
  await expect(log).toHaveText('Sent: Shortcut');

  // Once the composition has ended, Enter sends.
  await field.fill('にほん');
  await page.keyboard.press('Enter');
  await expect(log).toHaveText('Sent: にほん');
  await expect(field).toHaveValue('');

  // A composer without submitOnEnter keeps Enter as a newline.
  const prompt = page.getByRole('textbox', { name: 'Prompt' });
  await expect(prompt).not.toHaveAttribute('aria-keyshortcuts');
  await prompt.focus();
  await page.keyboard.type('One');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Two');
  await expect(prompt).toHaveValue('One\nTwo');
});

test('Composer submitOnEnter survives a real Chromium IME composition driven through CDP', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Only Chromium exposes an IME driver (CDP Input.imeSetComposition).',
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=composer');
  const log = page.locator('output.catalog-log');
  const field = page.getByRole('textbox', { name: 'Message' });
  const initialLog = (await log.textContent()) ?? '';
  // Record every keydown after the document-level wiring has seen it, plus
  // the composition boundaries, so the engine's own order is asserted.
  await page.evaluate(() => {
    const events: string[] = [];
    (window as unknown as { imeEvents: string[] }).imeEvents = events;
    window.addEventListener('keydown', (event) =>
      events.push(
        `keydown ${event.key} ${event.keyCode} composing=${event.isComposing} prevented=${event.defaultPrevented}`,
      ),
    );
    for (const type of ['compositionstart', 'compositionend'])
      window.addEventListener(type, (event) =>
        events.push(`${type} ${(event as CompositionEvent).data}`),
      );
  });
  const takeEvents = () =>
    page.evaluate(() =>
      (window as unknown as { imeEvents: string[] }).imeEvents.splice(0),
    );
  await field.focus();
  const cdp = await page.context().newCDPSession(page);

  // Open a real composition: the engine fires compositionstart and keeps the
  // marked text in the field.
  await cdp.send('Input.imeSetComposition', {
    text: 'に',
    selectionStart: 1,
    selectionEnd: 1,
  });
  await cdp.send('Input.imeSetComposition', {
    text: 'にほん',
    selectionStart: 3,
    selectionEnd: 3,
  });
  await expect(field).toHaveValue('にほん');

  // An Enter keydown that reaches the page mid-composition carries
  // isComposing; it is left alone and the composition stays open.
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await expect(field).toHaveValue('にほん');

  // The Enter that commits: the IME consumes the key (Process, keyCode 229),
  // commits the candidate, the engine ends the composition, and only the
  // keyup reports Enter. Nothing is sent and the committed text lands.
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'Process',
    code: 'Enter',
    windowsVirtualKeyCode: 229,
  });
  await cdp.send('Input.insertText', { text: '日本' });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await expect(field).toHaveValue('日本');
  expect(await takeEvents()).toEqual([
    'compositionstart ',
    'keydown Enter 13 composing=true prevented=false',
    'keydown Process 229 composing=true prevented=false',
    'compositionend 日本',
  ]);
  await expect(log).toHaveText(initialLog);

  // Once the composition has completed, Enter sends the committed text.
  await page.keyboard.press('Enter');
  await expect(log).toHaveText('Sent: 日本');
  await expect(field).toHaveValue('');
  expect(await takeEvents()).toEqual([
    'keydown Enter 13 composing=false prevented=true',
  ]);
  await cdp.detach();
});
