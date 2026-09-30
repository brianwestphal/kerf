import { expect, type Locator, test } from '@playwright/test';

// A multiple Select keeps its popup open while the person toggles choices and
// closes only on an outside press, Escape, or focus leaving. The closed
// control summarizes the chosen labels in choice order, each chosen option
// shows a check, change events report the value array, a form submits every
// value under the name, and a re-render that changes the rendered `selected`
// options updates the selection even after the person interacted.

function state(select: Locator) {
  return select.evaluate((host) => {
    const element = host as HTMLElement & {
      open: boolean;
      value: string[] | string | null;
    };
    return {
      open: element.open,
      value: element.value,
      display: host.shadowRoot!.querySelector<HTMLInputElement>(
        '[part~="display-input"]',
      )!.value,
      checked: [...host.querySelectorAll('wa-option')]
        .filter(
          (option) => (option as HTMLElement & { selected: boolean }).selected,
        )
        .map((option) => option.getAttribute('value')),
    };
  });
}

test('a multiple Select stays open while choices toggle and closes on click away', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="ticket-labels"]');
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();

  await expect
    .poll(async () => (await state(select)).display)
    .toBe('Bug, Docs');
  // Web Awesome's per-choice tags are replaced by the summary.
  expect(
    await select.evaluate(
      (host) => host.shadowRoot!.querySelectorAll('wa-tag').length,
    ),
  ).toBe(0);

  const changes: unknown[] = [];
  await page.exposeFunction('recordChange', (value: unknown) =>
    changes.push(value),
  );
  await select.evaluate((host) =>
    host.addEventListener('change', () =>
      (window as unknown as { recordChange(v: unknown): void }).recordChange(
        (host as HTMLElement & { value: unknown }).value,
      ),
    ),
  );

  await select.click();
  await expect(select).toHaveAttribute('open', '');
  await select.locator('wa-option[value="feature"]').click();
  await expect.poll(() => changes.length).toBe(1);
  let current = await state(select);
  expect(current.open).toBe(true);
  expect([...(current.value as string[])].sort()).toEqual([
    'bug',
    'docs',
    'feature',
  ]);
  expect(current.checked).toEqual(['bug', 'feature', 'docs']);
  // Choice order, whatever order the person chose in.
  expect(current.display).toBe('Bug, Feature, Docs');

  await select.locator('wa-option[value="bug"]').click();
  await expect.poll(() => changes.length).toBe(2);
  current = await state(select);
  expect(current.open).toBe(true);
  expect(current.checked).toEqual(['feature', 'docs']);
  expect(changes.at(-1)).toEqual(current.value);

  // Clicking away closes it and keeps the choices.
  await page.mouse.click(4, 4);
  await expect(select).not.toHaveAttribute('open', '');
  expect((await state(select)).display).toBe('Feature, Docs');
});

test('disabled choices and opt-in bulk actions keep the multiple Select controlled', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="item-types"]');
  await select.scrollIntoViewIfNeeded();
  const changes: unknown[] = [];
  await page.exposeFunction('recordItemTypes', (value: unknown) =>
    changes.push(value),
  );
  await select.evaluate((host) =>
    host.addEventListener('change', () =>
      (
        window as unknown as { recordItemTypes(v: unknown): void }
      ).recordItemTypes((host as HTMLElement & { value: unknown }).value),
    ),
  );
  await select.click();
  const browser = select.locator('wa-option[value="browsers"]');
  await expect(browser).toHaveAttribute('aria-disabled', 'true');
  await expect(browser).toHaveAttribute('title', 'Not yet supported');
  const selectAll = select.locator('button[data-select-action="all"]');
  const clear = select.locator('button[data-select-action="clear"]');
  await expect(selectAll).toBeVisible();
  await expect(clear).toBeVisible();
  await selectAll.click();
  await expect.poll(() => changes.length).toBe(1);
  await expect
    .poll(async () => (await state(select)).checked)
    .toEqual(['files', 'windows', 'tabs']);
  expect((await state(select)).display).toBe('Files, Windows, Tabs');
  await expect(select).toHaveAttribute('open', '');
  await selectAll.click();
  expect(changes).toHaveLength(1);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/select-actions-wide.png' });
  await clear.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => changes.length).toBe(2);
  await expect.poll(async () => (await state(select)).checked).toEqual([]);
  await expect(select).toHaveAttribute('open', '');
  await browser.click({ force: true });
  expect((await state(select)).checked).toEqual([]);
  await select.getByRole('combobox').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(browser).toBeFocused();
  await page.keyboard.press('Enter');
  expect((await state(select)).checked).toEqual([]);
  expect(changes).toHaveLength(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(selectAll).toBeVisible();
  await expect(clear).toBeVisible();
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/select-actions-narrow.png' });
});

test('a multiple Select toggles from the keyboard and closes on Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="ticket-labels"]');
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();
  await select.getByRole('combobox').focus();

  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('open', '');
  // The first chosen option is current; Space toggles it and stays open.
  await page.keyboard.press(' ');
  await expect
    .poll(async () => (await state(select)).checked)
    .toEqual(['docs']);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect
    .poll(async () => (await state(select)).checked)
    .toEqual(['feature', 'docs']);
  expect((await state(select)).open).toBe(true);

  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await expect(select.getByRole('combobox')).toBeFocused();
  expect((await state(select)).display).toBe('Feature, Docs');

  // Deselecting everything shows the placeholder.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(select)).checked).toEqual([]);
  expect(
    await select.evaluate(
      (host) =>
        host.shadowRoot!.querySelector<HTMLInputElement>(
          '[part~="display-input"]',
        )!.placeholder,
    ),
  ).toBe('No labels');
});

test('a re-rendered selection is the controlled value, even after interaction', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="ticket-labels"]');
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();
  await select.click();
  await select.locator('wa-option[value="design"]').click();
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');

  // What a morph does when the application's value changes.
  await select.evaluate((host) => {
    for (const option of host.querySelectorAll('wa-option'))
      option.toggleAttribute(
        'selected',
        ['feature', 'performance'].includes(option.getAttribute('value')!),
      );
  });
  await expect
    .poll(async () => (await state(select)).checked)
    .toEqual(['feature', 'performance']);
  expect((await state(select)).display).toBe('Feature, Performance');
});

test('a multiple Select submits every chosen value under its name', async ({
  page,
}) => {
  await page.goto('/?component=select');
  await expect(page.locator('wa-select[name="ticket-labels"]')).toBeVisible();
  const submitted = await page.evaluate(async () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <wa-select data-component="select" class="kui-select" name="labels" multiple label="Labels">
        <wa-option value="bug" selected>Bug</wa-option>
        <wa-option value="docs">Docs</wa-option>
        <wa-option value="design" selected>Design</wa-option>
      </wa-select>`;
    document.body.append(form);
    const select = form.querySelector('wa-select') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await customElements.whenDefined('wa-select');
    await select.updateComplete;
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    const values = new FormData(form).getAll('labels');
    const display = select.shadowRoot!.querySelector<HTMLInputElement>(
      '[part~="display-input"]',
    )!.value;
    form.remove();
    return { values, display };
  });
  expect(submitted.values).toEqual(['bug', 'design']);
  expect(submitted.display).toBe('Bug, Design');
});
