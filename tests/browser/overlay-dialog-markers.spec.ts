import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

test('prompt() and form() reject missing BYO input markers immediately', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { form, prompt } = (window as any).kerfOverlay;
    const { jsx } = (window as any).jsxRuntime;
    const errors: string[] = [];

    try {
      prompt('Name', { render: () => jsx('input', {}) });
    } catch (error) {
      errors.push((error as Error).message);
    }
    try {
      form([{ name: 'token' }], {
        render: () => jsx('input', { 'data-feild': 'token' }),
      });
    } catch (error) {
      errors.push((error as Error).message);
    }

    return {
      errors,
      overlays: document.querySelectorAll('.kerf-overlay').length,
    };
  });

  expect(result).toEqual({
    errors: [
      'prompt(): render missing <input data-prompt-input>.',
      'form(): render missing <input data-field="token">.',
    ],
    overlays: 0,
  });
});
