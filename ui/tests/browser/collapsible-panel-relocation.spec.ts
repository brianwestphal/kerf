import { expect, test } from '@playwright/test';

/**
 * A CollapsiblePanel's composed toolbar keeps its constant groups and standard
 * toggle reachable while it is collapsed: CollapsiblePanelRelocated puts them
 * at the start of the app's editor toolbar, and wireSidebar hands focus
 * between the two toggle positions.
 */
test('relocates a collapsed rail’s constant groups and toggle into the editor toolbar and keeps focus with the toggle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=collapsible-panel');
  const example = page.locator('[data-catalog-panel-relocation-example]');
  const rail = example.locator(
    '[data-collapsible-panel="catalog-panel-relocation"]',
  );
  const editor = example.locator('[data-component="pane"]').last();
  await example.scrollIntoViewIfNeeded();

  // Collapsed on arrival: search then the toggle lead the editor toolbar,
  // before its title; the panel-only New file group is not relocated.
  await expect(rail).toHaveAttribute('data-collapsed', 'true');
  const leading = editor.locator('.kui-toolbar__leading');
  const labels = await leading
    .locator('button, [data-component="toolbar-text"]')
    .evaluateAll((nodes) =>
      nodes.map(
        (node) => node.getAttribute('aria-label') ?? node.textContent?.trim(),
      ),
    );
  expect(labels).toEqual(['Search files', 'Show navigator', 'Editor']);
  await expect(editor.getByRole('button', { name: 'New file' })).toHaveCount(0);

  // Open: the toggle moves into the rail's toolbar, last; focus enters the rail.
  await leading.getByRole('button', { name: 'Show navigator' }).focus();
  await page.keyboard.press('Enter');
  await expect(rail).toHaveAttribute('data-collapsed', 'false');
  await expect(
    leading.getByRole('button', { name: 'Show navigator' }),
  ).toHaveCount(0);
  const railTrailing = rail.locator('.kui-toolbar__trailing button');
  await expect(railTrailing.last()).toHaveAttribute(
    'aria-label',
    'Hide navigator',
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          document.activeElement?.closest(
            '[data-collapsible-panel="catalog-panel-relocation"]',
          ),
        ),
      ),
    )
    .toBe(true);

  // Close from the rail's own toggle: focus follows it back to the editor.
  await rail.getByRole('button', { name: 'Hide navigator' }).focus();
  await page.keyboard.press('Enter');
  await expect(rail).toHaveAttribute('data-collapsed', 'true');
  await expect(
    leading.getByRole('button', { name: 'Show navigator' }),
  ).toBeFocused();
});
