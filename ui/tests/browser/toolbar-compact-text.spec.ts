import { expect, test } from '@playwright/test';

// KF-Z8EYHT: a compact ToolbarControlGroup's text controls use the compact
// Button's text size, so a compact group's menu matches a compact Button.
test('compact toolbar groups use the compact Button text size', async ({
  page,
}) => {
  await page.goto('/?component=file-picker');
  const fontSize = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((node) => window.getComputedStyle(node).fontSize);
  const compactButton = await fontSize(
    '[data-demo="file-picker"] .kui-button[data-size="compact"]',
  );
  expect(compactButton).toBe('14px');
  expect(
    await fontSize('.kui-toolbar-control-group[data-size="compact"] > button'),
  ).toBe(compactButton);
  expect(
    await fontSize(
      '.kui-toolbar-control-group[data-size="compact"] > .kui-popup-menu .kui-popup-menu__trigger',
    ),
  ).toBe(compactButton);
  expect(
    await fontSize(
      '.kui-toolbar-control-group:not([data-size="compact"]) > button',
    ),
  ).toBe('16px');
});
