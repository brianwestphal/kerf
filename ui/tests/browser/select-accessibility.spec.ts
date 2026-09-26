import { expect, test } from '@playwright/test';

test('names plain and custom Select comboboxes without adding visible label geometry', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=select');
  const demo = page.locator('[data-demo="select"]');
  const custom = demo.getByRole('combobox', {
    name: 'Rendering balance',
    exact: true,
  });
  const plain = demo.getByRole('combobox', {
    name: 'Plain rendering balance',
    exact: true,
  });
  const labeled = demo.getByRole('combobox', {
    name: 'Rendering preference',
    exact: true,
  });
  const toolbar = demo.getByRole('combobox', {
    name: 'Toolbar rendering balance',
    exact: true,
  });
  const navigation = demo.getByRole('combobox', {
    name: 'Navigation rendering balance',
    exact: true,
  });
  await expect(custom).toHaveValue('Balanced');
  await expect(plain).toHaveValue('Balanced');
  await expect(labeled).toHaveValue('Balanced');
  await expect(toolbar).toHaveValue('Balanced');
  await expect(navigation).toHaveValue('Balanced navigation workspace');
  const toolbarHost = demo.locator(
    'wa-select[name="toolbar-rendering-balance"]',
  );
  const navigationHost = demo.locator(
    'wa-select[name="navigation-rendering-balance"]',
  );
  expect(
    await toolbarHost.evaluate((element) => ({
      width: Math.round(element.getBoundingClientRect().width),
      height: Math.round(
        element
          .shadowRoot!.querySelector('[part~="combobox"]')!
          .getBoundingClientRect().height,
      ),
      displayInputWidth: Math.round(
        element
          .shadowRoot!.querySelector('[part~="display-input"]')!
          .getBoundingClientRect().width,
      ),
    })),
  ).toEqual({ width: 66, height: 32, displayInputWidth: 1 });
  expect(
    await navigationHost.evaluate((element) =>
      Math.round(
        element
          .shadowRoot!.querySelector('[part~="display-input"]')!
          .getBoundingClientRect().width,
      ),
    ),
  ).toBeLessThanOrEqual(120);
  const labeledHost = demo.locator(
    'wa-select[name="labeled-rendering-balance"]',
  );
  await expect(labeledHost.locator('[part~="hint"]')).toHaveText(
    'Controls how much rendering detail is shown.',
  );
  await expect(labeled).toHaveAccessibleDescription(
    'Controls how much rendering detail is shown.',
  );
  await expect(demo.getByText('Loading selection options.')).toBeVisible();
  expect(
    await labeledHost.evaluate((element) => {
      const input = element.shadowRoot!.querySelector('[role="combobox"]')!;
      const hint = element.shadowRoot!.querySelector('[part~="hint"]')!;
      return {
        describedBy: input.getAttribute('aria-describedby'),
        hintId: hint.id,
        hintText: hint.textContent?.trim(),
      };
    }),
  ).toEqual({
    describedBy: 'hint',
    hintId: 'hint',
    hintText: 'Controls how much rendering detail is shown.',
  });

  // Web Awesome's explicit hint-slot path resolves on the same accessible
  // combobox. The custom-element host itself is only a wrapper and therefore
  // is not the node whose computed description should be inspected.
  await labeledHost.evaluate((element) => {
    const slotted = document.createElement('wa-select');
    slotted.setAttribute('name', 'slotted-hint');
    slotted.setAttribute('label', 'Slotted hint example');
    slotted.setAttribute('value', 'one');
    slotted.setAttribute('with-hint', '');
    const option = document.createElement('wa-option');
    option.setAttribute('value', 'one');
    option.textContent = 'One';
    const hint = document.createElement('span');
    hint.slot = 'hint';
    hint.textContent = 'Supporting text from the explicit hint slot.';
    slotted.append(option, hint);
    element.after(slotted);
  });
  await expect(
    demo.getByRole('combobox', {
      name: 'Slotted hint example',
      exact: true,
    }),
  ).toHaveAccessibleDescription('Supporting text from the explicit hint slot.');

  for (const name of ['rendering-balance', 'plain-rendering-balance']) {
    const control = demo.locator(`wa-select[name="${name}"]`);
    const heights = await control.evaluate((element) => ({
      host: element.getBoundingClientRect().height,
      combobox: element
        .shadowRoot!.querySelector('[part~="combobox"]')!
        .getBoundingClientRect().height,
    }));
    expect(Math.abs(heights.host - heights.combobox)).toBeLessThan(1);
  }
  await expect(
    demo
      .locator('wa-select[name="labeled-rendering-balance"]')
      .locator('label'),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('select-name-wide.png'),
    fullPage: true,
  });

  // Real keyboard selection drives the catalog's controlled rerender, retaining
  // both the accessible name and custom selected content after each choice.
  for (const control of [plain, custom]) {
    await control.focus();
    await page.keyboard.press('Enter');
    await expect(control).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(control).toHaveValue('Quiet');
    await expect(demo.locator('.kui-select__custom-selected')).toHaveText(
      'Quiet',
    );
    await expect(control).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(control).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(control).toHaveValue('Explicit');
    await expect(demo.locator('.kui-select__custom-selected')).toHaveText(
      'Explicit',
    );
  }
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(custom).toHaveValue('Explicit');
  await expect(plain).toHaveValue('Explicit');
  await page.setViewportSize({ width: 390, height: 844 });
  await demo.scrollIntoViewIfNeeded();
  await expect(custom).toHaveAccessibleName('Rendering balance');
  await expect(plain).toHaveAccessibleName('Plain rendering balance');
  await page.screenshot({
    path: testInfo.outputPath('select-name-narrow.png'),
    fullPage: true,
  });
});

test('a separated Select group draws a single separator before its first choice', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=select');
  const host = page.locator('wa-select[name="rendering-balance"]');
  await host.click();
  const control = host.locator('[role="group"][aria-label="Control"]');
  await expect(control).toBeVisible();
  // The demo marks "Explicit" separatorBefore, but it opens the separated
  // "Control" group whose border already separates it.
  await expect(control.locator('wa-divider')).toHaveCount(0);
  await expect(control).toHaveCSS('border-top-style', 'solid');
  const gap = await control.evaluate((group) => {
    const title = group
      .querySelector('.kui-select__group-title')!
      .getBoundingClientRect();
    const option = group.querySelector('wa-option')!.getBoundingClientRect();
    return option.top - title.bottom;
  });
  // The first choice follows its group title directly: no empty band.
  expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  if (browserName === 'chromium')
    await host.locator('[part~="listbox"]').screenshot({
      path: 'test-results/select-separated-group.png',
    });
});
