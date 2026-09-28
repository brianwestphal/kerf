import { expect, type Locator, type Page, test } from '@playwright/test';

// Icon-only popup triggers — a single or multiple icon-only Select and an
// icon-only PopupMenu — show a Web Awesome help tag naming the control (and a
// Select's current choice) on hover after a delay and on keyboard focus. The
// tag repeats the accessible name, so it is aria-hidden and never renames the
// control; it hides while the popup is open.

const helpTag = (host: Locator) => host.locator('wa-tooltip.kui-help-tag');
const tagBody = (host: Locator) => helpTag(host).locator('[part~="body"]');

async function moveAway(page: Page) {
  await page.mouse.move(2, 2);
}

test('hovering an icon-only filter shows its name and chosen labels after a delay', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="ticket-label-filter"]');
  await select.scrollIntoViewIfNeeded();
  const combobox = select.getByRole('combobox');
  await expect(combobox).toHaveAccessibleName('Filter by label: Bug, Docs');
  const group = select.locator(
    'xpath=ancestor::*[contains(@class,"kui-toolbar-control-group")][1]',
  );
  const before = await group.ariaSnapshot();

  await select.hover();
  // Not at once: a help tag waits for the pointer to rest.
  await page.waitForTimeout(200);
  await expect(tagBody(select)).toBeHidden();
  await expect(tagBody(select)).toBeVisible();
  await expect(helpTag(select)).toHaveText('Filter by label: Bug, Docs');
  await expect(helpTag(select)).toHaveAttribute('aria-hidden', 'true');
  // It sits below the trigger, clear of it.
  const [tagBox, triggerBox] = await Promise.all([
    tagBody(select).boundingBox(),
    combobox.boundingBox(),
  ]);
  expect(tagBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height);

  // The accessible name is unchanged and announced once: the tag is neither
  // part of the name nor exposed in the accessibility tree.
  await expect(combobox).toHaveAccessibleName('Filter by label: Bug, Docs');
  expect(await combobox.getAttribute('aria-labelledby')).not.toContain(
    await helpTag(select).getAttribute('id'),
  );
  expect(await group.ariaSnapshot()).toBe(before);

  await page.screenshot({
    path: 'test-results/select-help-tag-hover-wide.png',
    clip: {
      x: Math.max(0, triggerBox!.x - 160),
      y: triggerBox!.y - 40,
      width: 420,
      height: 140,
    },
  });

  await moveAway(page);
  await expect(tagBody(select)).toBeHidden();
});

test('opening the popup hides the tag, and the tag follows the selection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="ticket-label-filter"]');
  await select.scrollIntoViewIfNeeded();

  await select.hover();
  await expect(tagBody(select)).toBeVisible();
  await select.click();
  await expect(select).toHaveAttribute('open', '');
  await expect(tagBody(select)).toBeHidden();

  // Hovering the open popup's options never brings it back.
  await select.locator('wa-option[value="bug"]').hover();
  await page.waitForTimeout(700);
  await expect(tagBody(select)).toBeHidden();
  await select.locator('wa-option[value="bug"]').click();
  await select.hover();
  await page.waitForTimeout(700);
  await expect(tagBody(select)).toBeHidden();

  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await moveAway(page);
  await select.hover();
  await expect(tagBody(select)).toBeVisible();
  await expect(helpTag(select)).toHaveText('Filter by label: Docs');
});

test('keyboard focus shows the tag at once; a click focus does not', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="toolbar-ticket-label-filter"]');
  await select.scrollIntoViewIfNeeded();
  const pin = page.locator(
    '[data-demo="select"] button[aria-label="Pin view"]',
  );
  await pin.focus();
  await page.keyboard.press('Tab');
  const combobox = select.getByRole('combobox');
  await expect(combobox).toBeFocused();
  await expect(tagBody(select)).toBeVisible({ timeout: 300 });
  await expect(helpTag(select)).toHaveText('Filter by label: Bug, Docs');
  const box = await combobox.boundingBox();
  await page.screenshot({
    path: 'test-results/select-help-tag-focus-narrow.png',
    clip: { x: 0, y: box!.y - 40, width: 390, height: 140 },
  });

  // Opening from the keyboard hides it; closing does not bring it back.
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('open', '');
  await expect(tagBody(select)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(select).not.toHaveAttribute('open', '');
  await page.waitForTimeout(300);
  await expect(tagBody(select)).toBeHidden();

  // Leaving the trigger hides a focus tag; the next control shows its own.
  await page.keyboard.press('Shift+Tab');
  await expect(pin).toBeFocused();
  await expect(tagBody(select)).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(tagBody(select)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tagBody(select)).toBeHidden();

  // A pointer press focuses without a tag.
  await pin.focus();
  await select.click();
  await expect(select).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(combobox).toBeFocused();
  await expect(tagBody(select)).toBeHidden();
});

test('a single icon-only Select names its control and current choice', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=select');
  const select = page.locator(
    'wa-select[name="toolbar-default-rendering-balance"]',
  );
  await select.scrollIntoViewIfNeeded();
  const combobox = select.getByRole('combobox');
  const name = await combobox.evaluate(
    (element) => element.getAttribute('aria-label') ?? '',
  );
  await select.hover();
  await expect(tagBody(select)).toBeVisible();
  await expect(helpTag(select)).toHaveText(
    'Default toolbar rendering balance: Balanced',
  );
  await select.click();
  await expect(tagBody(select)).toBeHidden();
  await select.locator('wa-option[value="quiet"]').click();
  await expect(select).not.toHaveAttribute('open', '');
  await moveAway(page);
  await select.hover();
  await expect(helpTag(select)).toHaveText(
    'Default toolbar rendering balance: Quiet',
  );
  await expect(tagBody(select)).toBeVisible();
  expect(
    await combobox.evaluate(
      (element) => element.getAttribute('aria-label') ?? '',
    ),
  ).toBe(name);
  await expect(combobox).toHaveAccessibleName(
    'Default toolbar rendering balance',
  );
  // A labeled (not icon-only) Select has no tag.
  const labeled = page.locator('wa-select[name="labeled-rendering-balance"]');
  await labeled.hover();
  await page.waitForTimeout(700);
  await expect(helpTag(labeled)).toHaveCount(0);
});

test('an icon-only PopupMenu names its trigger; a text trigger has no tag', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/?component=popup-menu');
  const menu = page
    .locator('[data-demo="popup-menu"] wa-dropdown.kui-popup-menu')
    .first();
  const trigger = menu.getByRole('button', { name: 'Sort tickets' });
  await trigger.hover();
  await expect(tagBody(menu)).toBeVisible();
  await expect(helpTag(menu)).toHaveText('Sort tickets');
  await expect(trigger).toHaveAccessibleName('Sort tickets');
  const box = await trigger.boundingBox();
  await page.screenshot({
    path: 'test-results/popup-menu-help-tag-hover-wide.png',
    clip: {
      x: Math.max(0, box!.x - 120),
      y: box!.y - 40,
      width: 360,
      height: 130,
    },
  });
  await trigger.click();
  await expect(menu).toHaveAttribute('open', '');
  await expect(tagBody(menu)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');
  // Focus returns to the trigger without reopening the tag.
  await moveAway(page);
  await expect(tagBody(menu)).toBeHidden();

  // Keyboard focus shows it at once.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(trigger).toBeFocused();
  await expect(tagBody(menu)).toBeVisible({ timeout: 300 });
  await page.screenshot({
    path: 'test-results/popup-menu-help-tag-focus-wide.png',
    clip: {
      x: Math.max(0, box!.x - 120),
      y: box!.y - 40,
      width: 360,
      height: 130,
    },
  });
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('open', '');
  await expect(tagBody(menu)).toBeHidden();
  await expect(menu.locator('wa-dropdown-item').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');

  const textMenu = page
    .locator('[data-demo="popup-menu"] wa-dropdown.kui-popup-menu')
    .nth(1);
  await textMenu.getByRole('button', { name: 'Actions', exact: true }).hover();
  await page.waitForTimeout(700);
  await expect(helpTag(textMenu)).toHaveCount(0);
});

test('a long tag near the viewport edge keeps 8px clear of it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=select');
  const select = page.locator(
    'wa-select[name="toolbar-default-rendering-balance"]',
  );
  await select.scrollIntoViewIfNeeded();
  await select.hover();
  await expect(tagBody(select)).toBeVisible();
  await expect
    .poll(async () => (await tagBody(select).boundingBox())!.x)
    .toBeGreaterThanOrEqual(8);
});
