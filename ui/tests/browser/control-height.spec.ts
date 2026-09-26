import { expect, type Locator, test } from '@playwright/test';

// The Web Awesome theme gives default-size single-line controls Kerf's 44px
// control height, so a kerf Select and a plain wa-input / wa-button line up.

const visualHeight = (host: Locator) =>
  host.evaluate((element) => {
    const part = element.shadowRoot!.querySelector(
      '[part~="combobox"], [part~="base"]',
    )!;
    return part.getBoundingClientRect().height;
  });

test('a kerf Select, a wa-input, and a wa-button share the 44px control height', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=list-inset-control');
  const example = page.locator('[data-catalog-example]', {
    has: page.locator('wa-input[label="Assignee"]'),
  });
  const select = example.locator('wa-select[name="demo-inset-status"]');
  const input = example.locator('wa-input[label="Assignee"]');
  const button = example.locator('wa-button');
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
  const small = page.locator('wa-button[size="small"]').first();
  await expect(small).toBeVisible();
  expect(await visualHeight(small)).toBeLessThan(40);

  await page.goto('/?component=toolbar-control-group');
  const trigger = page.locator('wa-button[aria-label="Sort tickets"]');
  await expect(trigger).toBeVisible();
  expect(await visualHeight(trigger)).toBeCloseTo(40, 0);
  const compact = page
    .getByRole('group', { name: 'Compact formatting' })
    .locator('wa-dropdown wa-button');
  expect(await visualHeight(compact)).toBeCloseTo(32, 0);
});
