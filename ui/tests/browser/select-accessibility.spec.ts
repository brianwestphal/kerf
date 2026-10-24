import { expect, test } from '@playwright/test';

test('names plain and custom Select comboboxes without adding visible label geometry', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=select');
  const demo = page.locator('[data-demo="select"]');
  const custom = demo.getByRole('combobox', {
    name: 'Rendering Balance',
    exact: true,
  });
  const plain = demo.getByRole('combobox', {
    name: 'Plain Rendering Balance',
    exact: true,
  });
  const labeled = demo.getByRole('combobox', {
    name: 'Rendering Preference',
    exact: true,
  });
  const toolbar = demo.getByRole('combobox', {
    name: 'Toolbar Rendering Balance',
    exact: true,
  });
  const navigation = demo.getByRole('combobox', {
    name: 'Navigation Rendering Balance',
    exact: true,
  });
  // The closed trigger's value text (visually hidden for an icon-only one).
  const valueOf = (control: typeof custom) =>
    control.locator('.kui-select__value');
  await expect(valueOf(custom)).toHaveText('Balanced');
  await expect(valueOf(plain)).toHaveText('Balanced');
  await expect(valueOf(labeled)).toHaveText('Balanced');
  await expect(valueOf(toolbar)).toHaveText('Balanced');
  await expect(valueOf(navigation)).toHaveText('Balanced Navigation Workspace');
  const toolbarHost = demo.locator(
    'kui-select[name="toolbar-rendering-balance"]',
  );
  const navigationHost = demo.locator(
    'kui-select[name="navigation-rendering-balance"]',
  );
  const customSelected = demo.locator(
    'kui-select[name="rendering-balance"] .kui-select__custom-selected',
  );
  expect(
    await toolbarHost.evaluate((element) => ({
      width: Math.round(element.getBoundingClientRect().width),
      height: Math.round(
        element
          .querySelector(':scope > .kui-select__trigger')!
          .getBoundingClientRect().height,
      ),
      valueWidth: Math.round(
        element.querySelector('.kui-select__value')!.getBoundingClientRect()
          .width,
      ),
    })),
  ).toEqual({ width: 66, height: 32, valueWidth: 1 });
  expect(
    await navigationHost.evaluate((element) =>
      Math.round(
        element.querySelector('.kui-select__value')!.getBoundingClientRect()
          .width,
      ),
    ),
  ).toBeLessThanOrEqual(120);
  const labeledHost = demo.locator(
    'kui-select[name="labeled-rendering-balance"]',
  );
  await expect(labeledHost.locator('.kui-select__hint')).toHaveText(
    'Controls how much rendering detail is shown.',
  );
  // The visible hint is decorative; the trigger carries it as its
  // description, so it is announced once.
  await expect(labeledHost.locator('.kui-select__hint')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await expect(labeled).toHaveAccessibleDescription(
    'Controls how much rendering detail is shown.',
  );
  await expect(demo.getByText('Loading selection options.')).toBeVisible();
  // (Web Awesome's slotted-hint path has no equivalent: the hint is a prop.)

  for (const name of ['rendering-balance', 'plain-rendering-balance']) {
    const control = demo.locator(`kui-select[name="${name}"]`);
    const heights = await control.evaluate((element) => ({
      host: element.getBoundingClientRect().height,
      combobox: element
        .querySelector(':scope > .kui-select__trigger')!
        .getBoundingClientRect().height,
    }));
    expect(Math.abs(heights.host - heights.combobox)).toBeLessThan(1);
  }
  await expect(
    demo
      .locator('kui-select[name="labeled-rendering-balance"]')
      .locator('.kui-select__label'),
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
    await expect(valueOf(control)).toHaveText('Quiet');
    await expect(customSelected).toHaveText('Quiet');
    await expect(control).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(control).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('End');
    const lastOption = demo.getByRole('option', {
      name: 'Explicit',
      exact: true,
    });
    await expect(lastOption).toBeFocused();
    await lastOption.press('Enter');
    await expect(valueOf(control)).toHaveText('Explicit');
    await expect(customSelected).toHaveText('Explicit');
  }
  await page.locator('[data-action="toggle-theme"]').click();
  await expect(valueOf(custom)).toHaveText('Explicit');
  await expect(valueOf(plain)).toHaveText('Explicit');
  await page.setViewportSize({ width: 390, height: 844 });
  await demo.scrollIntoViewIfNeeded();
  await expect(custom).toHaveAccessibleName('Rendering Balance');
  await expect(plain).toHaveAccessibleName('Plain Rendering Balance');
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
  const host = page.locator('kui-select[name="rendering-balance"]');
  await host.getByRole('combobox').click();
  const control = host.locator('[role="group"][aria-label="Control"]');
  await expect(control).toBeVisible();
  // The demo marks "Explicit" separatorBefore, but it opens the separated
  // "Control" group whose border already separates it.
  await expect(control.locator('.kui-select__separator')).toHaveCount(0);
  await expect(control).toHaveCSS('border-top-style', 'solid');
  const gap = await control.evaluate((group) => {
    const title = group
      .querySelector('.kui-select__group-title')!
      .getBoundingClientRect();
    const option = group
      .querySelector('.kui-select__option')!
      .getBoundingClientRect();
    return option.top - title.bottom;
  });
  // The first choice follows its group title directly: no empty band.
  expect(Math.abs(gap)).toBeLessThanOrEqual(1);
  if (browserName === 'chromium')
    await host.locator('.kui-select__popup').screenshot({
      path: 'test-results/select-separated-group.png',
    });
});
