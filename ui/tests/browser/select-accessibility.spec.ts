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
  await expect(custom).toHaveValue('Balanced');
  await expect(plain).toHaveValue('Balanced');
  await expect(labeled).toHaveValue('Balanced');
  const labeledHost = demo.locator(
    'wa-select[name="labeled-rendering-balance"]',
  );
  await expect(labeledHost.locator('[part~="hint"]')).toHaveText(
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
