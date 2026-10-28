import { expect, type Locator, test } from '@playwright/test';

// A multiple Select keeps its popup open while the person toggles choices and
// closes only on an outside press, Escape, or focus leaving. The closed
// control summarizes the chosen labels in choice order, each chosen option
// shows a check, change events report the value array, a form submits every
// value under the name, and a re-render that changes the rendered `selected`
// options updates the selection even after the person interacted.

function state(select: Locator) {
  return select.evaluate((host) => {
    const element = host as HTMLElement & { value: string[] | string };
    const display = host.querySelector('.kui-select__value')!;
    return {
      open: host.hasAttribute('open'),
      value: element.value,
      display: display.hasAttribute('data-placeholder')
        ? ''
        : display.textContent,
      placeholder: display.getAttribute('data-placeholder-text'),
      checked: [
        ...host.querySelectorAll('.kui-select__option[aria-selected="true"]'),
      ].map((option) => option.getAttribute('data-value')),
    };
  });
}

const option = (select: Locator, value: string) =>
  select.locator(`.kui-select__option[data-value="${value}"]`);

test('a multiple Select stays open while choices toggle and closes on click away', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="ticket-labels"]');
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();

  await expect
    .poll(async () => (await state(select)).display)
    .toBe('Bug, Docs');
  // One summary, never per-choice tags.
  await expect(select.locator('.kui-select__value')).toHaveCount(1);

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

  await select.getByRole('combobox').click();
  await expect(select).toHaveAttribute('open', '');
  await option(select, 'feature').click();
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

  await option(select, 'bug').click();
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
  const select = page.locator('kui-select[name="item-types"]');
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
  await select.getByRole('combobox').click();
  const browser = option(select, 'browsers');
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
  // Keyboard focus reaches a disabled choice, but Enter does not choose it.
  await option(select, 'files').focus();
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
  const select = page.locator('kui-select[name="ticket-labels"]');
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

  // Deselecting everything shows the placeholder. Like the steps above,
  // each toggle is confirmed before the next key, so a slow re-render after
  // one change cannot race the keys that follow it (KF-R0AXGJ: CI flake).
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('open', '');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await expect
    .poll(async () => (await state(select)).checked)
    .toEqual(['docs']);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await expect.poll(async () => (await state(select)).checked).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await expect(select.locator('.kui-select__value')).toHaveAttribute(
    'data-placeholder',
    'true',
  );
  await expect(select.locator('.kui-select__value')).toHaveText('No labels');
});

test('a re-rendered selection is the controlled value, even after interaction', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('kui-select[name="ticket-labels"]');
  await expect(select).toBeVisible();
  await select.scrollIntoViewIfNeeded();
  await select.getByRole('combobox').click();
  await option(select, 'design').click();
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');

  // What a morph does when the application's value changes.
  await select.evaluate((host) => {
    for (const option of host.querySelectorAll('.kui-select__option'))
      option.setAttribute(
        'aria-selected',
        String(
          ['feature', 'performance'].includes(
            option.getAttribute('data-value')!,
          ),
        ),
      );
  });
  await expect
    .poll(async () => (await state(select)).checked)
    .toEqual(['feature', 'performance']);
  expect((await state(select)).value).toEqual(['feature', 'performance']);
});

test('a multiple Select submits every chosen value under its name', async ({
  page,
}) => {
  await page.goto('/?component=select');
  await expect(page.locator('kui-select[name="ticket-labels"]')).toBeVisible();
  const submitted = await page.evaluate(async () => {
    // A copy of the rendered control (Bug and Docs chosen) inside a form.
    const form = document.createElement('form');
    const source = document.querySelector('kui-select[name="ticket-labels"]')!;
    form.append(source.cloneNode(true));
    document.body.append(form);
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    const values = new FormData(form).getAll('ticket-labels');
    const display = form.querySelector('.kui-select__value')!.textContent;
    form.remove();
    return { values, display };
  });
  expect(submitted.values).toEqual(['bug', 'docs']);
  expect(submitted.display).toBe('Bug, Docs');
});
