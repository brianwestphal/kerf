import { expect, test } from '@playwright/test';

test('edits project TypeScript parameters in a compact dialog across viewport sizes', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 2048, height: 1128 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Params' }).click();
  const panel = page.locator('#editor-document-areas-params-panel');
  await panel.getByRole('button', { name: 'Add parameter' }).click();
  const dialog = page.getByRole('dialog', { name: 'Parameter', exact: true });
  const type = dialog.locator('[data-parameter-draft="type"] textarea');
  await dialog
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('shipping');
  await type.fill('Array<string | number | Shipp');
  const completion = dialog
    .locator('[data-type-suggestion]')
    .filter({ hasText: 'ShippingWindow' });
  await expect(completion).toBeVisible({ timeout: 15000 });
  await completion.click();
  await expect(type).toHaveValue(/ShippingWindow/);
  await type.fill('Array<string | number | ShippingWindow>');
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).focus();
  await expect(type).toHaveValue(/import\(".*order-card.js"\).ShippingWindow/, {
    timeout: 15000,
  });
  await expect(
    dialog.getByRole('button', { name: 'Add parameter', exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: info.outputPath('params-project-type-wide.png'),
  });
  await dialog
    .getByRole('button', { name: 'Add parameter', exact: true })
    .click();
  await expect(dialog).not.toBeVisible({ timeout: 15000 });
  const row = panel.locator('[data-editor-param-row="shipping"]');
  await expect(row).toContainText('ShippingWindow');
  await expect(row.locator('input,textarea,select')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('params-compact-wide.png') });
  await row.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^Item/ }).click();
  await expect(
    dialog.getByRole('textbox', { name: 'Type', exact: true }),
  ).toHaveAttribute('readonly', '');
  await expect(dialog.locator('[data-nav-stack-id]')).toHaveAttribute(
    'data-depth',
    '2',
  );
  await expect(dialog.locator('[data-nav-chrome-transition]')).toHaveCount(0);
  await expect(dialog.locator('[data-nav-active="true"]')).toContainText(
    'Member 1',
  );
  await page.screenshot({ path: info.outputPath('params-navstack-wide.png') });
  // Choose the row again at once: a row chosen while the dialog is still
  // closing reopens it (KF-8SPEG7).
  await dialog.getByRole('button', { name: 'Close parameter' }).click();
  await row.click();
  await expect(dialog).toBeVisible();
  await type.fill('MissingProjectType');
  await expect(dialog).toContainText('Cannot find name', { timeout: 15000 });
  await expect(
    dialog.getByRole('button', { name: 'Save', exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: info.outputPath('params-validation-narrow.png'),
  });
  await type.fill('{id:string;items:Array<number|string>}');
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).focus();
  await expect(type).toHaveValue(/id: string;/, { timeout: 15000 });
  await page.screenshot({
    path: info.outputPath('params-formatted-narrow.png'),
  });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  // Save waits for the compiler's whole-document check, like every other
  // compiler-backed step here.
  await expect(dialog).not.toBeVisible({ timeout: 15000 });
  await page.setViewportSize({ width: 2048, height: 1128 });
  await expect(row).toContainText('id: string');
});

test('validates defaults with the compiler and persists undoable parameter edits', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Params' }).click();
  const panel = page.locator('#editor-document-areas-params-panel');
  await panel.getByRole('button', { name: 'Add parameter' }).click();
  const dialog = page.getByRole('dialog', { name: 'Parameter', exact: true });
  await dialog
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('draftCount');
  // A cold project compiler can outlast the default five-second UI assertion.
  // Wait for this draft's response, not the earlier initial-string analysis.
  const numberAnalysis = page.waitForResponse(
    (response) => {
      if (!response.url().endsWith('/__kerf-ui-editor/api/types')) return false;
      const request = response.request().postDataJSON();
      return request?.action === 'analyze' && request.text === 'number';
    },
    { timeout: 15000 },
  );
  await dialog.locator('[data-parameter-draft="type"] textarea').fill('number');
  await dialog.getByRole('switch', { name: 'Use default' }).click();
  await dialog
    .getByRole('textbox', { name: 'Default value (JSON)' })
    .fill('"wrong"');
  const response = await numberAnalysis;
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ diagnostics: [] });
  await expect(
    dialog.getByRole('button', { name: 'Add parameter', exact: true }),
  ).toBeEnabled();
  await dialog
    .getByRole('button', { name: 'Add parameter', exact: true })
    .click();
  await expect(dialog).toContainText('not assignable', { timeout: 15000 });
  await expect(
    panel.locator('[data-editor-param-row="draftCount"]'),
  ).toHaveCount(0);
  await dialog
    .getByRole('textbox', { name: 'Default value (JSON)' })
    .fill('42');
  await dialog
    .getByRole('button', { name: 'Add parameter', exact: true })
    .click();
  await expect(dialog).not.toBeVisible({ timeout: 15000 });
  await panel.locator('[data-editor-param-row="draftCount"]').click();
  await dialog
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('itemCount');
  // Reopening formats the stored type through the compiler first.
  await expect(
    dialog.getByRole('button', { name: 'Save', exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 15000 });
  await expect(
    panel.locator('[data-editor-param-row="itemCount"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    panel.locator('[data-editor-param-row="draftCount"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(
    panel.locator('[data-editor-param-row="itemCount"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-editor-param-row="itemCount"]'),
  ).toContainText('number');
  await expect(page.getByText(/autosaved/)).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Params' }).click();
  await expect(
    panel.locator('[data-editor-param-row="itemCount"]'),
  ).toBeVisible();
  await panel.locator('[data-editor-param-row="itemCount"]').click();
  await expect(
    dialog.getByRole('textbox', { name: 'Default value (JSON)' }),
  ).toHaveValue('42');
});
