import { expect, type Locator, test } from '@playwright/test';

// Default-size single-line controls share Kerf's 44px control height, so a
// kerf Select, a TextField, and a Kerf Button line up.

const visualHeight = (host: Locator) =>
  host.evaluate((element) => {
    // A Web Awesome host draws its box on a shadow part, a Select on its
    // trigger, a TextField on its box; a native control (a Button, a PopupMenu trigger) is its own
    // box.
    const part =
      element.shadowRoot?.querySelector('[part~="combobox"], [part~="base"]') ??
      element.querySelector(':scope > .kui-select__trigger') ??
      element.querySelector(':scope > .kui-text-field__box') ??
      element;
    return part.getBoundingClientRect().height;
  });

test('a kerf Select, a TextField, and a Button share the 44px control height', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=list-inset-control');
  const example = page.locator('[data-catalog-example]', {
    has: page.locator('.kui-text-field', { hasText: 'Assignee' }),
  });
  const select = example.locator('kui-select[name="demo-inset-status"]');
  const input = example.locator('.kui-text-field', { hasText: 'Assignee' });
  const button = example.locator('.kui-button');
  await expect(select).toBeVisible();
  await expect
    .poll(() => visualHeight(input))
    .toBeCloseTo(await visualHeight(select), 0);
  expect(await visualHeight(select)).toBeCloseTo(44, 0);
  expect(await visualHeight(button)).toBeCloseTo(44, 0);
  if (browserName === 'chromium')
    await example.screenshot({ path: 'test-results/control-height.png' });
});

test('small buttons and toolbar-group buttons keep their own control heights', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=state-banner');
  const small = page.locator('.kui-button[data-size="compact"]').first();
  await expect(small).toBeVisible();
  expect(await visualHeight(small)).toBeLessThan(40);

  await page.goto('/?component=toolbar-control-group');
  const trigger = page
    .locator('.kui-popup-menu__trigger')
    .filter({ hasText: 'Sort Tickets' });
  await expect(trigger).toBeVisible();
  expect(await visualHeight(trigger)).toBeCloseTo(40, 0);
  const compact = page
    .getByRole('group', { name: 'Compact Formatting' })
    .locator('.kui-popup-menu__trigger');
  expect(await visualHeight(compact)).toBeCloseTo(32, 0);
});
