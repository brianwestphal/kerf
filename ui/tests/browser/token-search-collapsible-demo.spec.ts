import { expect, test } from '@playwright/test';

test('the TokenSearchField demo shows and drives the collapsible state', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.goto('/?component=token-search-field');

  const field = page.locator(
    '.token-search-demo__collapsible [data-component="token-search-field"]',
  );
  const trigger = field.getByRole('button', { name: 'Open find' });
  const editor = field.getByRole('searchbox', { name: 'Find records' });

  // Starts collapsed to one iconic action.
  await expect(field).toHaveAttribute('data-collapsible', 'true');
  await expect(field).toHaveAttribute('data-expanded', 'false');
  await expect(trigger).toBeVisible();
  await expect(editor).toBeHidden();
  if (browserName === 'chromium')
    await page
      .locator('.token-search-demo__collapsible')
      .screenshot({ path: 'test-results/token-search-collapsed.png' });

  // Activating reveals the editor and focuses it (helper-managed).
  await trigger.click();
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await editor.pressSequentially('priority');
  if (browserName === 'chromium')
    await page
      .locator('.token-search-demo__collapsible')
      .screenshot({ path: 'test-results/token-search-expanded.png' });

  // Non-empty field stays open when focus leaves.
  await page.locator('[data-action="toggle-theme"]').first().focus();
  await expect(editor).toBeVisible();

  // Emptying then blurring re-collapses it: refocus, clear deterministically, blur.
  await editor.click();
  await editor.evaluate((element) => {
    element.textContent = '';
    element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'deleteContentBackward',
      }),
    );
  });
  await page.locator('[data-action="toggle-theme"]').first().focus();
  await expect(trigger).toBeVisible();
  await expect(editor).toBeHidden();
});
