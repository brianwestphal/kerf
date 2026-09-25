import { expect, test } from '@playwright/test';

test('the TokenSearchField demo shows and drives the collapsible state', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.goto('/?component=token-search-field');

  const example = page
    .locator('[data-demo="token-search-field"] [data-catalog-example]')
    .filter({
      has: page.locator('[data-catalog-example-label]', {
        hasText: /^\s*Collapsible\s*$/,
      }),
    });
  const field = example.locator('[data-component="token-search-field"]');
  const trigger = field.getByRole('button', { name: 'Open find' });
  const editor = field.getByRole('searchbox', { name: 'Find records' });

  // Starts collapsed to one iconic action.
  await expect(field).toHaveAttribute('data-collapsible', 'true');
  await expect(field).toHaveAttribute('data-expanded', 'false');
  await expect(trigger).toBeVisible();
  await expect(editor).toBeHidden();
  if (browserName === 'chromium')
    await example.screenshot({
      path: 'test-results/token-search-collapsed.png',
    });

  // Activating reveals the editor and focuses it (helper-managed).
  await trigger.click();
  await expect(editor).toBeVisible();
  await expect(editor).toBeFocused();
  await editor.pressSequentially('priority');
  if (browserName === 'chromium')
    await example.screenshot({
      path: 'test-results/token-search-expanded.png',
    });

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

test('disposing the demo wiring cancels pending collapsible focus restoration', async ({
  page,
}) => {
  for (const transition of ['open', 'close'] as const) {
    await page.goto('/?component=token-search-field');
    const example = page
      .locator('[data-demo="token-search-field"] [data-catalog-example]')
      .filter({
        has: page.locator('[data-catalog-example-label]', {
          hasText: /^\s*Collapsible\s*$/,
        }),
      });
    const field = example.locator('[data-component="token-search-field"]');
    if (transition === 'close') {
      await field.getByRole('button', { name: 'Open find' }).click();
      await expect(
        field.getByRole('searchbox', { name: 'Find records' }),
      ).toBeFocused();
    }
    await page.evaluate((kind) => {
      const container = [
        ...document.querySelectorAll<HTMLElement>(
          '[data-demo="token-search-field"] [data-catalog-example]',
        ),
      ].find(
        (example) =>
          example
            .querySelector('[data-catalog-example-label]')
            ?.textContent?.trim() === 'Collapsible',
      )!;
      if (kind === 'open') {
        container
          .querySelector<HTMLElement>('.kui-token-search__expand')!
          .click();
      } else {
        container
          .querySelector<HTMLElement>('[data-token-search-editor]')!
          .dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Escape',
              bubbles: true,
              cancelable: true,
            }),
          );
      }
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
      document
        .querySelector<HTMLElement>('[data-action="toggle-theme"]')!
        .focus();
    }, transition);
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          window.requestAnimationFrame(() => resolve(null)),
        ),
    );
    await expect(
      page.locator('[data-action="toggle-theme"]').first(),
    ).toBeFocused();
  }
});
