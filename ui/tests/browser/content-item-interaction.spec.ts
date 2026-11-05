import { expect, test } from '@playwright/test';

test('interactive cards select with pointer and keyboard without moving their frame', async ({
  page,
}) => {
  await page.goto('/?component=content-item');
  const demo = page.locator('[data-demo="content-item"]');
  const toggle = demo.locator('[data-demo-item="toggle-card"]');
  const disabled = demo.locator('[data-demo-item="disabled-card"]');
  const optionA = demo.locator('[data-demo-item="document-a"]');
  const optionB = demo.locator('[data-demo-item="document-b"]');
  const log = page.locator('.catalog-log');

  await expect(toggle).toHaveAttribute('role', 'button');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAttribute('title', 'Edit this quotation');
  const loweredBackground = await toggle.evaluate(
    (element) =>
      window.getComputedStyle(element.parentElement!).backgroundColor,
  );
  const before = await toggle.boundingBox();
  const restingBorder = await toggle.evaluate(
    (element) => window.getComputedStyle(element).borderColor,
  );
  await toggle.hover();
  const hoverBorder = await toggle.evaluate(
    (element) => window.getComputedStyle(element).borderColor,
  );
  const hoverBackground = await toggle.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );
  expect(hoverBackground).not.toBe(loweredBackground);
  expect(hoverBorder).not.toBe(restingBorder);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(log).toContainText('Card line-42 selected');
  const selectedBackground = await toggle.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );
  expect(selectedBackground).not.toBe(hoverBackground);
  expect((await toggle.boundingBox())?.width).toBeCloseTo(
    before?.width ?? 0,
    2,
  );
  expect((await toggle.boundingBox())?.height).toBeCloseTo(
    before?.height ?? 0,
    2,
  );

  await toggle.focus();
  await toggle.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS('outline-style', 'solid');
  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(log).toContainText('Card line-42 cleared');
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await expect(optionA).toHaveAttribute('aria-selected', 'true');
  await optionB.click();
  await expect(optionB).toHaveAttribute('aria-selected', 'true');
  await expect(optionA).toHaveAttribute('aria-selected', 'false');
  await expect(log).toContainText('Card document-b selected');

  await expect(disabled).toHaveAttribute('aria-disabled', 'true');
  await expect(disabled).toHaveAttribute('tabindex', '-1');
  await expect(disabled).not.toHaveAttribute('data-action', /.+/);
  await expect(disabled).toHaveCSS('cursor', 'not-allowed');
  await disabled.evaluate((element: HTMLElement) => element.click());
  await expect(log).toContainText('Card document-b selected');

  await page.setViewportSize({ width: 390, height: 844 });
  await toggle.scrollIntoViewIfNeeded();
  await expect(toggle).toBeInViewport();
  await expect(optionB).toHaveAttribute('aria-selected', 'true');
  await toggle.screenshot({
    path: 'test-results/content-item-interaction-narrow.png',
  });
});

test('keyboard activation forwards Shift, Ctrl, and Meta to the click', async ({
  page,
}) => {
  await page.goto('/?component=content-item');
  const toggle = page.locator(
    '[data-demo="content-item"] [data-demo-item="toggle-card"]',
  );
  await toggle.evaluate((element) => {
    const seen: string[] = [];
    (window as unknown as { seenClicks: string[] }).seenClicks = seen;
    element.addEventListener('click', (event) => {
      const click = event as MouseEvent;
      const flags = (['shiftKey', 'ctrlKey', 'metaKey', 'altKey'] as const)
        .filter((flag) => click[flag])
        .join('+');
      seen.push(flags || 'plain');
    });
  });
  await toggle.focus();
  for (const chord of [
    'Enter',
    'Shift+Enter',
    'Control+Enter',
    'Meta+Enter',
    'Shift+Space',
    'Control+Space',
    'Meta+Space',
  ])
    await page.keyboard.press(chord);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { seenClicks: string[] }).seenClicks,
      ),
    )
    .toEqual([
      'plain',
      'shiftKey',
      'ctrlKey',
      'metaKey',
      'shiftKey',
      'ctrlKey',
      'metaKey',
    ]);
});

// KF-3WS7RR: a single-select ContentItem listbox is one Tab stop with
// Up/Down/Home/End movement and Enter/Space selection.
test('a single-select ContentItem listbox roves one Tab stop with arrow keys', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=content-item');
    const listbox = page.getByRole('listbox', { name: 'Documents' });
    const optionA = listbox.locator('[data-demo-item="document-a"]');
    const optionB = listbox.locator('[data-demo-item="document-b"]');
    await expect(optionA).toHaveAttribute('aria-selected', 'true');
    await expect(optionA).toHaveAttribute('tabindex', '0');
    await expect(optionB).toHaveAttribute('tabindex', '-1');
    await optionA.focus();
    await page.keyboard.press('ArrowDown');
    await expect(optionB).toBeFocused();
    await expect(optionB).toHaveAttribute('aria-selected', 'false');
    await expect(optionB).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('Home');
    await expect(optionA).toBeFocused();
    await page.keyboard.press('End');
    await expect(optionB).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(optionB).toHaveAttribute('aria-selected', 'true');
    await expect(optionA).toHaveAttribute('aria-selected', 'false');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await expect(optionA).toHaveAttribute('aria-selected', 'true');
    // The selection moved the stop with focus: one Tab stop remains.
    await expect(listbox.locator('[role="option"][tabindex="0"]')).toHaveCount(
      1,
    );
  }
});
