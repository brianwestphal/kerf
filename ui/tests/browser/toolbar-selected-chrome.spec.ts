import { expect, type Locator, test } from '@playwright/test';

const chrome = (button: Locator) =>
  button.evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      background: style.backgroundColor,
      shadow: style.boxShadow,
      border: style.borderTopColor,
    };
  });

// An icon-state toggle (a filled star) shows its own pressed state, so it opts
// out of the group's selected chrome while its neighbors keep theirs.
test('a pressed control can opt out of selected chrome, per control or per group', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=toolbar-control-group');
  const demo = page.locator('[data-demo="toolbar-control-group"]');
  const optedOut = demo.getByRole('button', { name: 'Up next' });
  const selected = demo.getByRole('button', { name: 'Featured' });
  await expect(optedOut).toHaveAttribute('aria-pressed', 'true');
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  const none = await chrome(optedOut);
  expect(none.background).toBe('rgba(0, 0, 0, 0)');
  expect(none.shadow).toBe('none');
  expect(none.border).toBe('rgba(0, 0, 0, 0)');
  expect((await chrome(selected)).background).not.toBe('rgba(0, 0, 0, 0)');

  // The group-level value does the same for every pressed control.
  await selected.evaluate((button) =>
    button
      .closest('.kui-toolbar-control-group')!
      .setAttribute('data-selected-chrome', 'none'),
  );
  // Poll: the selected fill transitions out.
  await expect
    .poll(async () => (await chrome(selected)).background)
    .toBe('rgba(0, 0, 0, 0)');
});
