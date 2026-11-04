import { expect, test } from '@playwright/test';

// KF-XX4Y95: a Form submits by Enter or its submit Button, runs native
// validation first unless noValidate is set, and never navigates the page.
test('Form submits to its action without navigating', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=form');
  const url = page.url();
  const log = page.locator('.catalog-log');
  const examples = page.locator('[data-demo="form"] [data-catalog-example]');

  const native = examples.nth(0);
  const nativeForm = native.locator('form.kui-form');
  // display: contents — the Form generates no box of its own.
  await expect
    .poll(() =>
      nativeForm.evaluate((form) => globalThis.getComputedStyle(form).display),
    )
    .toBe('contents');
  const field = native.getByRole('textbox', { name: 'Project Name' });

  // The required field blocks an empty submission before submit fires.
  await native.getByRole('button', { name: 'Save' }).click();
  await expect(log).not.toHaveText(/Saved project|Add a project name/);
  expect(
    await field.evaluate((input) => (input as HTMLInputElement).validity.valid),
  ).toBe(false);

  // Enter in the field submits it (implicit submission).
  await field.fill('Atlas');
  await field.press('Enter');
  await expect(log).toHaveText('Saved project: Atlas');
  expect(page.url()).toBe(url);
  if (browserName === 'chromium')
    await native.screenshot({ path: 'test-results/form-native-wide.png' });

  // noValidate: the submit handler validates and reports the result.
  const app = examples.nth(1);
  await app.getByRole('button', { name: 'Save' }).click();
  await expect(log).toHaveText('Add a project name');
  await app.getByRole('textbox', { name: 'Project Name' }).fill('Beacon');
  await app.getByRole('button', { name: 'Save' }).click();
  await expect(log).toHaveText('Saved project: Beacon');
  expect(page.url()).toBe(url);

  await page.setViewportSize({ width: 390, height: 844 });
  if (browserName === 'chromium')
    await page
      .locator('[data-demo="form"]')
      .screenshot({ path: 'test-results/form-narrow.png' });
});
